/**
 * Create Admin User Script
 * Run: node backend/scripts/createAdmin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

async function createAdmin() {
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      throw new Error('Set ADMIN_PASSWORD in backend/.env before running createAdmin.js');
    }
    const fullName = process.env.ADMIN_FULL_NAME || 'Administrator';
    const email = process.env.ADMIN_EMAIL || 'admin@arucase.co.tz';
    
    console.log('Creating admin user...');
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const checkResult = await query('SELECT id FROM users WHERE username = $1', [username]);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log(`Username: ${username}`);
      return;
    }
    
    // Create admin user
    await query(
      `INSERT INTO users (username, password_hash, full_name, role, status, email)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [username, password_hash, fullName, 'admin', 'active', email]
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Full Name: ${fullName}`);
    console.log(`Email: ${email}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === '23505') {
      console.log('⚠️  User already exists!');
    } else {
      console.error('Full error:', error);
    }
  } finally {
    process.exit(0);
  }
}

createAdmin();

