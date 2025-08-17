require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

class SafeMigration {
  constructor() {
    // Initialize Supabase client with service key for admin operations
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    this.checkpoint = null;
    this.rollbackLog = [];
    this.stats = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0
    };
  }

  async execute() {
    try {
      console.log('🚀 Starting Safe Migration Process\n');

      // Step 1: Pre-migration validation
      await this.preValidation();

      // Step 2: Create backup
      await this.createBackup();

      // Step 3: Create checkpoint
      await this.createCheckpoint();

      // Step 4: Ensure default organization
      const orgId = await this.ensureOrganization();

      // Step 5: Migrate data
      await this.migrateData(orgId);

      // Step 6: Post-migration validation
      await this.postValidation();

      // Step 7: Generate report
      await this.generateReport();

      console.log('\n✅ Migration completed successfully!');
      return true;

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      await this.rollback();
      throw error;
    }
  }

  async preValidation() {
    console.log('📋 Running pre-migration validation...');
    
    // Check if tables exist
    const tables = ['profiles', 'organizations', 'pitchbooks', 'slides', 'pitchbook_sections'];
    
    for (const table of tables) {
      const { error } = await this.supabase.from(table).select('id').limit(1);
      
      if (error && error.code === '42P01') {
        throw new Error(`Missing table: ${table}. Please run database migrations first.`);
      }
    }
    
    console.log('✅ Pre-validation passed\n');
  }

  async createBackup() {
    console.log('💾 Creating backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, `../../backups/${timestamp}`);
    
    await fs.ensureDir(backupDir);
    
    // Backup local data
    const dataDir = path.join(__dirname, '../../server/src/data');
    if (await fs.exists(dataDir)) {
      await fs.copy(dataDir, path.join(backupDir, 'data'));
    }
    
    // Export current Supabase data (if any exists)
    const tables = ['pitchbooks', 'slides', 'pitchbook_sections'];
    for (const table of tables) {
      const { data } = await this.supabase.from(table).select('*');
      await fs.writeJson(
        path.join(backupDir, `${table}.json`),
        data || [],
        { spaces: 2 }
      );
    }
    
    console.log(`✅ Backup created: ${backupDir}\n`);
    this.backupPath = backupDir;
  }

  async createCheckpoint() {
    console.log('🔖 Creating migration checkpoint...');
    
    this.checkpoint = {
      startTime: new Date().toISOString(),
      lastProcessedId: null,
      migratedItems: [],
      failedItems: []
    };
    
    await this.saveCheckpoint();
    console.log('✅ Checkpoint created\n');
  }

  async saveCheckpoint() {
    await fs.writeJson(
      path.join(__dirname, '../../migration-checkpoint.json'),
      this.checkpoint,
      { spaces: 2 }
    );
  }

  async ensureOrganization() {
    console.log('🏢 Ensuring default organization...');
    
    // Check if default organization exists
    const { data: existingOrg } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'default')
      .single();
    
    if (existingOrg) {
      console.log('✅ Using existing default organization\n');
      return existingOrg.id;
    }
    
    // Create default organization
    const { data: newOrg, error } = await this.supabase
      .from('organizations')
      .insert({
        name: 'Default Organization',
        slug: 'default',
        settings: {},
        subscription_tier: 'free'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    this.rollbackLog.push({
      type: 'INSERT',
      table: 'organizations',
      id: newOrg.id
    });
    
    console.log('✅ Created default organization\n');
    return newOrg.id;
  }

  async migrateData(organizationId) {
    console.log('📦 Starting data migration...\n');
    
    // Load existing data
    const pitchbooksFile = path.join(__dirname, '../../server/src/data/pitchbooks.json');
    if (!await fs.exists(pitchbooksFile)) {
      console.log('No pitchbooks.json file found');
      
      // Check for individual pitchbook files
      const dataDir = path.join(__dirname, '../../server/src/data');
      const files = await fs.readdir(dataDir);
      const pitchbookFiles = files.filter(f => f.startsWith('pitchbook_') && f.endsWith('.json'));
      
      if (pitchbookFiles.length === 0) {
        console.log('No data to migrate');
        return;
      }
      
      // Load individual pitchbook files
      const pitchbooks = [];
      for (const file of pitchbookFiles) {
        const data = await fs.readJson(path.join(dataDir, file));
        pitchbooks.push(data);
      }
      
      this.stats.total = pitchbooks.length;
      
      // Migrate each pitchbook
      for (const pitchbook of pitchbooks) {
        await this.migratePitchbook(pitchbook, organizationId);
      }
    } else {
      // Load pitchbooks from single file
      const pitchbooks = await fs.readJson(pitchbooksFile);
      this.stats.total = pitchbooks.length;
      
      // Migrate each pitchbook
      for (const pitchbook of pitchbooks) {
        await this.migratePitchbook(pitchbook, organizationId);
      }
    }
    
    console.log('\n📊 Migration Statistics:');
    console.log(`  Total: ${this.stats.total}`);
    console.log(`  Migrated: ${this.stats.migrated}`);
    console.log(`  Failed: ${this.stats.failed}`);
    console.log(`  Skipped: ${this.stats.skipped}`);
  }

  async migratePitchbook(pitchbookData, organizationId) {
    const startIndex = this.rollbackLog.length;
    
    try {
      // Check if already migrated (by title and organization)
      const { data: existing } = await this.supabase
        .from('pitchbooks')
        .select('id')
        .eq('title', pitchbookData.title)
        .eq('organization_id', organizationId)
        .single();
      
      if (existing) {
        console.log(`⏭️  Skipping "${pitchbookData.title}" (already exists)`);
        this.stats.skipped++;
        return;
      }
      
      console.log(`📝 Migrating: ${pitchbookData.title}`);
      
      // Prepare sections data
      const sections = pitchbookData.sections || [];
      const formattedSections = sections.map((section, index) => ({
        title: section.title || `Section ${index + 1}`,
        numberOfSlides: section.numberOfSlides || 1,
        prompt: section.prompt || '',
        order_index: index
      }));
      
      // Use transaction function for atomic creation
      const { data, error } = await this.supabase.rpc('create_pitchbook_atomic', {
        p_title: pitchbookData.title,
        p_type: pitchbookData.type || 'standard',
        p_organization_id: organizationId,
        p_user_id: null, // System migration, no user
        p_sections: formattedSections,
        p_prompts: {
          pitchbook_prompt: pitchbookData.pitchbookPrompt || '',
          scoped_prompts: pitchbookData.scopedPrompts || {}
        }
      });
      
      if (error) throw error;
      
      const result = data[0];
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Record success
      this.checkpoint.migratedItems.push({
        id: pitchbookData.id,
        new_id: result.pitchbook_id,
        title: pitchbookData.title
      });
      
      this.rollbackLog.push({
        type: 'INSERT',
        table: 'pitchbooks',
        id: result.pitchbook_id
      });
      
      // Migrate slides content if available
      if (pitchbookData.slides && pitchbookData.slides.length > 0) {
        await this.migrateSlideContent(result.pitchbook_id, pitchbookData.slides);
      }
      
      this.stats.migrated++;
      await this.saveCheckpoint();
      
      console.log(`  ✅ Successfully migrated with ID: ${result.pitchbook_id}`);
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      this.checkpoint.failedItems.push({
        id: pitchbookData.id,
        title: pitchbookData.title,
        error: error.message
      });
      this.stats.failed++;
      
      // Partial rollback
      await this.partialRollback(startIndex);
    }
  }

  async migrateSlideContent(pitchbookId, slidesData) {
    // Get slides from database
    const { data: slides, error } = await this.supabase
      .from('slides')
      .select('id, slide_number')
      .eq('pitchbook_id', pitchbookId)
      .order('slide_number');
    
    if (error || !slides) return;
    
    // Update slides with content from old data
    for (const slideData of slidesData) {
      const dbSlide = slides.find(s => s.slide_number === slideData.slideNumber);
      if (!dbSlide) continue;
      
      const updateData = {
        content: slideData.content || {},
        slide_prompt: slideData.prompt || '',
        notes: slideData.notes || '',
        is_generated: slideData.isGenerated || false,
        generation_status: slideData.isGenerated ? 'completed' : 'pending'
      };
      
      await this.supabase
        .from('slides')
        .update(updateData)
        .eq('id', dbSlide.id);
    }
  }

  async partialRollback(fromIndex) {
    const operations = this.rollbackLog.slice(fromIndex);
    
    for (const op of operations.reverse()) {
      try {
        await this.supabase
          .from(op.table)
          .delete()
          .eq('id', op.id);
      } catch (error) {
        console.error(`Rollback failed for ${op.table}:${op.id}`);
      }
    }
    
    this.rollbackLog = this.rollbackLog.slice(0, fromIndex);
  }

  async rollback() {
    console.log('\n🔄 Starting rollback...');
    
    for (const op of this.rollbackLog.reverse()) {
      try {
        await this.supabase
          .from(op.table)
          .delete()
          .eq('id', op.id);
        console.log(`  Rolled back: ${op.table}:${op.id}`);
      } catch (error) {
        console.error(`  Rollback failed: ${op.table}:${op.id}`);
      }
    }
    
    console.log('✅ Rollback completed');
  }

  async postValidation() {
    console.log('\n📋 Running post-migration validation...');
    
    // Check migrated data
    const { count: pitchbookCount } = await this.supabase
      .from('pitchbooks')
      .select('*', { count: 'exact', head: true });
    
    const { count: slideCount } = await this.supabase
      .from('slides')
      .select('*', { count: 'exact', head: true });
    
    console.log(`  Pitchbooks in database: ${pitchbookCount}`);
    console.log(`  Slides in database: ${slideCount}`);
    
    if (this.stats.migrated > 0 && pitchbookCount === 0) {
      console.warn('⚠️  Warning: Migration reported success but no data found in database');
    } else {
      console.log('✅ Post-validation passed');
    }
    
    this.validationReport = {
      pitchbookCount,
      slideCount
    };
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - new Date(this.checkpoint.startTime).getTime(),
      stats: this.stats,
      validation: this.validationReport,
      backup: this.backupPath,
      checkpoint: this.checkpoint
    };
    
    await fs.writeJson(
      path.join(__dirname, `../../migration-report-${Date.now()}.json`),
      report,
      { spaces: 2 }
    );
    
    console.log('\n📄 Migration report generated');
  }
}

// Execute migration if run directly
if (require.main === module) {
  const migration = new SafeMigration();
  migration.execute()
    .then(() => {
      console.log('\n🎉 Migration process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = SafeMigration;