const { poolFromEnv } = require('./utils/scriptDbPool');

const localPool = poolFromEnv('LOCAL_DATABASE_URL');
const railwayPool = poolFromEnv('RAILWAY_DATABASE_URL');

async function finalTransferFix() {
  console.log('🔧 Final transfer fix...');
  
  try {
    // Fix preform_one_students with proper column mapping
    console.log('\n📋 Fixing preform_one_students transfer...');
    const localPreformStudents = await localPool.query('SELECT * FROM preform_one_students');
    console.log(`📊 Found ${localPreformStudents.rows.length} preform students`);
    
    if (localPreformStudents.rows.length > 0) {
      await railwayPool.query('DELETE FROM preform_one_students');
      
      for (const row of localPreformStudents.rows) {
        // Map admission_number to adm_no for Railway
        await railwayPool.query(`
          INSERT INTO preform_one_students (
            id, adm_no, first_name, middle_name, surname, sex, year, 
            term, created_at, updated_at, admission_number, serial_number, parish
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          row.id,
          row.admission_number, // Map admission_number to adm_no
          row.first_name,
          row.middle_name,
          row.surname,
          row.sex,
          row.year,
          row.term || null,
          row.created_at,
          row.updated_at,
          row.admission_number,
          row.serial_number,
          row.parish
        ]);
      }
      console.log(`✅ Successfully transferred ${localPreformStudents.rows.length} preform_one_students records`);
    }

    // Transfer remaining individual_scores (all of them)
    console.log('\n📋 Transferring all individual_scores...');
    const allLocalScores = await localPool.query('SELECT * FROM individual_scores');
    console.log(`📊 Found ${allLocalScores.rows.length} total score records`);
    
    if (allLocalScores.rows.length > 0) {
      await railwayPool.query('DELETE FROM individual_scores');
      
      const columns = Object.keys(allLocalScores.rows[0]);
      const columnNames = columns.join(', ');
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      let insertedCount = 0;
      for (const row of allLocalScores.rows) {
        const values = columns.map(col => row[col]);
        await railwayPool.query(
          `INSERT INTO individual_scores (${columnNames}) VALUES (${placeholders})`,
          values
        );
        insertedCount++;
        
        if (insertedCount % 500 === 0) {
          console.log(`  📈 Inserted ${insertedCount}/${allLocalScores.rows.length} score records...`);
        }
      }
      console.log(`✅ Successfully transferred ${insertedCount} individual_scores records`);
    }

    // Final verification
    console.log('\n🔍 Final verification...');
    const railwayStudents = await railwayPool.query('SELECT COUNT(*) as count FROM students');
    const railwayScores = await railwayPool.query('SELECT COUNT(*) as count FROM individual_scores');
    const railwayPreform = await railwayPool.query('SELECT COUNT(*) as count FROM preform_one_students');
    const railwaySubjects = await railwayPool.query('SELECT COUNT(*) as count FROM subjects');
    
    console.log(`📊 Final Railway counts:`);
    console.log(`  - Students: ${railwayStudents.rows[0].count}`);
    console.log(`  - Individual Scores: ${railwayScores.rows[0].count}`);
    console.log(`  - Preform Students: ${railwayPreform.rows[0].count}`);
    console.log(`  - Subjects: ${railwaySubjects.rows[0].count}`);

    console.log('\n🎉 All transfers completed successfully!');

  } catch (error) {
    console.error('❌ Final transfer failed:', error);
    throw error;
  } finally {
    await localPool.end();
    await railwayPool.end();
  }
}

finalTransferFix()
  .then(() => {
    console.log('✅ Final transfer completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Final transfer failed:', error);
    process.exit(1);
  });
