# Pre-Form One Debug Logging Guide

## Overview
Comprehensive debug logging has been added to both the Pre-Form One registration and parish functionality to help identify issues with data storage. This guide explains what was implemented and how to use it.

## What Was Added

### Backend Debug Logging (`backend/routes/preFormOne.js`)

#### Single Student Registration
- Logs incoming request data, headers, and body
- Tracks validation steps and any failures
- Shows SQL queries being executed with parameters
- Records database insertion results
- Captures any errors with full stack traces

#### Bulk Student Registration  
- Logs bulk request data and student count
- Processes each student individually with detailed logging
- Shows SQL query construction and execution
- Records successful insertions and row counts
- Captures any errors during bulk operations

#### Parish Updates (Single & Bulk)
- Logs parish update requests and parameters
- Validates student existence before updates
- Shows SQL queries for finding and updating students
- Processes bulk updates individually for better debugging
- Records successful updates and any skipped records

### Frontend Debug Logging

#### PreFormOneRegistration Component
- Logs form data validation and preparation
- Tracks API calls and responses
- Shows local state updates
- Captures CSV processing steps
- Records any errors with detailed information

#### PreFormOneParishes Component  
- Logs parish assignment operations
- Tracks CSV processing for bulk parish updates
- Shows local state synchronization
- Records validation steps and API interactions

#### Service Layer (`frontend/src/services/preFormOneService.js`)
- Logs all API requests and responses
- Captures detailed error information
- Shows request parameters and response data
- Tracks network issues and server errors

## How to Use the Debug Logging

### 1. Browser Console (Frontend)
Open browser developer tools and check the console tab:
- Look for `🔍 FRONTEND DEBUG:` prefixes for frontend logs
- Look for `🔍 SERVICE DEBUG:` prefixes for service layer logs
- These will show form data, API calls, and responses

### 2. Backend Console (Server)
Check your backend server console/logs:
- Look for `🔍 DEBUG:` prefixes for backend logs
- These will show database operations, SQL queries, and server-side processing

### 3. Common Debug Scenarios

#### Student Registration Issues
1. **Frontend**: Check if form data is being prepared correctly
2. **Service**: Verify API requests are being made with proper data
3. **Backend**: Confirm SQL queries are executing and data is being inserted

#### Parish Assignment Issues  
1. **Frontend**: Verify parish data is being captured and sent
2. **Service**: Check API requests for parish updates
3. **Backend**: Confirm student existence and parish update queries

#### CSV Processing Issues
1. **Frontend**: Check CSV parsing and data extraction
2. **Backend**: Verify bulk operations and individual record processing

## Key Debug Points to Monitor

### Student Registration
- Form validation results
- Admission number generation
- Database insertion success/failure
- Local state synchronization

### Parish Updates
- Student existence verification
- Parish data validation
- Update query execution
- State synchronization

### Error Handling
- Network connectivity issues
- Database connection problems
- Data validation failures
- Permission/authentication issues

## Troubleshooting Common Issues

### Data Not Saving to Database
1. Check backend logs for SQL query execution
2. Verify database connection and table structure
3. Look for constraint violations or data type issues
4. Check transaction commit/rollback status

### Parish Assignments Not Working
1. Verify student exists in database
2. Check parish data format and validation
3. Look for bulk update processing issues
4. Confirm local state updates are working

### CSV Upload Problems
1. Check CSV parsing and header mapping
2. Verify data validation and filtering
3. Look for duplicate detection logic
4. Check bulk operation execution

## Next Steps

1. **Test Registration**: Try registering a single student and monitor all debug logs
2. **Test Bulk Registration**: Upload a CSV with multiple students
3. **Test Parish Assignment**: Assign parishes to students individually
4. **Test Bulk Parish**: Use CSV to assign parishes to multiple students
5. **Review Logs**: Analyze the debug output to identify any issues

The debug logging will help you see exactly what happens at each step of the process, making it much easier to identify where problems occur in the data flow.
