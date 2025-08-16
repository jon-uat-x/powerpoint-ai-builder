#!/usr/bin/env node

/**
 * Migration script to move existing JSON data to Supabase
 * 
 * Usage:
 *   node scripts/migrate-to-supabase.js [--dry-run] [--verbose]
 * 
 * Options:
 *   --dry-run   Preview migration without making changes
 *   --verbose   Show detailed progress
 */

const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const DATA_PATH = path.join(__dirname, '../server/src/data');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pjsjsynibeltjpusfald.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');

// Initialize Supabase client with service key
if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable is required');
  console.error('Please set it in your .env file or environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration statistics
const stats = {
  pitchbooks: { total: 0, migrated: 0, failed: 0 },
  sections: { total: 0, migrated: 0, failed: 0 },
  slides: { total: 0, migrated: 0, failed: 0 },
  templates: { total: 0, migrated: 0, failed: 0 },
  errors: []
};

// Helper functions
function log(message, level = 'info') {
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    verbose: '🔍'
  };
  
  if (level === 'verbose' && !verbose) return;
  
  console.log(`${prefix[level] || ''} ${message}`);
}

async function ensureDefaultOrganization() {
  log('Checking for default organization...', 'verbose');
  
  // Check if default organization exists
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'default')
    .single();

  if (existingOrg) {
    log('Default organization found', 'verbose');
    return existingOrg.id;
  }

  if (dryRun) {
    log('Would create default organization', 'verbose');
    return 'dry-run-org-id';
  }

  // Create default organization
  const { data: newOrg, error } = await supabase
    .from('organizations')
    .insert({
      name: 'Default Organization',
      slug: 'default'
    })
    .select()
    .single();

  if (error) {
    log(`Failed to create default organization: ${error.message}`, 'error');
    throw error;
  }

  log('Created default organization', 'success');
  return newOrg.id;
}

async function migratePitchbook(pitchbookData, organizationId) {
  try {
    stats.pitchbooks.total++;
    
    log(`Migrating pitchbook: ${pitchbookData.title}`, 'verbose');
    
    if (dryRun) {
      log(`  Would migrate pitchbook with ${pitchbookData.slides?.length || 0} slides`, 'verbose');
      stats.pitchbooks.migrated++;
      return;
    }

    // Insert pitchbook
    const { data: pitchbook, error: pitchbookError } = await supabase
      .from('pitchbooks')
      .insert({
        id: pitchbookData.id,
        title: pitchbookData.title,
        type: pitchbookData.type || 'standard',
        organization_id: organizationId,
        status: 'ready',
        pitchbook_prompt: pitchbookData.pitchbookPrompt,
        scoped_prompts: pitchbookData.scopedPrompts || {},
        created_at: pitchbookData.created,
        updated_at: pitchbookData.updated
      })
      .select()
      .single();

    if (pitchbookError) throw pitchbookError;

    // Migrate sections
    if (pitchbookData.sections && pitchbookData.sections.length > 0) {
      for (let i = 0; i < pitchbookData.sections.length; i++) {
        const section = pitchbookData.sections[i];
        stats.sections.total++;
        
        const { data: sectionData, error: sectionError } = await supabase
          .from('pitchbook_sections')
          .insert({
            pitchbook_id: pitchbook.id,
            title: section.title,
            order_index: i,
            number_of_slides: section.numberOfSlides || 1,
            section_prompt: section.prompt
          })
          .select()
          .single();

        if (sectionError) {
          log(`  Failed to migrate section: ${section.title} - ${sectionError.message}`, 'error');
          stats.sections.failed++;
        } else {
          stats.sections.migrated++;
          
          // Update section reference for slides
          if (pitchbookData.slides) {
            pitchbookData.slides.forEach(slide => {
              if (slide.sectionTitle === section.title) {
                slide._sectionId = sectionData.id;
              }
            });
          }
        }
      }
    }

    // Migrate slides
    if (pitchbookData.slides && pitchbookData.slides.length > 0) {
      for (const slide of pitchbookData.slides) {
        stats.slides.total++;
        
        const { data: slideData, error: slideError } = await supabase
          .from('slides')
          .insert({
            pitchbook_id: pitchbook.id,
            section_id: slide._sectionId || null,
            slide_number: slide.slideNumber,
            layout_name: slide.layoutName,
            slide_type: slide.type || slide.slide_type,
            slide_prompt: slide.slidePrompt,
            slide_prompt_scoped: slide.slidePromptScoped,
            generated_content: slide.generatedContent || slide.placeholders || {}
          })
          .select()
          .single();

        if (slideError) {
          log(`  Failed to migrate slide #${slide.slideNumber}: ${slideError.message}`, 'error');
          stats.slides.failed++;
        } else {
          stats.slides.migrated++;
          
          // Migrate placeholder prompts
          const slideKey = `slide_${slide.slideNumber}`;
          const placeholderPrompts = pitchbookData.prompts?.[slideKey];
          
          if (placeholderPrompts) {
            for (const [placeholderId, promptText] of Object.entries(placeholderPrompts)) {
              await supabase
                .from('placeholder_prompts')
                .insert({
                  slide_id: slideData.id,
                  placeholder_id: placeholderId,
                  prompt_text: promptText,
                  scope: 'placeholder',
                  applies_to: `${slideKey}_placeholder_${placeholderId}`
                });
            }
          }
        }
      }
    }

    stats.pitchbooks.migrated++;
    log(`  ✓ Migrated pitchbook: ${pitchbookData.title}`, 'success');
    
  } catch (error) {
    stats.pitchbooks.failed++;
    stats.errors.push({
      type: 'pitchbook',
      title: pitchbookData.title,
      error: error.message
    });
    log(`  Failed to migrate pitchbook: ${pitchbookData.title} - ${error.message}`, 'error');
  }
}

async function migrateTemplates() {
  log('Migrating layout templates...', 'info');
  
  const templatesPath = path.join(DATA_PATH, 'template_prompts.json');
  
  if (!await fs.exists(templatesPath)) {
    log('No template prompts file found', 'warning');
    return;
  }

  try {
    const templates = await fs.readJson(templatesPath);
    
    for (const [layoutName, prompts] of Object.entries(templates)) {
      stats.templates.total++;
      
      if (dryRun) {
        log(`  Would migrate template: ${layoutName}`, 'verbose');
        stats.templates.migrated++;
        continue;
      }

      const { error } = await supabase
        .from('layout_templates')
        .upsert({
          name: layoutName,
          file_name: `slideLayout${layoutName.replace(/\s+/g, '')}.xml`,
          default_prompts: prompts
        }, {
          onConflict: 'name'
        });

      if (error) {
        log(`  Failed to migrate template: ${layoutName} - ${error.message}`, 'error');
        stats.templates.failed++;
      } else {
        stats.templates.migrated++;
        log(`  ✓ Migrated template: ${layoutName}`, 'verbose');
      }
    }
    
    log('Template migration complete', 'success');
  } catch (error) {
    log(`Failed to migrate templates: ${error.message}`, 'error');
    stats.errors.push({
      type: 'templates',
      error: error.message
    });
  }
}

async function migrate() {
  console.log('\n🚀 Starting Supabase Migration');
  console.log('================================');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Step 1: Ensure default organization exists
    log('Step 1: Setting up organization...', 'info');
    const organizationId = await ensureDefaultOrganization();
    
    // Step 2: Load pitchbooks
    log('\nStep 2: Loading pitchbooks...', 'info');
    const pitchbooksFile = path.join(DATA_PATH, 'pitchbooks.json');
    
    if (!await fs.exists(pitchbooksFile)) {
      log('No pitchbooks.json file found', 'warning');
    } else {
      const pitchbooks = await fs.readJson(pitchbooksFile);
      log(`Found ${pitchbooks.length} pitchbooks to migrate`, 'info');
      
      // Step 3: Migrate each pitchbook
      log('\nStep 3: Migrating pitchbooks...', 'info');
      for (const pitchbookSummary of pitchbooks) {
        // Load full pitchbook data
        const pitchbookFile = path.join(DATA_PATH, `pitchbook_${pitchbookSummary.id}.json`);
        if (await fs.exists(pitchbookFile)) {
          const fullPitchbook = await fs.readJson(pitchbookFile);
          await migratePitchbook(fullPitchbook, organizationId);
        } else {
          log(`  Pitchbook file not found: ${pitchbookFile}`, 'warning');
        }
      }
    }
    
    // Step 4: Migrate templates
    log('\nStep 4: Migrating templates...', 'info');
    await migrateTemplates();
    
    // Step 5: Print summary
    console.log('\n================================');
    console.log('📊 Migration Summary');
    console.log('================================');
    console.log(`Pitchbooks: ${stats.pitchbooks.migrated}/${stats.pitchbooks.total} migrated, ${stats.pitchbooks.failed} failed`);
    console.log(`Sections:   ${stats.sections.migrated}/${stats.sections.total} migrated, ${stats.sections.failed} failed`);
    console.log(`Slides:     ${stats.slides.migrated}/${stats.slides.total} migrated, ${stats.slides.failed} failed`);
    console.log(`Templates:  ${stats.templates.migrated}/${stats.templates.total} migrated, ${stats.templates.failed} failed`);
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.type}: ${err.title || ''} - ${err.error}`);
      });
    }
    
    if (dryRun) {
      console.log('\n🔍 DRY RUN COMPLETE - No changes were made');
      console.log('Run without --dry-run flag to perform actual migration');
    } else {
      console.log('\n✅ Migration complete!');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate().catch(console.error);