require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');

class MigrationValidator {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  async validate() {
    console.log('Starting migration validation...\n');

    await this.checkDatabaseSchema();
    await this.checkReferentialIntegrity();
    await this.checkDataConsistency();
    await this.checkIndexes();
    await this.checkRLSPolicies();
    await this.checkPerformance();
    await this.checkEdgeFunctions();

    return this.generateReport();
  }

  async checkDatabaseSchema() {
    console.log('Checking database schema...');
    
    const requiredTables = [
      'profiles', 'organizations', 'organization_members',
      'pitchbooks', 'pitchbook_sections', 'slides',
      'placeholder_prompts', 'layout_templates',
      'pitchbook_versions', 'activity_logs', 'collaboration_presence'
    ];

    for (const table of requiredTables) {
      const { error } = await this.supabase.from(table).select('id').limit(1);
      
      if (error && error.code === '42P01') {
        this.results.failed.push({
          check: 'Database Schema',
          issue: `Missing table: ${table}`,
          severity: 'critical'
        });
      } else {
        this.results.passed.push({
          check: 'Database Schema',
          detail: `Table ${table} exists`
        });
      }
    }
  }

  async checkReferentialIntegrity() {
    console.log('Checking referential integrity...');

    // Check for orphaned slides
    const { data: orphanedSlides } = await this.supabase
      .from('slides')
      .select('id, pitchbook_id')
      .not('pitchbook_id', 'is', null)
      .limit(1000);

    let orphanCount = 0;
    for (const slide of orphanedSlides || []) {
      const { data: pitchbook } = await this.supabase
        .from('pitchbooks')
        .select('id')
        .eq('id', slide.pitchbook_id)
        .single();

      if (!pitchbook) {
        orphanCount++;
        this.results.failed.push({
          check: 'Referential Integrity',
          issue: `Orphaned slide: ${slide.id}`,
          severity: 'high'
        });
      }
    }

    if (orphanCount === 0) {
      this.results.passed.push({
        check: 'Referential Integrity',
        detail: 'No orphaned records found'
      });
    }

    // Check for orphaned sections
    const { data: orphanedSections } = await this.supabase
      .from('pitchbook_sections')
      .select('id, pitchbook_id')
      .limit(1000);

    for (const section of orphanedSections || []) {
      const { data: pitchbook } = await this.supabase
        .from('pitchbooks')
        .select('id')
        .eq('id', section.pitchbook_id)
        .single();

      if (!pitchbook) {
        this.results.failed.push({
          check: 'Referential Integrity',
          issue: `Orphaned section: ${section.id}`,
          severity: 'high'
        });
      }
    }
  }

  async checkDataConsistency() {
    console.log('Checking data consistency...');

    // Check slide numbering consistency
    const { data: pitchbooks } = await this.supabase
      .from('pitchbooks')
      .select('id, title')
      .limit(100);

    for (const pitchbook of pitchbooks || []) {
      const { data: slides } = await this.supabase
        .from('slides')
        .select('slide_number')
        .eq('pitchbook_id', pitchbook.id)
        .order('slide_number');

      if (!slides || slides.length === 0) {
        this.results.warnings.push({
          check: 'Data Consistency',
          issue: `Pitchbook "${pitchbook.title}" has no slides`,
          severity: 'medium'
        });
        continue;
      }

      // Check for gaps in numbering
      for (let i = 0; i < slides.length - 1; i++) {
        if (slides[i + 1].slide_number !== slides[i].slide_number + 1) {
          this.results.warnings.push({
            check: 'Data Consistency',
            issue: `Gap in slide numbering for pitchbook: ${pitchbook.title}`,
            severity: 'low'
          });
          break;
        }
      }

      // Check for duplicate slide numbers
      const slideNumbers = slides.map(s => s.slide_number);
      const uniqueNumbers = [...new Set(slideNumbers)];
      if (slideNumbers.length !== uniqueNumbers.length) {
        this.results.failed.push({
          check: 'Data Consistency',
          issue: `Duplicate slide numbers in pitchbook: ${pitchbook.title}`,
          severity: 'high'
        });
      }
    }

    // Check section ordering
    for (const pitchbook of pitchbooks || []) {
      const { data: sections } = await this.supabase
        .from('pitchbook_sections')
        .select('order_index, title')
        .eq('pitchbook_id', pitchbook.id)
        .order('order_index');

      if (sections && sections.length > 0) {
        // Check for duplicate order indexes
        const orderIndexes = sections.map(s => s.order_index);
        const uniqueIndexes = [...new Set(orderIndexes)];
        if (orderIndexes.length !== uniqueIndexes.length) {
          this.results.failed.push({
            check: 'Data Consistency',
            issue: `Duplicate section order indexes in pitchbook: ${pitchbook.title}`,
            severity: 'high'
          });
        }
      }
    }
  }

  async checkIndexes() {
    console.log('Checking database indexes...');

    // Get list of indexes (this requires a custom RPC function or direct database access)
    // For now, we'll check if queries are performant which indicates indexes are present
    
    const startTime = Date.now();
    const { data, error } = await this.supabase
      .from('pitchbooks')
      .select('id')
      .eq('status', 'draft')
      .limit(10);
    
    const queryTime = Date.now() - startTime;
    
    if (queryTime > 100) {
      this.results.warnings.push({
        check: 'Performance Indexes',
        issue: `Slow query performance (${queryTime}ms) - indexes may be missing`,
        severity: 'medium'
      });
    } else {
      this.results.passed.push({
        check: 'Performance Indexes',
        detail: `Query performance acceptable (${queryTime}ms)`
      });
    }
  }

  async checkRLSPolicies() {
    console.log('Checking RLS policies...');

    // Check if RLS is enabled on critical tables
    const criticalTables = ['pitchbooks', 'organizations', 'profiles'];
    
    // We can't directly check RLS status via Supabase client,
    // but we can test if unauthorized access is blocked
    
    // Create a client with anon key (no auth)
    const anonClient = createClient(
      process.env.SUPABASE_URL || 'https://pjsjsynibeltjpusfald.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqc2pzeW5pYmVsdGpwdXNmYWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2Nzk5NjgsImV4cCI6MjA0NzI1NTk2OH0.uoQ_FRF6cpWH2vxnEYE7pBmJFk0lNGJLKPqDzAHFaJo'
    );

    for (const table of criticalTables) {
      const { data, error } = await anonClient.from(table).select('id').limit(1);
      
      // If we can read data without auth, RLS might not be properly configured
      if (data && data.length > 0) {
        this.results.warnings.push({
          check: 'Security',
          issue: `Table ${table} may be accessible without authentication`,
          severity: 'high'
        });
      } else {
        this.results.passed.push({
          check: 'Security',
          detail: `RLS appears active on ${table}`
        });
      }
    }
  }

  async checkPerformance() {
    console.log('Running performance checks...');

    // Test complex query performance
    const start = Date.now();
    const { data, error } = await this.supabase
      .from('pitchbooks')
      .select(`
        id,
        title,
        sections:pitchbook_sections(count),
        slides(count)
      `)
      .limit(10);
    
    const duration = Date.now() - start;

    if (duration > 1000) {
      this.results.warnings.push({
        check: 'Performance',
        issue: `Slow query detected: ${duration}ms for pitchbook fetch`,
        severity: 'medium'
      });
    } else {
      this.results.passed.push({
        check: 'Performance',
        detail: `Query performance acceptable: ${duration}ms`
      });
    }

    // Check database statistics
    const { count: totalPitchbooks } = await this.supabase
      .from('pitchbooks')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalSlides } = await this.supabase
      .from('slides')
      .select('*', { count: 'exact', head: true });

    this.results.passed.push({
      check: 'Database Statistics',
      detail: `Total pitchbooks: ${totalPitchbooks || 0}, Total slides: ${totalSlides || 0}`
    });
  }

  async checkEdgeFunctions() {
    console.log('Checking Edge Functions...');

    // Check if Edge Functions are deployed and accessible
    const edgeFunctionUrl = `${process.env.SUPABASE_URL || 'https://pjsjsynibeltjpusfald.supabase.co'}/functions/v1/pitchbook-api`;
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.results.passed.push({
          check: 'Edge Functions',
          detail: 'pitchbook-api Edge Function is deployed and responding'
        });
      } else {
        this.results.warnings.push({
          check: 'Edge Functions',
          issue: `Edge Function returned status ${response.status}`,
          severity: 'medium'
        });
      }
    } catch (error) {
      this.results.warnings.push({
        check: 'Edge Functions',
        issue: 'Could not reach Edge Function endpoint',
        severity: 'medium'
      });
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        warnings: this.results.warnings.length
      },
      results: this.results,
      recommendation: this.getRecommendation()
    };

    // Save report
    await fs.writeJson(
      path.join(__dirname, `../../validation-report-${Date.now()}.json`),
      report,
      { spaces: 2 }
    );

    console.log('\n' + '='.repeat(50));
    console.log('VALIDATION REPORT');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log('\nRecommendation:', report.recommendation);

    // Show critical failures
    if (this.results.failed.length > 0) {
      console.log('\n🔴 Critical Issues:');
      this.results.failed.forEach(issue => {
        console.log(`  - ${issue.issue}`);
      });
    }

    // Show warnings
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.warnings.slice(0, 5).forEach(warning => {
        console.log(`  - ${warning.issue}`);
      });
      if (this.results.warnings.length > 5) {
        console.log(`  ... and ${this.results.warnings.length - 5} more`);
      }
    }

    return report;
  }

  getRecommendation() {
    if (this.results.failed.length > 0) {
      return '🛑 DO NOT PROCEED - Critical issues must be resolved';
    }
    if (this.results.warnings.length > 5) {
      return '⚠️ PROCEED WITH CAUTION - Review and address warnings';
    }
    return '✅ SAFE TO PROCEED - System validated successfully';
  }
}

// Run validation if executed directly
if (require.main === module) {
  const validator = new MigrationValidator();
  validator.validate()
    .then(report => {
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = MigrationValidator;