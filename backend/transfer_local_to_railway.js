const { Pool } = require('pg');

// Local database connection
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Mkalanga1994!@',
  database: 'arucase'
});

// Railway database connection
const railwayPool = new Pool({
  host: 'turntable.proxy.rlwy.net',
  port: 10105,
  user: 'postgres',
  password: 'xqvmJmNREUpfMdMtbtcpLktoWiedvrst',
  database: 'railway'
});

async function transferData() {
  console.log('🚀 Starting data transfer from localhost to Railway...');
  
  try {
    // Test connections
    console.log('📡 Testing database connections...');
    await localPool.query('SELECT NOW()');
    await railwayPool.query('SELECT NOW()');
    console.log('✅ Both database connections successful');

    // Get all tables that need to be transferred
    const tablesToTransfer = [
      'users',
      'students',
      'individual_scores', 
      'subjects',
      'preform_one_students',
      'preform_one_scores',
      'preform_one_interview_results',
      'preformone_interview_subjects',
      'school_logo',
      'school_stamp',
      'authority_data',
      'promotion_activities',
      'refresh_tokens'
    ];

    for (const tableName of tablesToTransfer) {
      console.log(`\n📋 Transferring table: ${tableName}`);
      
      try {
        // Check if table exists in local
        const localTableCheck = await localPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '${tableName}'
          );
        `);
        
        if (!localTableCheck.rows[0].exists) {
          console.log(`⚠️  Table ${tableName} not found in local database, skipping...`);
          continue;
        }

        // Get data from local
        const localData = await localPool.query(`SELECT * FROM ${tableName}`);
        console.log(`📊 Found ${localData.rows.length} records in ${tableName}`);

        if (localData.rows.length === 0) {
          console.log(`⚠️  No data in ${tableName}, skipping...`);
          continue;
        }

        // Clear existing data in Railway (be careful!)
        console.log(`🗑️  Clearing existing data in Railway ${tableName}...`);
        await railwayPool.query(`DELETE FROM ${tableName}`);

        // Get column names
        const columns = Object.keys(localData.rows[0]);
        const columnNames = columns.join(', ');
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

        // Insert data into Railway
        console.log(`💾 Inserting data into Railway ${tableName}...`);
        let insertedCount = 0;
        
        for (const row of localData.rows) {
          const values = columns.map(col => row[col]);
          await railwayPool.query(
            `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
            values
          );
          insertedCount++;
          
          if (insertedCount % 100 === 0) {
            console.log(`  📈 Inserted ${insertedCount}/${localData.rows.length} records...`);
          }
        }

        console.log(`✅ Successfully transferred ${insertedCount} records for ${tableName}`);

      } catch (error) {
        console.error(`❌ Error transferring ${tableName}:`, error.message);
      }
    }

    console.log('\n🎉 Data transfer completed!');
    
    // Verify transfer
    console.log('\n🔍 Verifying transfer...');
    for (const tableName of ['students', 'individual_scores']) {
      const railwayCount = await railwayPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`📊 Railway ${tableName}: ${railwayCount.rows[0].count} records`);
    }

  } catch (error) {
    console.error('❌ Transfer failed:', error);
    throw error;
  } finally {
    await localPool.end();
    await railwayPool.end();
  }
}

// Run the transfer
transferData()
  .then(() => {
    console.log('✅ Transfer completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Transfer failed:', error);
    process.exit(1);
  });
