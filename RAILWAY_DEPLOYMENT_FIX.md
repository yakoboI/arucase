# Railway Deployment Fix Guide

## Issues Identified

### 1. Database Errors
- `column "permissions" does not exist` in users table
- `relation "preform_one_students" does not exist`

### 2. Container Startup Errors  
- `failed to exec pid1: No such file or directory`
- Container failing to start properly

## Solutions Implemented

### Database Fix
- Created `backend/database/fix_railway_database.sql` - Migration script
- Created `backend/scripts/fixRailwayDatabase.js` - Execution script
- Script adds missing columns and tables safely

### Container Startup Fix
- Created `backend/scripts/start-server.js` - Robust startup script
- Updated `backend/railway.json` - Improved Railway configuration
- Added proper error handling and environment setup

## Updated Files

### Railway Configuration (`backend/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install --production",
    "nixpacks": {
      "phase": {
        "build": {
          "nixPkgs": ["nodejs_18", "npm", "python3"]
        }
      }
    }
  },
  "deploy": {
    "startCommand": "node scripts/start-server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "healthcheckInterval": 30
  }
}
```

### Startup Script Features
- ✅ Validates Node.js version and environment
- ✅ Sets default environment variables
- ✅ Validates required files exist
- ✅ Comprehensive error handling
- ✅ Graceful shutdown support
- ✅ Detailed logging for debugging

## Deployment Steps

### Step 1: Deploy Code Changes
1. Push all changes to your repository
2. Railway will automatically detect changes and rebuild

### Step 2: Run Database Migration
Once deployed, run the database fix:
```bash
# In Railway console for your backend service
node scripts/fixRailwayDatabase.js
```

### Step 3: Verify Deployment
Check Railway logs for:
- ✅ Server startup messages
- ✅ Database connection success
- ✅ No more "permissions column" errors
- ✅ No more "preform_one_students" errors

## Expected Log Output

### Successful Startup
```
🚀 Starting Railway server initialization...
📊 Node.js version: v18.x.x
📊 Environment: production
📊 Working directory: /app
🔧 Environment variables configured
✅ server.js found
🔄 Loading server.js...
🚀 Server running on port 5000
📡 Environment: production
```

### Database Fix Success
```
✅ permissions column exists in users table
✅ preform_one_students table exists
✅ preformone_interview_subjects table exists
📊 preformone_interview_subjects has 8 subjects
```

## Troubleshooting

### If Container Still Fails to Start
1. Check Railway build logs for Node.js version issues
2. Verify all files are properly committed
3. Check environment variables in Railway dashboard

### If Database Errors Persist
1. Ensure PostgreSQL database is properly configured
2. Check DATABASE_URL environment variable
3. Run the database fix script manually

### If Health Checks Fail
1. Verify server responds on `/` endpoint
2. Check if PORT environment variable is set
3. Monitor health check logs in Railway

## Environment Variables Required

Ensure these are set in Railway:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - JWT signing secret (not default)
- `NODE_ENV` - Set to "production"
- `PORT` - Set to "5000" (Railway default)

## Post-Deployment Verification

1. **Health Check**: Visit your Railway URL - should return API response
2. **Authentication**: Test login functionality
3. **Pre-Form One**: Verify interview subjects and student data work
4. **Monitoring**: Check Railway logs for any remaining errors

## Next Steps

1. Deploy the fixes using the steps above
2. Monitor the deployment closely
3. Test all critical functionality
4. Set up proper monitoring/alerting for future issues

The fixes address both the immediate database schema issues and the underlying container startup problems that were causing the deployment failures.
