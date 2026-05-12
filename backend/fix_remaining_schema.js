const { poolFromEnv } = require('./utils/scriptDbPool');

const railwayPool = poolFromEnv('RAILWAY_DATABASE_URL', 'DATABASE_URL');

async function fixRemainingSchema() {
  console.log('🔧 Fixing remaining Railway database schema...');
  
  try {
    // Add missing serial_number column to preform_one_students
    console.log('📝 Adding serial_number column to preform_one_students...');
    await railwayPool.query(`
      ALTER TABLE preform_one_students 
      ADD COLUMN IF NOT EXISTS serial_number VARCHAR(50)
    `);
    console.log('✅ Added serial_number column to preform_one_students');

    // Add missing parish column to preform_one_students
    console.log('📝 Adding parish column to preform_one_students...');
    await railwayPool.query(`
      ALTER TABLE preform_one_students 
      ADD COLUMN IF NOT EXISTS parish VARCHAR(200)
    `);
    console.log('✅ Added parish column to preform_one_students');

    // Check final structure
    console.log('🔍 Checking final preform_one_students structure...');
    const tableStructure = await railwayPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'preform_one_students'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Final preform_one_students structure:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('✅ All schema fixes completed');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

fixRemainingSchema()
  .then(() => {
    console.log('✅ Schema fixes completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema fixes failed:', error);
    process.exit(1);
  });
