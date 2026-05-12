const { poolFromEnv } = require('./utils/scriptDbPool');

const railwayPool = poolFromEnv('RAILWAY_DATABASE_URL', 'DATABASE_URL');

async function checkAdministrators() {
  console.log('🔍 Checking administrators table in Railway database...');
  
  try {
    // Check if table exists
    const tableCheck = await railwayPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'administrators'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ administrators table does not exist in Railway database');
      return;
    }

    // Get all administrators
    const adminResult = await railwayPool.query(`
      SELECT id, name, title, photo, active, display_order 
      FROM administrators 
      ORDER BY display_order, created_at
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators:`);
    
    if (adminResult.rows.length === 0) {
      console.log('⚠️  No administrators found in Railway database');
      
      // Check if we need to create the table
      console.log('🔧 Creating administrators table...');
      await railwayPool.query(`
        CREATE TABLE IF NOT EXISTS administrators (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          photo VARCHAR(500),
          year_started INTEGER,
          display_order INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ administrators table created');
      
      // Insert sample data
      console.log('📝 Inserting sample administrator...');
      await railwayPool.query(`
        INSERT INTO administrators (id, name, title, photo, display_order, active) 
        VALUES ('admin-1', 'Father Moses Peter Assey', 'Rector', NULL, 1, TRUE)
      `);
      console.log('✅ Sample administrator inserted');
      
    } else {
      adminResult.rows.forEach((admin, index) => {
        console.log(`  ${index + 1}. ${admin.name} - ${admin.title}`);
        console.log(`     ID: ${admin.id}`);
        console.log(`     Photo: ${admin.photo || 'NULL'}`);
        console.log(`     Active: ${admin.active}`);
        console.log(`     Order: ${admin.display_order}`);
        console.log('');
      });
    }

    // Check uploads directory structure
    console.log('📁 Checking if uploads directory exists...');
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../static/uploads/administrators');
      
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log(`📁 Administrators uploads directory exists with ${files.length} files:`);
        files.forEach(file => console.log(`  - ${file}`));
      } else {
        console.log('❌ Administrators uploads directory does not exist');
        console.log('📁 Creating administrators uploads directory...');
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Directory created');
      }
    } catch (error) {
      console.log('❌ Error checking uploads directory:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking administrators:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

checkAdministrators()
  .then(() => {
    console.log('✅ Administrator check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Administrator check failed:', error);
    process.exit(1);
  });
