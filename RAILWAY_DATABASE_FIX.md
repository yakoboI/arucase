# Railway Database Fix Guide

## Issue Summary
The Railway deployment was showing database errors:
1. `column "permissions" does not exist` in users table
2. `relation "preform_one_students" does not exist`

## Solution
Created database migration scripts to fix these issues.

## Files Created
- `backend/database/fix_railway_database.sql` - SQL migration script
- `backend/scripts/fixRailwayDatabase.js` - Node.js execution script

## How to Deploy the Fix

### Option 1: Railway Console (Recommended)
1. Go to your Railway project dashboard
2. Click on your backend service
3. Click on "Console" tab
4. Run the following command:
   ```bash
   node scripts/fixRailwayDatabase.js
   ```

### Option 2: Automatic Deployment
The fix will automatically run when you redeploy your backend service. The script is designed to:
- Add missing `permissions` column to users table (if not exists)
- Create `preform_one_students` table (if not exists)
- Create `preformone_interview_subjects` table (if not exists)
- Insert default interview subjects (if not exists)
- Create necessary indexes and triggers

### Option 3: Manual SQL Execution
If you prefer to run SQL directly, you can execute the contents of `backend/database/fix_railway_database.sql` in your Railway database console.

## Verification
The script includes verification steps that will check:
- ✅ permissions column exists in users table
- ✅ preform_one_students table exists
- ✅ preformone_interview_subjects table exists
- ✅ Default interview subjects are populated

## Post-Fix Status
After running the fix, your application should no longer show these database errors:
- `ERROR: column "permissions" does not exist`
- `ERROR: relation "preform_one_students" does not exist`

## Notes
- The script is idempotent - it can be run multiple times safely
- All operations use `IF NOT EXISTS` to prevent duplicate creation errors
- The fix has been tested locally and works correctly
- Railway database should now match the expected schema from `initDatabase.js`

## Next Steps
1. Deploy the fix using one of the methods above
2. Monitor your Railway logs to ensure the errors disappear
3. Test your application's authentication and preform one functionality
4. Consider setting up automatic database migrations for future deployments
