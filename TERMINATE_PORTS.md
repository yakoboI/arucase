# Port Termination Guide

## ⚠️ IMPORTANT: Always Terminate Ports After Testing

After completing your debugging and testing sessions, **ALWAYS** terminate the development ports to free up system resources and avoid conflicts.

## Quick Termination Commands

### Option 1: Use the Cleanup Script (Recommended)

```powershell
# Navigate to project root
cd c:\Users\Admin\Desktop\arucase456

# Run the cleanup script
.\cleanup-ports.ps1
```

### Option 2: Manual Port Termination

```powershell
# Kill all Node.js processes
taskkill /F /IM node.exe

# Kill specific ports if needed
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5000
```

### Option 3: Individual Port Termination

```powershell
# Frontend port 3001
taskkill /F /PID (Get-NetTCPConnection -LocalPort 3001).OwningProcess

# Backend port 5000
taskkill /F /PID (Get-NetTCPConnection -LocalPort 5000).OwningProcess
```

## Development Ports Used

- **Frontend**: Port 3001 (React development server)
- **Backend**: Port 5000 (Node.js/Express server)
- **Database**: Port 5432 (PostgreSQL)
- **Other common ports**: 3000, 8000, 8080

## When to Terminate Ports

### ✅ DO terminate ports when

- Finished debugging/testing session
- Taking a break from development
- Switching to other projects
- System running slowly
- Port conflicts occur
- Before shutting down computer

### ❌ DON'T leave ports running when

- Not actively developing
- Computer will be unattended
- Testing is complete
- Going to sleep/away

## Verification

After running cleanup, verify ports are free:

```powershell
# Check if ports are still in use
netstat -an | findstr :3001
netstat -an | findstr :5000

# Should return empty if successful
```

## Automation

The `cleanup-ports.ps1` script automatically:

- Kills processes on ports 3000, 3001, 5000, 8000, 8080, 5432
- Terminates all Node.js processes
- Provides feedback on what was terminated
- Handles errors gracefully

## Best Practices

1. **Always run cleanup** after testing sessions
2. **Use the script** rather than manual commands
3. **Verify cleanup** worked properly
4. **Restart servers fresh** for new sessions
5. **Keep script handy** in project root

## Reminder

**REMEMBER: TERMINATE PORTS AFTER EVERY TESTING SESSION!**

This prevents:

- Memory leaks
- Port conflicts
- System slowdown
- Background processes consuming resources
