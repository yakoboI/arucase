# Arusha Catholic Seminary - Complete Node.js/React Website

Full-featured school management system built with **Node.js/Express** backend and **React** frontend, optimized for Railway deployment with PostgreSQL.

## 🚀 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Railway)
- **Authentication**: JWT
- **Real-time**: Socket.IO
- **File Upload**: Multer
- **PDF Generation**: PDFKit

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: React Query + Context API
- **Routing**: React Router v6
- **Styling**: CSS Modules
- **Image Loading**: Lazy Loading
- **Tables**: Custom DataTable Component

## ✨ Features

### ✅ Full Functionality
- **User Management**: Complete CRUD operations
- **Student Management**: Registration, photos, scores, reports
- **Admin Dashboard**: Comprehensive admin panel
- **Public Website**: Homepage, announcements, events, gallery
- **Reports**: Individual and bulk reports with PDF/CSV export
- **Analytics**: Student performance tracking
- **File Uploads**: Photos, documents
- **Real-time Updates**: Socket.IO integration

### 🎨 Quality Tables
- **Sorting**: Multi-column sorting
- **Filtering**: Search and filter capabilities
- **Pagination**: Efficient pagination
- **Export**: CSV, Excel, PDF export
- **Responsive**: Mobile-friendly design
- **Performance**: Optimized for large datasets

### ⚡ Speed Optimizations
- **React Query**: Automatic caching and background updates
- **Code Splitting**: Lazy loading of routes and components
- **Image Optimization**: Lazy loading and WebP support
- **Debouncing**: Search input debouncing
- **Memoization**: Component memoization
- **Connection Pooling**: Database connection pooling

### 📥 Download Features
- **PDF Reports**: Individual and bulk student reports
- **CSV Export**: Data export to CSV
- **Excel Export**: Data export to Excel
- **File Downloads**: Direct file downloads

## 📁 Project Structure

```
├── backend/                 # Node.js/Express Backend
│   ├── config/            # Configuration
│   ├── migrations/        # Versioned PostgreSQL migrations (node-pg-migrate)
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   ├── server.js          # Main entry point
│   └── package.json       # Dependencies
│
├── docs/                   # Technical documentation
│   └── database-evaluation.md
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Utility functions
│   │   └── styles/       # CSS files
│   └── package.json      # Dependencies
│
└── README.md              # This file
```

## 🚂 Railway Deployment

### Prerequisites
- Railway account
- PostgreSQL database on Railway
- GitHub repository

### Deployment Steps

1. **Create PostgreSQL Database**
   - Railway Dashboard → "+ New" → "Database" → "Add PostgreSQL"
   - Railway automatically provides connection credentials

2. **Deploy Backend**
   - Create new service → Connect GitHub repo
   - Set root directory to `backend`
   - Railway auto-detects Node.js
   - Environment variables are auto-set for PostgreSQL

3. **Deploy Frontend**
   - Create new service → Connect GitHub repo
   - Set root directory to `frontend`
   - Set environment variable: `VITE_API_URL=https://your-backend.railway.app`

4. **Configure Domain**
   - Add custom domain in Railway
   - SSL is automatic

## 🛠️ Development

### ⚡ Quick Start

**👉 See `START_HERE.md` or `RUN_INITIALIZATION.md` for complete step-by-step instructions!**

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev  # Uses nodemon for auto-reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
npm run dev  # Starts Vite dev server on port 3000
```

### Initialize Database
```bash
# From project root
node backend/scripts/initDatabase.js    # Create all tables
node backend/scripts/createAdmin.js     # Create admin user

# Or use npm scripts (from backend directory)
cd backend
npm run init-db        # Initialize database
npm run create-admin   # Create admin user
npm run db:migrate     # Apply versioned SQL migrations (see docs/database-evaluation.md)
```

Database evaluation and migration conventions: **[docs/database-evaluation.md](docs/database-evaluation.md)**.

## 📊 Performance

- **Page Load**: < 2 seconds
- **API Response**: < 300ms (cached)
- **PDF Generation**: 2-5 seconds (cached)
- **Table Rendering**: Handles 1000+ rows efficiently
- **Image Loading**: Lazy loaded, optimized

## 🔒 Security

- JWT authentication
- Password hashing (bcrypt)
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention

## 📝 API Documentation

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Public
- `GET /api/public/homepage` - Homepage data
- `GET /api/public/announcements` - Get announcements
- `GET /api/public/events` - Get events
- `GET /api/public/gallery` - Get gallery photos

### Admin (Protected)
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Students (Protected)
- `GET /api/students` - Get students
- `POST /api/students` - Create student
- `GET /api/students/:admNo` - Get student
- `PUT /api/students/:admNo` - Update student
- `DELETE /api/students/:admNo` - Delete student

### Reports (Protected)
- `GET /api/reports/individual/:form/:stream/:year/:term/:admNo` - Get report
- `GET /api/reports/individual/:form/:stream/:year/:term/:admNo/pdf` - Download PDF
- `GET /api/reports/individual/:form/:stream/:year/:term/:admNo/csv` - Download CSV

## 🎯 Key Features Implemented

✅ Complete Node.js/Express backend  
✅ Full React frontend with routing  
✅ High-quality DataTable component  
✅ PDF generation for reports  
✅ CSV/Excel export  
✅ File upload functionality  
✅ Real-time updates (Socket.IO)  
✅ Authentication & authorization  
✅ Speed optimizations  
✅ Responsive design  
✅ Railway deployment ready  

## 📦 Dependencies

### Backend
- express, cors, pg, bcryptjs, jsonwebtoken
- socket.io, multer, pdfkit
- helmet, compression, express-rate-limit

### Frontend
- react, react-router-dom, axios
- @tanstack/react-query
- react-lazy-load-image-component
- react-toastify, xlsx

## 📞 Support

For issues or questions, please check the documentation or contact the development team.

---

**Built with ❤️ for Arusha Catholic Seminary**

