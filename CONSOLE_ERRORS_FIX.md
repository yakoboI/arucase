# 🔧 Fixing Console Errors

## Issue 1: React DevTools Extension Errors (Harmless)

**Error**: `Uncaught Error: Attempting to use a disconnected port object` from `proxy.js`

**Cause**: React DevTools browser extension trying to communicate with a disconnected port. This is a known issue with browser extensions and doesn't affect your app.

**Solutions**:

### Option 1: Ignore Them (Recommended)
These errors are harmless and don't affect functionality. You can safely ignore them.

### Option 2: Disable React DevTools Extension
1. Open Chrome/Edge Extensions: `chrome://extensions/` or `edge://extensions/`
2. Find "React Developer Tools"
3. Toggle it off temporarily

### Option 3: Filter Console Errors (Browser)
In Chrome DevTools:
1. Open Console
2. Click the filter icon (funnel)
3. Add filter: `-proxy.js` to hide these errors

### Option 4: Suppress in Code (Not Recommended)
You can suppress these in your code, but it's not recommended as they're harmless.

---

## Issue 2: 401 Unauthorized Error (Real Issue)

**Error**: `GET http://localhost:3001/api/students/subjects/list?level=FORM+I&stream=A&year=2025 401 (Unauthorized)`

**Cause**: Your authentication token is missing, expired, or invalid.

**Solutions**:

### Solution 1: Log In
1. Navigate to `/login` page
2. Enter your credentials
3. The app will store the token and you'll be authenticated

### Solution 2: Check Token in Browser
1. Open DevTools → Application/Storage → Local Storage
2. Check if `token` exists
3. If missing or expired, log in again

### Solution 3: Clear Storage and Re-login
If token is corrupted:
```javascript
// Run in browser console:
localStorage.clear();
// Then navigate to /login
```

### Solution 4: Check Backend Authentication
Make sure your backend is running and accepting requests:
- Backend should be running on `http://localhost:5000` (or your configured port)
- Check backend logs for authentication errors
- Verify `JWT_SECRET_KEY` is set correctly

---

## Quick Fix Checklist

- [ ] **Log in** to your application
- [ ] Verify token exists in `localStorage.getItem('token')`
- [ ] Check backend is running and accessible
- [ ] Verify backend `JWT_SECRET_KEY` is set
- [ ] Ignore `proxy.js` errors (they're harmless)

---

## Testing Authentication

Run this in browser console to check your auth status:

```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token') ? 'Exists' : 'Missing');

// Check user
console.log('User:', localStorage.getItem('user'));

// Test API call
fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## If Errors Persist

1. **Clear browser cache and localStorage**
2. **Restart backend server**
3. **Check backend logs** for authentication errors
4. **Verify environment variables** are set correctly
5. **Check CORS configuration** if frontend and backend are on different ports
