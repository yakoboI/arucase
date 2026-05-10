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

async function retryFailedTransfers() {
  console.log('🔄 Retrying failed data transfers...');
  
  try {
    // Retry individual_scores
    console.log('\n📋 Retrying individual_scores...');
    const localScores = await localPool.query('SELECT * FROM individual_scores LIMIT 1000');
    console.log(`📊 Found ${localScores.rows.length} score records`);
    
    if (localScores.rows.length > 0) {
      await railwayPool.query('DELETE FROM individual_scores');
      
      const columns = Object.keys(localScores.rows[0]);
      const columnNames = columns.join(', ');
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      let insertedCount = 0;
      for (const row of localScores.rows) {
        const values = columns.map(col => row[col]);
        await railwayPool.query(
          `INSERT INTO individual_scores (${columnNames}) VALUES (${placeholders})`,
          values
        );
        insertedCount++;
        
        if (insertedCount % 100 === 0) {
          console.log(`  📈 Inserted ${insertedCount} score records...`);
        }
      }
      console.log(`✅ Successfully transferred ${insertedCount} individual_scores records`);
    }

    // Retry preform_one_students
    console.log('\n📋 Retrying preform_one_students...');
    const localPreformStudents = await localPool.query('SELECT * FROM preform_one_students');
    console.log(`📊 Found ${localPreformStudents.rows.length} preform students`);
    
    if (localPreformStudents.rows.length > 0) {
      await railwayPool.query('DELETE FROM preform_one_students');
      
      const columns = Object.keys(localPreformStudents.rows[0]);
      const columnNames = columns.join(', ');
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      for (const row of localPreformStudents.rows) {
        const values = columns.map(col => row[col]);
        await railwayPool.query(
          `INSERT INTO preform_one_students (${columnNames}) VALUES (${placeholders})`,
          values
        );
      }
      console.log(`✅ Successfully transferred ${localPreformStudents.rows.length} preform_one_students records`);
    }

    // Verify final counts
    console.log('\n🔍 Final verification...');
    const railwayStudents = await railwayPool.query('SELECT COUNT(*) as count FROM students');
    const railwayScores = await railwayPool.query('SELECT COUNT(*) as count FROM individual_scores');
    const railwayPreform = await railwayPool.query('SELECT COUNT(*) as count FROM preform_one_students');
    
    console.log(`📊 Final Railway counts:`);
    console.log(`  - Students: ${railwayStudents.rows[0].count}`);
    console.log(`  - Individual Scores: ${railwayScores.rows[0].count}`);
    console.log(`  - Preform Students: ${railwayPreform.rows[0].count}`);

    console.log('\n🎉 Retry transfers completed!');

  } catch (error) {
    console.error('❌ Retry failed:', error);
    throw error;
  } finally {
    await localPool.end();
    await railwayPool.end();
  }
}

retryFailedTransfers()
  .then(() => {
    console.log('✅ Retry completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Retry failed:', error);
    process.exit(1);
  });
