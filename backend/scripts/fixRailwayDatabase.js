/**
 * Fix Railway Database Issues
 * Run: node backend/scripts/fixRailwayDatabase.js
 * 
 * This script fixes the missing permissions column and preform_one_students table
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function fixRailwayDatabase() {
  try {
    console.log('🔧 Starting Railway database fixes...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, '../database/fix_railway_database.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Import database config
    const { query } = require('../config/database');
    
    // Split the SQL content into individual statements, preserving DO blocks
    const statements = [];
    const lines = sqlContent.split('\n');
    let currentStatement = '';
    let inDoBlock = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Check for DO block start/end
      if (trimmedLine.startsWith('DO $$')) {
        inDoBlock = true;
      } else if (trimmedLine === '$$;' && inDoBlock) {
        inDoBlock = false;
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else if (!inDoBlock && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await query(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        // Some statements might fail due to existing objects, which is okay
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key')) {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} - ${error.message}`);
        } else {
          console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 Railway database fixes completed successfully!');
    
    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    
    // Check if permissions column exists
    const permissionsCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'permissions'
    `);
    
    if (permissionsCheck.rows.length > 0) {
      console.log('✅ permissions column exists in users table');
    } else {
      console.log('❌ permissions column still missing from users table');
    }
    
    // Check if preform_one_students table exists
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'preform_one_students'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ preform_one_students table exists');
      
      // Count records
      const countResult = await query('SELECT COUNT(*) as count FROM preform_one_students');
      console.log(`📊 preform_one_students has ${countResult.rows[0].count} records`);
    } else {
      console.log('❌ preform_one_students table still missing');
    }
    
    // Check if preformone_interview_subjects table exists
    const subjectsCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'preformone_interview_subjects'
    `);
    
    if (subjectsCheck.rows.length > 0) {
      console.log('✅ preformone_interview_subjects table exists');
      
      // Count subjects
      const subjectsCount = await query('SELECT COUNT(*) as count FROM preformone_interview_subjects');
      console.log(`📊 preformone_interview_subjects has ${subjectsCount.rows[0].count} subjects`);
    } else {
      console.log('❌ preformone_interview_subjects table still missing');
    }
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixRailwayDatabase();
