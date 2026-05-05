/**
 * Create Sample Pre-Form One Students
 * This script adds sample Pre-Form One students for testing the score entry system
 */

const { query } = require('./config/database');

const sampleStudents = [
  {
    admission_number: 'PF2025-001',
    serial_number: 'SN001',
    first_name: 'John',
    middle_name: 'Michael',
    surname: 'Smith',
    sex: 'Male',
    parish: 'St. Peter',
    year: 2025
  },
  {
    admission_number: 'PF2025-002',
    serial_number: 'SN002',
    first_name: 'Mary',
    middle_name: 'Elizabeth',
    surname: 'Johnson',
    sex: 'Female',
    parish: 'St. Paul',
    year: 2025
  },
  {
    admission_number: 'PF2025-003',
    serial_number: 'SN003',
    first_name: 'David',
    middle_name: 'James',
    surname: 'Brown',
    sex: 'Male',
    parish: 'St. Mary',
    year: 2025
  },
  {
    admission_number: 'PF2025-004',
    serial_number: 'SN004',
    first_name: 'Sarah',
    middle_name: 'Grace',
    surname: 'Davis',
    sex: 'Female',
    parish: 'St. John',
    year: 2025
  },
  {
    admission_number: 'PF2025-005',
    serial_number: 'SN005',
    first_name: 'Michael',
    middle_name: 'Robert',
    surname: 'Wilson',
    sex: 'Male',
    parish: 'St. Peter',
    year: 2025
  },
  {
    admission_number: 'PF2025-006',
    serial_number: 'SN006',
    first_name: 'Emma',
    middle_name: 'Rose',
    surname: 'Martinez',
    sex: 'Female',
    parish: 'St. Paul',
    year: 2025
  },
  {
    admission_number: 'PF2025-007',
    serial_number: 'SN007',
    first_name: 'James',
    middle_name: 'Andrew',
    surname: 'Anderson',
    sex: 'Male',
    parish: 'St. Mary',
    year: 2025
  },
  {
    admission_number: 'PF2025-008',
    serial_number: 'SN008',
    first_name: 'Olivia',
    middle_name: 'Sophia',
    surname: 'Taylor',
    sex: 'Female',
    parish: 'St. John',
    year: 2025
  }
];

async function createSampleStudents() {
  try {
    console.log('🔍 DEBUG: Starting to create sample Pre-Form One students...');
    
    // Check if students already exist
    const existingStudents = await query('SELECT COUNT(*) as count FROM preform_one_students WHERE year = 2025');
    console.log('🔍 DEBUG: Existing students count for 2025:', existingStudents.rows[0].count);
    
    if (existingStudents.rows[0].count > 0) {
      console.log('🔍 DEBUG: Students already exist, skipping creation');
      return;
    }
    
    console.log('🔍 DEBUG: Inserting sample students...');
    
    for (const student of sampleStudents) {
      console.log('🔍 DEBUG: Inserting student:', student.admission_number);
      
      const result = await query(
        `INSERT INTO preform_one_students 
         (admission_number, serial_number, first_name, middle_name, surname, sex, parish, year) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          student.admission_number,
          student.serial_number,
          student.first_name,
          student.middle_name,
          student.surname,
          student.sex,
          student.parish,
          student.year
        ]
      );
      
      console.log('🔍 DEBUG: Student created successfully:', result.rows[0]);
    }
    
    // Verify the students were created
    const verifyResult = await query('SELECT * FROM preform_one_students WHERE year = 2025 ORDER BY admission_number');
    console.log('🔍 DEBUG: Total students created:', verifyResult.rowCount);
    console.log('🔍 DEBUG: Created students:', verifyResult.rows);
    
    console.log('✅ SUCCESS: Sample Pre-Form One students created successfully!');
    
  } catch (error) {
    console.error('❌ ERROR: Failed to create sample students:', error);
    console.error('❌ ERROR DETAILS:', error.message);
    console.error('❌ ERROR STACK:', error.stack);
    process.exit(1);
  }
}

// Run the script
createSampleStudents()
  .then(() => {
    console.log('🔍 DEBUG: Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERROR: Script failed:', error);
    process.exit(1);
  });
