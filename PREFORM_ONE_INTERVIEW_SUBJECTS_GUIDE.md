# Pre-Form One Interview Subjects Management System

## 🎯 Overview
A comprehensive interview subjects management system for Pre-Form One students with full CRUD operations, designed to streamline the interview process and ensure consistent subject management across all Pre-Form One interviews.

## 📋 Features

### ✅ **Core Functionality**
- **Create Subjects**: Add new interview subjects with validation
- **View Subjects**: List all subjects with search and filtering
- **Edit Subjects**: Modify existing subjects with all fields
- **Delete Subjects**: Remove subjects with confirmation
- **Toggle Status**: Activate/deactivate subjects instantly
- **Bulk Operations**: Efficient management of multiple subjects

### ✅ **Data Management**
- **Database Storage**: PostgreSQL with optimized schema
- **Real-time Updates**: Immediate UI synchronization
- **Validation**: Comprehensive input validation
- **Error Handling**: User-friendly error messages
- **Audit Trail**: Complete logging of all operations

## 🗄️ Database Schema

### Table: `preformone_interview_subjects`
```sql
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
);
```

### Key Features:
- **Unique Constraints**: Subject name and code uniqueness
- **Indexes**: Optimized for fast lookups
- **Triggers**: Automatic timestamp updates
- **Default Data**: 8 pre-configured subjects

## 🔧 API Endpoints

### Base URL: `/api/preformone-interview-subjects`

| Method | Endpoint | Description | Authentication |
|---------|----------|-------------|-------------|
| GET | `/` | Get all subjects | Required |
| GET | `/:id` | Get subject by ID | Required |
| POST | `/` | Create new subject | Required |
| PUT | `/:id` | Update subject | Required |
| DELETE | `/:id` | Delete subject | Required |

### Response Format:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-05-05T14:30:00.000Z"
}
```

## 🎨 Frontend Component

### File: `PreFormOneInterviewSubjects.jsx`

### Key Features:
- **Modern UI**: Clean, responsive design with loading states
- **Form Validation**: Real-time validation with error messages
- **Data Management**: Optimized state management and updates
- **User Experience**: Smooth interactions with toast notifications
- **Search & Filter**: Quick subject finding capabilities
- **Bulk Operations**: Efficient multi-subject management

### Component Structure:
```jsx
<PreFormOneInterviewSubjects>
  ├── Header (Add Subject button)
  ├── Form (Create/Edit with validation)
  ├── List (Table with search/filter)
  │   ├── Subject cards/rows
  │   ├── Action buttons (Edit/Delete/Toggle)
  │   └── Status indicators
  └── Empty/Loading states
</PreFormOneInterviewSubjects>
```

## 🚀 Getting Started

### 1. Database Setup
```bash
# Run database initialization
node backend/scripts/initDatabase.js

# Start backend server
npm run dev
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Access the System
Navigate to: `http://localhost:3001/admin/pre-form-one/2025/interview-subjects`

## 📝 Default Subjects

The system comes with 8 pre-configured interview subjects:

1. **Mathematics** (MATH) - 45 minutes
2. **English Language** (ENG) - 40 minutes  
3. **Kiswahili** (KIS) - 40 minutes
4. **Science** (SCI) - 50 minutes
5. **Social Studies** (SOC) - 35 minutes
6. **Religious Education** (RE) - 30 minutes
7. **Civics and Moral Education** (CIV) - 30 minutes
8. **General Knowledge** (GK) - 25 minutes

## 🔧 Customization

### Adding New Subjects
1. Navigate to Interview Subjects page
2. Click "Add Subject" button
3. Fill in subject details:
   - Subject Name* (required)
   - Subject Code* (required, unique)
   - Description (optional)
   - Maximum Marks (default: 100)
   - Interview Duration in minutes (default: 30)
   - Active Status (default: true)
4. Click "Add Subject" to save

### Managing Existing Subjects
1. **Edit**: Click edit button to modify subject details
2. **Delete**: Click delete button with confirmation
3. **Toggle Status**: Click activate/deactivate to change status
4. **Search**: Use search box to find specific subjects
5. **Filter**: Filter by active/inactive status

## 🎯 Benefits

- ✅ **Streamlined Process**: Consistent subject management for all interviews
- ✅ **Data Integrity**: Centralized subject database with validation
- ✅ **User Experience**: Modern, responsive interface with real-time updates
- ✅ **Scalability**: Efficient bulk operations and search capabilities
- ✅ **Audit Trail**: Complete logging of all subject management activities
- ✅ **Flexibility**: Easy to add, modify, or deactivate subjects as needed

## 📞 Support

For issues or questions about the Pre-Form One Interview Subjects system, refer to:
- Backend logs: Check console for detailed debug information
- Frontend console: Browser dev tools for frontend debugging
- Database: Verify PostgreSQL table structure and data integrity

---

**System Status**: ✅ **Ready for Production Use**
