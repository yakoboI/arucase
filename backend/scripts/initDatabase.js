/**
 * Database Schema Initialization Script
 * Run: node backend/scripts/initDatabase.js
 * 
 * Creates all necessary tables for the application
 */
require('dotenv').config();
const { query } = require('../config/database');

async function initDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Enable UUID extension
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ UUID extension enabled');
    
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        permissions TEXT,
        profile_picture VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        bio TEXT,
        department VARCHAR(100),
        position VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Ensure permissions column exists on existing deployments
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT;`);
    console.log('✅ Users table permissions column ensured');

    // Admissions applicants (public registration for admissions)
    await query(`
      CREATE TABLE IF NOT EXISTS admission_applicants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_admission_applicants_email ON admission_applicants(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_admission_applicants_phone ON admission_applicants(phone)');
    console.log('✅ Admission applicants table created');

    // Admissions applications (submitted by applicants; reviewed by admin)
    await query(`
      CREATE TABLE IF NOT EXISTS admission_applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        applicant_id UUID NOT NULL REFERENCES admission_applicants(id) ON DELETE CASCADE,
        education_level VARCHAR(50) NOT NULL,
        is_transfer BOOLEAN DEFAULT FALSE,
        previous_school VARCHAR(255),
        desired_entry VARCHAR(100) NOT NULL,
        region VARCHAR(100),
        district VARCHAR(100),
        message TEXT,
        documents JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        admin_feedback TEXT,
        application_no INTEGER DEFAULT 1,
        is_reapplication BOOLEAN DEFAULT FALSE,
        previous_application_id UUID,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Drop old unique constraint if upgrading an existing DB
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'admission_applications'::regclass
            AND contype = 'u'
            AND conname = 'admission_applications_applicant_id_key'
        ) THEN
          ALTER TABLE admission_applications DROP CONSTRAINT admission_applications_applicant_id_key;
        END IF;
      END $$;
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_admission_applications_status ON admission_applications(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_admission_applications_submitted_at ON admission_applications(submitted_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_admission_applications_applicant ON admission_applications(applicant_id, submitted_at DESC)');
    console.log('✅ Admission applications table created');
    
    // Students table
    await query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        middle_name VARCHAR(255),
        surname VARCHAR(255) NOT NULL,
        sex VARCHAR(10) NOT NULL,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        -- COM is used to represent the student's combination/track membership
        -- for Form I-IV results (e.g. Sc, Ss, Ui).
        com VARCHAR(50),
        year INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(adm_no, level, stream, year)
      )
    `);
    console.log('✅ Students table created');

    // Ensure COM column exists on existing deployments.
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'students'
            AND column_name = 'com'
        ) THEN
          ALTER TABLE students ADD COLUMN com VARCHAR(50);
        END IF;
      END $$;
    `);
    
    // Create indexes for students (scale: 2000+ students with photos/data across years)
    await query('CREATE INDEX IF NOT EXISTS idx_students_class ON students(level, stream, year)');
    await query('CREATE INDEX IF NOT EXISTS idx_students_adm ON students(adm_no)');
    await query('CREATE INDEX IF NOT EXISTS idx_students_adm_year ON students(adm_no, year)');
    
    // Student photos table
    await query(`
      CREATE TABLE IF NOT EXISTS student_photos (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        student_index INTEGER NOT NULL,
        photo_filename VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, student_index)
      )
    `);
    console.log('✅ Student photos table created');
    await query('CREATE INDEX IF NOT EXISTS idx_student_photos_class ON student_photos(level, stream, year)');
    
    // Student parishes table
    await query(`
      CREATE TABLE IF NOT EXISTS student_parishes (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        student_index INTEGER NOT NULL,
        parish_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, student_index)
      )
    `);
    console.log('✅ Student parishes table created');
    await query('CREATE INDEX IF NOT EXISTS idx_student_parishes_lookup ON student_parishes(level, stream, year, student_index)');
    
    // Comments table
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        comment_type VARCHAR(50) NOT NULL,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        term VARCHAR(20) DEFAULT 'Term I',
        student_index VARCHAR(10) NOT NULL,
        comment_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(comment_type, level, stream, year, term, student_index)
      )
    `);
    console.log('✅ Comments table created');
    await query('CREATE INDEX IF NOT EXISTS idx_comments_lookup ON comments(comment_type, level, stream, year, student_index)');
    
    // Subjects table
    await query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        subject_code VARCHAR(20) NOT NULL,
        subject_name VARCHAR(255) NOT NULL,
        subject_abbreviation VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, subject_code)
      )
    `);
    console.log('✅ Subjects table created');
    await query('CREATE INDEX IF NOT EXISTS idx_subjects_class ON subjects(level, stream, year)');
    
    // Subject teachers table
    await query(`
      CREATE TABLE IF NOT EXISTS subject_teachers (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        subject_code VARCHAR(20) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        teacher_signature VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, subject_code)
      )
    `);
    console.log('✅ Subject teachers table created');
    await query('CREATE INDEX IF NOT EXISTS idx_subject_teachers_class ON subject_teachers(level, stream, year)');
    
    // Individual scores table
    await query(`
      CREATE TABLE IF NOT EXISTS individual_scores (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        month VARCHAR(20) NOT NULL,
        subject_code VARCHAR(20) NOT NULL,
        adm_no VARCHAR(50) NOT NULL,
        score DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, month, subject_code, adm_no)
      )
    `);
    console.log('✅ Individual scores table created');
    
    // Create indexes for scores
    await query('CREATE INDEX IF NOT EXISTS idx_scores_student ON individual_scores(adm_no)');
    await query('CREATE INDEX IF NOT EXISTS idx_scores_subject ON individual_scores(subject_code)');
    await query('CREATE INDEX IF NOT EXISTS idx_scores_class ON individual_scores(level, stream, year, month)');
    
    // Monthly results table
    await query(`
      CREATE TABLE IF NOT EXISTS monthly_results (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        month VARCHAR(20) NOT NULL,
        student_index VARCHAR(10) NOT NULL,
        total_marks DECIMAL(10,2),
        average DECIMAL(10,2),
        grade VARCHAR(10),
        position INTEGER,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, month, student_index)
      )
    `);
    console.log('✅ Monthly results table created');
    
    // Tabia na Mwenendo table
    await query(`
      CREATE TABLE IF NOT EXISTS tabia_mwenendo (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        term VARCHAR(20) DEFAULT 'Term I' NOT NULL,
        student_index VARCHAR(10) NOT NULL,
        criterion VARCHAR(100) NOT NULL,
        evaluation VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, term, student_index, criterion)
      )
    `);
    console.log('✅ Tabia na Mwenendo table created');
    
    // Individual debt table
    await query(`
      CREATE TABLE IF NOT EXISTS individual_debt (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        student_index VARCHAR(10) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        due_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Outstanding',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, student_index)
      )
    `);
    console.log('✅ Individual debt table created');
    
    // Fees announcements table
    await query(`
      CREATE TABLE IF NOT EXISTS fees_announcements (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        term VARCHAR(20) DEFAULT 'Term I',
        announcement_index VARCHAR(10) NOT NULL,
        announcement_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, stream, year, term, announcement_index)
      )
    `);
    console.log('✅ Fees announcements table created');
    
    // Add term column if it doesn't exist (for existing databases)
    try {
      await query(`
        ALTER TABLE fees_announcements 
        ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'Term I'
      `);
      
      // Update unique constraint to include term
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fees_announcements_level_stream_year_term_announcement_index_key'
          ) THEN
            ALTER TABLE fees_announcements 
            DROP CONSTRAINT IF EXISTS fees_announcements_level_stream_year_announcement_index_key;
            ALTER TABLE fees_announcements 
            ADD CONSTRAINT fees_announcements_level_stream_year_term_announcement_index_key 
            UNIQUE(level, stream, year, term, announcement_index);
          END IF;
        END $$;
      `);
      console.log('✅ Fees announcements table updated with term column');
    } catch (error) {
      console.log('⚠️  Could not update fees_announcements table:', error.message);
    }
    
    // Public announcements table
    await query(`
      CREATE TABLE IF NOT EXISTS public_announcements (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        date VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        type VARCHAR(100) DEFAULT 'General Announcement',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Public announcements table created');
    
    // Read announcements tracking
    await query(`
      CREATE TABLE IF NOT EXISTS read_announcements (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        announcement_id VARCHAR(100) NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, announcement_id)
      )
    `);
    console.log('✅ Read announcements table created');
    
    // Public pages table
    await query(`
      CREATE TABLE IF NOT EXISTS public_pages (
        id SERIAL PRIMARY KEY,
        page_name VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Public pages table created');
    
    // Website settings table
    await query(`
      CREATE TABLE IF NOT EXISTS website_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        school_logo VARCHAR(255),
        patron_saint_image VARCHAR(255),
        login_background_image VARCHAR(255),
        school_name VARCHAR(255),
        tagline VARCHAR(255),
        banner_text TEXT,
        contact_address TEXT,
        contact_phone VARCHAR(50),
        contact_email VARCHAR(255),
        contact_whatsapp VARCHAR(50),
        social_youtube VARCHAR(255),
        social_facebook VARCHAR(255),
        social_instagram VARCHAR(255),
        social_twitter VARCHAR(255),
        social_location VARCHAR(255),
        office_weekdays VARCHAR(255),
        office_saturday VARCHAR(255),
        office_sunday VARCHAR(255),
        office_holidays VARCHAR(255),
        mass_reading_display_mode VARCHAR(50) DEFAULT 'full',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_settings_id CHECK (id = 1)
      )
    `);
    console.log('✅ Website settings table created');
    
    // Gallery photos table
    await query(`
      CREATE TABLE IF NOT EXISTS gallery_photos (
        id VARCHAR(100) PRIMARY KEY,
        path VARCHAR(255) NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        caption TEXT,
        date VARCHAR(50),
        uploaded_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Gallery photos table created');
    
    // Events table
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date VARCHAR(50) NOT NULL,
        event_time VARCHAR(50),
        location VARCHAR(255),
        category VARCHAR(100),
        image VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Events table created');
    
    // Public events table (alias/synonym for events)
    await query(`
      CREATE TABLE IF NOT EXISTS public_events (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date VARCHAR(50) NOT NULL,
        event_time VARCHAR(50),
        location VARCHAR(255),
        category VARCHAR(100),
        image VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Public events table created');
    
    // Public gallery table (alias/synonym for gallery_photos)
    await query(`
      CREATE TABLE IF NOT EXISTS public_gallery (
        id VARCHAR(100) PRIMARY KEY,
        path VARCHAR(255) NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        caption TEXT,
        date VARCHAR(50),
        uploaded_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Public gallery table created');
    
    // Alumni table
    await query(`
      CREATE TABLE IF NOT EXISTS alumni (
        id VARCHAR(100) PRIMARY KEY,
        official_names VARCHAR(255) NOT NULL,
        year_start VARCHAR(10) NOT NULL,
        year_end VARCHAR(10) NOT NULL,
        class_level VARCHAR(50),
        current_position VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        social_media VARCHAR(255),
        philosophy TEXT,
        photo VARCHAR(255),
        submitted_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Alumni table created');
    
    // Testimonies table
    await query(`
      CREATE TABLE IF NOT EXISTS testimonies (
        id VARCHAR(100) PRIMARY KEY,
        official_names VARCHAR(255) NOT NULL,
        year_start VARCHAR(10) NOT NULL,
        year_end VARCHAR(10) NOT NULL,
        class_level VARCHAR(50),
        current_position VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        social_media VARCHAR(255),
        philosophy TEXT,
        photo VARCHAR(255),
        submitted_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Testimonies table created');
    
    // Mass readings table
    await query(`
      CREATE TABLE IF NOT EXISTS mass_readings (
        id SERIAL PRIMARY KEY,
        reading_date DATE NOT NULL UNIQUE,
        first_reading_title VARCHAR(255),
        first_reading_text TEXT,
        psalm_title VARCHAR(255),
        psalm_text TEXT,
        second_reading_title VARCHAR(255),
        second_reading_text TEXT,
        gospel_title VARCHAR(255),
        gospel_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Mass readings table created');
    
    // Donations table
    await query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        country VARCHAR(100) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        amount VARCHAR(50) NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        spiritual_intention TEXT,
        donor_terms TEXT,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        cover_charges VARCHAR(10),
        employer_matching VARCHAR(10),
        employer_name VARCHAR(255),
        contact_email BOOLEAN DEFAULT FALSE,
        contact_postal BOOLEAN DEFAULT FALSE,
        contact_phone BOOLEAN DEFAULT FALSE,
        consent BOOLEAN DEFAULT TRUE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Donations table created');
    
    // FAQs table
    await query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id VARCHAR(100) PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ FAQs table created');
    
    // NECTA Results URLs table
    await query(`
      CREATE TABLE IF NOT EXISTS necta_result_urls (
        id VARCHAR(100) PRIMARY KEY,
        exam_type VARCHAR(20) NOT NULL,
        year INTEGER NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(exam_type, year)
      )
    `);
    console.log('✅ NECTA result URLs table created');
    
    // Create index for faster lookups
    await query('CREATE INDEX IF NOT EXISTS idx_necta_urls_lookup ON necta_result_urls(exam_type, year, active)');

    // NECTA stored results (parsed from NECTA result pages for AI/analytics)
    await query(`
      CREATE TABLE IF NOT EXISTS necta_candidates (
        id SERIAL PRIMARY KEY,
        exam_type VARCHAR(20) NOT NULL,
        year INTEGER NOT NULL,
        candidate_no VARCHAR(100),
        candidate_name VARCHAR(500),
        sex VARCHAR(100),
        division VARCHAR(100),
        points INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(exam_type, year, candidate_no)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS necta_subject_grades (
        id SERIAL PRIMARY KEY,
        exam_type VARCHAR(20) NOT NULL,
        year INTEGER NOT NULL,
        candidate_no VARCHAR(100) NOT NULL,
        subject_code VARCHAR(100),
        subject_name VARCHAR(300),
        grade VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_necta_candidates_lookup ON necta_candidates(exam_type, year)');
    await query('CREATE INDEX IF NOT EXISTS idx_necta_grades_lookup ON necta_subject_grades(exam_type, year, subject_name)');
    console.log('✅ NECTA candidates and subject grades tables created');
    
    // Administrators table
    await query(`
      CREATE TABLE IF NOT EXISTS administrators (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        year_started VARCHAR(10),
        photo VARCHAR(255),
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Administrators table created');

    // Staff profiles table (teachers + non-teaching staff shown on public /staff page)
    await query(`
      CREATE TABLE IF NOT EXISTS staff_profiles (
        id VARCHAR(100) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        role_title VARCHAR(255) NOT NULL,
        is_teaching BOOLEAN DEFAULT TRUE,
        professional_subjects TEXT,
        teaching_since_year INTEGER,
        subjects_teaching TEXT,
        class_teacher_for VARCHAR(100),
        other_duties TEXT,
        contact_phone VARCHAR(50),
        contact_email VARCHAR(255),
        photo_path VARCHAR(255),
        profile_summary TEXT,
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_staff_profiles_active_order ON staff_profiles(active, display_order, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_staff_profiles_teaching ON staff_profiles(is_teaching, active)');
    console.log('✅ Staff profiles table created');
    
    // Visitor stats table
    await query(`
      CREATE TABLE IF NOT EXISTS visitor_stats (
        id SERIAL PRIMARY KEY,
        stat_type VARCHAR(50) NOT NULL,
        stat_key VARCHAR(100) NOT NULL,
        stat_value INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(stat_type, stat_key)
      )
    `);
    console.log('✅ Visitor stats table created');
    
    // User activity table
    await query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User activity table created');
    
    // Create index for user activity
    await query('CREATE INDEX IF NOT EXISTS idx_user_activity_username ON user_activity(username)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp DESC)');
    
    // App logs table (comprehensive logging)
    await query(`
      CREATE TABLE IF NOT EXISTS app_logs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100),
        level VARCHAR(20) NOT NULL DEFAULT 'INFO',
        method VARCHAR(10) NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        url TEXT NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        status_code INTEGER,
        response_time_ms INTEGER,
        request_body TEXT,
        response_body TEXT,
        error_message TEXT,
        activity_type VARCHAR(50) DEFAULT 'api_request',
        filters_applied TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ App logs table created');
    
    // Create indexes for app logs
    await query('CREATE INDEX IF NOT EXISTS idx_app_logs_username ON app_logs(username)');
    await query('CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level)');
    await query('CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_app_logs_activity_type ON app_logs(activity_type)');
    await query('CREATE INDEX IF NOT EXISTS idx_app_logs_endpoint ON app_logs(endpoint)');
    await query('CREATE INDEX IF NOT EXISTS idx_app_logs_status_code ON app_logs(status_code)');
    await query('CREATE INDEX IF NOT EXISTS idx_app_logs_method ON app_logs(method)');
    
    // School logo table
    await query(`
      CREATE TABLE IF NOT EXISTS school_logo (
        id INTEGER PRIMARY KEY DEFAULT 1,
        logo_image_path VARCHAR(255),
        school_name VARCHAR(255),
        motto VARCHAR(255),
        address TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_logo_id CHECK (id = 1)
      )
    `);
    console.log('✅ School logo table created');
    
    // School stamp table
    await query(`
      CREATE TABLE IF NOT EXISTS school_stamp (
        id INTEGER PRIMARY KEY DEFAULT 1,
        stamp_image_path VARCHAR(255),
        school_name VARCHAR(255),
        motto VARCHAR(255),
        address TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_stamp_id CHECK (id = 1)
      )
    `);
    console.log('✅ School stamp table created');
    
    // Authority data table
    await query(`
      CREATE TABLE IF NOT EXISTS authority_data (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        signature VARCHAR(255),
        signature_image_path VARCHAR(255),
        date VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_authority_id CHECK (id = 1)
      )
    `);
    console.log('✅ Authority data table created');
    
    // Marks config table
    await query(`
      CREATE TABLE IF NOT EXISTS marks_config (
        id SERIAL PRIMARY KEY,
        month VARCHAR(20) UNIQUE NOT NULL,
        weight DECIMAL(5,2) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Marks config table created');
    
    // Fees instructions table
    await query(`
      CREATE TABLE IF NOT EXISTS fees_instructions (
        id SERIAL PRIMARY KEY,
        number VARCHAR(10) NOT NULL,
        title VARCHAR(255) NOT NULL,
        points TEXT NOT NULL,
        display_order INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Fees instructions table created');
    
    // Student history table (for promotions)
    await query(`
      CREATE TABLE IF NOT EXISTS student_history (
        id SERIAL PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        current_level VARCHAR(50) NOT NULL,
        current_stream VARCHAR(50) NOT NULL,
        current_year INTEGER NOT NULL,
        previous_level VARCHAR(50),
        previous_stream VARCHAR(50),
        previous_year INTEGER,
        promotion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        promotion_type VARCHAR(50) DEFAULT 'automatic',
        promoted_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        UNIQUE(adm_no, current_level, current_stream, current_year)
      )
    `);
    console.log('✅ Student history table created');
    
    // Promotion sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS promotion_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        from_level VARCHAR(50) NOT NULL,
        from_stream VARCHAR(50) NOT NULL,
        from_year INTEGER NOT NULL,
        to_level VARCHAR(50) NOT NULL,
        to_stream VARCHAR(50) NOT NULL,
        to_year INTEGER NOT NULL,
        total_students INTEGER DEFAULT 0,
        promoted_count INTEGER DEFAULT 0,
        excluded_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed'
      )
    `);
    console.log('✅ Promotion sessions table created');
    
    // Promotion exclusions table
    await query(`
      CREATE TABLE IF NOT EXISTS promotion_exclusions (
        id SERIAL PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        reason TEXT NOT NULL,
        excluded_by VARCHAR(255) NOT NULL,
        excluded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(adm_no, level, stream, year)
      )
    `);
    console.log('✅ Promotion exclusions table created');
    
    // Student Pass IDs table
    await query(`
      CREATE TABLE IF NOT EXISTS student_pass_ids (
        id SERIAL PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50),
        year INTEGER NOT NULL,
        month VARCHAR(50) NOT NULL,
        pass_id VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        UNIQUE(adm_no, level, year, month)
      )
    `);
    console.log('✅ Student Pass IDs table created');
    
    // Create index for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_student_pass_ids_lookup 
      ON student_pass_ids(adm_no, level, year, month)
    `);
    console.log('✅ Student Pass IDs indexes created');

    // AI Matters documents (admin-only: uploaded PDF/CSV/DOCX for AI Q&A)
    await query(`
      CREATE TABLE IF NOT EXISTS ai_matters_documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        extracted_text TEXT,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      )
    `);
    console.log('✅ AI Matters documents table created');

    // Pre-Form One Interview Subjects table
    await query(`
      CREATE TABLE IF NOT EXISTS preformone_interview_subjects (
        id SERIAL PRIMARY KEY,
        subject_name VARCHAR(200) NOT NULL UNIQUE,
        subject_code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        max_marks INTEGER DEFAULT 100,
        interview_duration_minutes INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Pre-Form One Interview Subjects table created');

    // Create index for faster lookups
    await query('CREATE INDEX IF NOT EXISTS idx_preformone_interview_subjects_code ON preformone_interview_subjects(subject_code)');
    await query('CREATE INDEX IF NOT EXISTS idx_preformone_interview_subjects_active ON preformone_interview_subjects(is_active)');

    // Create trigger to automatically update updated_at
    // Note: trigger uses a pre-existing or separately-managed plpgsql function
    await query(
      'DROP TRIGGER IF EXISTS update_preformone_interview_subjects_updated_at' +
      ' ON preformone_interview_subjects'
    );
    console.log('✅ Pre-Form One Interview Subjects triggers created');

    // Insert default interview subjects
    await query(
      'INSERT INTO preformone_interview_subjects' +
      ' (subject_name, subject_code, description, max_marks, interview_duration_minutes)' +
      ' VALUES' +
      " ('Mathematics', 'MATH', 'Mathematics assessment including arithmetic, algebra, and geometry', 100, 45)," +
      " ('English Language', 'ENG', 'English language assessment including reading, writing, and comprehension', 100, 40)," +
      " ('Kiswahili', 'KIS', 'Kiswahili language assessment including reading, writing, and comprehension', 100, 40)," +
      " ('Science', 'SCI', 'General science assessment including biology, chemistry, and physics basics', 100, 50)," +
      " ('Social Studies', 'SOC', 'Social studies assessment including geography, history, and civics', 100, 35)," +
      " ('Religious Education', 'RE', 'Religious education assessment covering moral values and religious studies', 100, 30)," +
      " ('Civics and Moral Education', 'CIV', 'Civics and moral education assessment', 100, 30)," +
      " ('General Knowledge', 'GK', 'General knowledge and current affairs assessment', 100, 25)" +
      ' ON CONFLICT (subject_name) DO NOTHING'
    );
    console.log('✅ Default Pre-Form One Interview Subjects inserted');

    console.log('\n✅ Database schema initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    process.exit(1);
  }
}

initDatabase();
