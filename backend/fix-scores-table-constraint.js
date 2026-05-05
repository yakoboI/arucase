/**
 * Fix Scores Table Constraint
 * This script updates the preform_one_scores table to handle created_by field properly
 */

const { query } = require('./config/database');

async function fixScoresTableConstraint() {
  try {
    console.log('🔍 DEBUG: Fixing preform_one_scores table constraints...');
    
    // Option 1: Make created_by nullable (less strict)
    console.log('🔍 DEBUG: Making created_by column nullable...');
    await query(`
      ALTER TABLE preform_one_scores 
      ALTER COLUMN created_by DROP NOT NULL
    `);
    console.log('✅ SUCCESS: created_by column is now nullable');
    
    // Option 2: Add a default value (alternative approach)
    // console.log('🔍 DEBUG: Setting default value for created_by...');
    // await query(`
    //   ALTER TABLE preform_one_scores 
    //   ALTER COLUMN created_by SET DEFAULT 1
    // `);
    // console.log('✅ SUCCESS: created_by column now has default value of 1');
    
    // Verify the change
    console.log('🔍 DEBUG: Verifying table structure...');
    const tableStructure = await query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'preform_one_scores' AND column_name = 'created_by'
    `);
    
    console.log('🔍 DEBUG: Updated column info:', tableStructure.rows[0]);
    
    console.log('✅ SUCCESS: Scores table constraint fixed successfully!');
    
  } catch (error) {
    console.error('❌ ERROR: Failed to fix scores table constraint:', error);
    console.error('❌ ERROR DETAILS:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixScoresTableConstraint()
  .then(() => {
    console.log('🔍 DEBUG: Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERROR: Fix failed:', error);
    process.exit(1);
  });
