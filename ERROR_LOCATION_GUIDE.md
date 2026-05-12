# Arucase Error Location Guide

> **Purpose:** This document maps all 20 identified errors to their exact locations in the codebase — file paths, line numbers, and code snippets — so developers can fix them systematically.
>
> **How to use:** Each entry includes the exact file(s) to open, the specific lines to look at, the problematic code as it exists today, the user-facing impact, and the recommended fix location.

---

## Table of Contents

1. [Authentication Token Expiration](#1-authentication-token-expiration)
2. [No Error Boundaries on Individual Routes](#2-no-error-boundaries-on-individual-routes)
3. [No Loading States on Form Submissions](#3-no-loading-states-on-form-submissions)
4. [No Input Validation on Forms](#4-no-input-validation-on-forms)
5. [No Retry Logic for Failed Requests](#5-no-retry-logic-for-failed-requests)
6. [Token Refresh Only Reactive, Not Proactive](#6-token-refresh-only-reactive-not-proactive)
7. [Offline Detection Not Surfaced](#7-offline-detection-not-surfaced)
8. [File Upload Validation Missing on Authority Page](#8-file-upload-validation-missing-on-authority-page)
9. [No Field-Level Form Validation Feedback](#9-no-field-level-form-validation-feedback)
10. [Duplicate Submissions Possible on Some Forms](#10-duplicate-submissions-possible-on-some-forms)
11. [Slow Queries — No Pagination on Student List](#11-slow-queries--no-pagination-on-student-list)
12. [Missing Images Return Placeholder Only for /static/uploads](#12-missing-images-return-placeholder-only-for-staticuploads)
13. [No CSRF Protection](#13-no-csrf-protection)
14. [Hardcoded API URL Fallback](#14-hardcoded-api-url-fallback)
15. [No Error Tracking Service](#15-no-error-tracking-service)
16. [Race Conditions — No Optimistic Locking](#16-race-conditions--no-optimistic-locking)
17. [No Audit Logging for Admin Actions](#17-no-audit-logging-for-admin-actions)
18. [Missing Pagination on Student Queries](#18-missing-pagination-on-student-queries)
19. [No HTTP Caching in Development](#19-no-http-caching-in-development)
20. [No Schema Validation on CSV Bulk Imports](#20-no-schema-validation-on-csv-bulk-imports)

---

## 1. Authentication Token Expiration

**Description:** When the 15-minute access token expires, the user receives no warning. The app only attempts a refresh *after* a 401 error is returned by the server — there is no proactive timer that refreshes the token before it expires. If the refresh also fails, the user is silently logged out mid-action.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/context/AuthContext.jsx` | 1–80 | Manages auth state; no expiration timer set |
| `frontend/src/services/api.js` | 107–155 | Response interceptor; refresh triggered only on 401 |
| `backend/routes/auth-refresh.js` | 47–52 | Access token is issued with `expiresIn: '15m'` |
| `backend/middleware/auth.js` | 37–43 | Returns `401 { message: 'Token expired' }` on expiry |

### Code Showing the Problem

**`frontend/src/context/AuthContext.jsx` — lines 15–17 (no timer set up):**
```jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // ❌ No token expiration timer is ever created here.
  // The 15-minute access token will expire silently.
```

**`frontend/src/services/api.js` — lines 107–130 (reactive-only refresh):**
```js
// Handle 401 errors with automatic token refresh
if (error.response?.status === 401) {
  // ...
  if (isTokenExpired && !error.config._retry) {
    error.config._retry = true;
    try {
      const refreshResponse = await api.post('/auth/refresh');
      // ❌ Refresh only happens AFTER a 401 is received.
      // By this point the user's action has already failed.
      if (refreshResponse.data.message === 'Token refreshed successfully') {
        return api.request(error.config);
      }
    } catch (refreshError) { ... }
  }
}
```

**`backend/routes/auth-refresh.js` — lines 47–52 (15-minute token):**
```js
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { user_id: user.username, role: user.role, permissions: user.permissions || {} },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '15m' }  // ← token lifetime
  );
```

**`backend/middleware/auth.js` — lines 37–43 (expiry error):**
```js
const decoded = jwt.verify(token, JWT_SECRET);
// ...
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }
```

### Impact on Users
Users are silently logged out mid-session (e.g. while filling a long form or generating a PDF report) with no warning. Any unsaved work is lost.

### Suggested Fix Location
- **`frontend/src/context/AuthContext.jsx`** — After a successful login, decode the JWT expiry (`exp` claim) and set a `setTimeout` to call `/auth/refresh` 5 minutes before expiry. Clear the timer on logout.
- **`frontend/src/services/api.js`** — The reactive refresh (lines 107–130) can remain as a safety net but should not be the primary mechanism.

---

## 2. No Error Boundaries on Individual Routes

**Description:** `ErrorBoundary` exists and is well-implemented, but it only wraps the entire application as a single boundary. If one lazy-loaded route component crashes, the entire app unmounts and shows the error screen. Individual routes are not independently protected.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/components/common/ErrorBoundary.jsx` | 1–97 | Full implementation — exists and works |
| `frontend/src/App.jsx` | 183–186 | Single top-level `<ErrorBoundary>` wrapping everything |

### Code Showing the Problem

**`frontend/src/App.jsx` — lines 183–186 (single boundary):**
```jsx
function App() {
  return (
    <ErrorBoundary>          {/* ← one boundary for the entire app */}
      <AuthProvider>
        ...
        <Suspense fallback={<Loading minimal message="" />}>
          <DeferredRoutes>
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            {/* ❌ No per-route ErrorBoundary. A crash in AdminDashboard
                takes down every other route too. */}
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            ...
          </DeferredRoutes>
        </Suspense>
```

**`frontend/src/components/common/ErrorBoundary.jsx` — lines 8–11 (component is ready to use):**
```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  // ✅ Component is complete and functional — just needs to be used per-route.
```

### Impact on Users
A JavaScript error in any single page (e.g. a null-reference in the Score Entry page) crashes the entire admin panel, forcing a full page reload and losing navigation state.

### Suggested Fix Location
- **`frontend/src/App.jsx`** — Wrap each `<ProtectedRoute>` element (or each lazy-loaded component) in its own `<ErrorBoundary>`. Example:
  ```jsx
  <Route
    path="/admin"
    element={
      <ProtectedRoute>
        <ErrorBoundary>
          <AdminDashboard />
        </ErrorBoundary>
      </ProtectedRoute>
    }
  />
  ```

---

## 3. No Loading States on Form Submissions

**Description:** Several form submission handlers do not disable their submit buttons during the API call. This allows users to click "Save" multiple times before the first request completes. Note: some pages (Announcements, Administrators, SchoolBranding) already use `useMutation.isPending` correctly — the problem is inconsistent across the codebase.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/pages/admin/Announcements.jsx` | 232–235 | ✅ Already uses `disabled={saveMutation.isPending}` |
| `frontend/src/pages/admin/SchoolBranding.jsx` | 280–290 | ✅ Already uses `disabled={saveTextBrandingMutation.isPending}` |
| `frontend/src/pages/admin/Administrators.jsx` | 120–135 | ✅ `saveMutation.mutate()` called from `handleSubmit` — button state needs verification |
| `frontend/src/pages/academic/ScoreEntryEnter.jsx` | All | ⚠️ Needs audit — score entry is high-risk for duplicates |
| `frontend/src/pages/admin/PreFormOneScoreEntry.jsx` | All | ⚠️ Needs audit |
| `frontend/src/pages/students/RegistrationForm.jsx` | All | ⚠️ Needs audit |

### Code Showing the Problem

**`frontend/src/pages/admin/Announcements.jsx` — lines 232–235 (correct pattern to follow):**
```jsx
<button type="submit" className="excel-btn primary" disabled={saveMutation.isPending}>
  <i className="fas fa-save" />{' '}
  {saveMutation.isPending ? 'Saving...' : mode === 'add' ? 'Publish Announcement' : 'Update Announcement'}
</button>
```
Pages that do **not** follow this pattern leave their submit buttons enabled during the API call.

### Impact on Users
Double-clicking a save button can create duplicate database records (duplicate students, duplicate scores, duplicate announcements). This is especially harmful in score entry where a student could receive two score records for the same subject/month.

### Suggested Fix Location
- **All form pages** — Audit every `<button type="submit">` or `onClick` handler that triggers an API call. Add `disabled={mutation.isPending}` and a loading indicator. The `Announcements.jsx` pattern (lines 232–235) is the correct reference implementation.

---

## 4. No Input Validation on Forms

**Description:** Several forms perform only minimal client-side validation (checking that required fields are non-empty) but do not validate data types, ranges, or formats. The backend has a `validation.js` middleware with comprehensive rules, but it is only applied to a subset of routes.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/pages/admin/Administrators.jsx` | 122–127 | Only checks `name.trim()` and `title.trim()` |
| `frontend/src/pages/admin/Announcements.jsx` | 128–132 | Only checks title, content, and date are non-empty |
| `frontend/src/pages/admin/SchoolBranding.jsx` | 196–199 | Only checks `schoolName.trim()` |
| `backend/middleware/validation.js` | 1–163 | Full validation rules exist but are not applied to all routes |
| `backend/routes/admin.js` | 1060–1075 | `POST /school-branding` validates `school_name` but not tagline length |
| `backend/routes/students.js` | 320–330 | `GET /` accepts any `level`, `stream`, `year` without strict validation |

### Code Showing the Problem

**`frontend/src/pages/admin/Administrators.jsx` — lines 122–127 (minimal validation):**
```jsx
const handleSubmit = (e) => {
  e.preventDefault();
  if (!formData.name.trim() || !formData.title.trim()) {
    toast.error('Name and title are required');
    return;
    // ❌ No validation of: year_started range (e.g. 1800 or 9999),
    //    display_order being a valid integer, name length limits.
  }
  saveMutation.mutate({ ...formData, id: editingAdmin?.id, photo: selectedPhoto });
};
```

**`frontend/src/pages/admin/Announcements.jsx` — lines 128–132:**
```jsx
const handleSubmit = (e) => {
  e.preventDefault();
  if (!formData.title.trim() || !formData.content.trim() || !formData.date) {
    toast.error('Title, content, and date are required');
    return;
    // ❌ No validation of: date being in the future/past, content length,
    //    title length, priority being a valid enum value.
  }
  saveMutation.mutate();
};
```

**`backend/middleware/validation.js` — lines 23–100 (rules exist but underused):**
```js
const validationRules = {
  username: () => body('username').trim().notEmpty()...
  password: () => body('password').notEmpty()...
  email: () => body('email').trim().isEmail()...
  year: (source) => ... .isInt({ min: 2000, max: 2100 })...
  score: () => body('score').isFloat({ min: 0, max: 100 })...
  // ✅ Rules exist — they just aren't applied to admin CRUD routes.
};
```

### Impact on Users
Administrators can save records with invalid data (e.g. `year_started: -1`, announcement dates in wrong format, empty school names bypassing the trim check). This corrupts the database and causes display errors on the public site.

### Suggested Fix Location
- **`frontend/src/pages/admin/Administrators.jsx`** — Add validation for `year_started` (must be a 4-digit year between 1900 and current year), `display_order` (must be a non-negative integer).
- **`frontend/src/pages/admin/Announcements.jsx`** — Add validation for title length (max 255 chars), content length (max 5000 chars).
- **`backend/routes/admin.js`** — Apply `validators` from `backend/middleware/validation.js` to `POST /administrators`, `POST /announcements`, and other CRUD endpoints.

---

## 5. No Retry Logic for Failed Requests

**Description:** The Axios instance in `api.js` has no automatic retry logic for transient network failures (e.g. a momentary connection drop, a 503 from the server). React Query in `main.jsx` has retry configured, but the raw `api.js` interceptor does not retry on network errors.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/services/api.js` | 75–209 | Axios instance — no retry interceptor |
| `frontend/src/main.jsx` | 55–75 | React Query retry config (partial coverage) |

### Code Showing the Problem

**`frontend/src/services/api.js` — lines 75–80 (no retry on network error):**
```js
// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // ❌ No retry logic here. A network timeout or 503 immediately
    //    rejects the promise and shows an error to the user.
    // The only special handling is for 401 (token refresh) and 429 (rate limit).
```

**`frontend/src/main.jsx` — lines 55–75 (React Query retry — only covers useQuery/useMutation):**
```js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.response?.status === 401 || error?.response?.status === 404) {
          return false;
        }
        const maxRetries = networkInfo.isSlow ? 1 : 2;
        return failureCount < maxRetries;
        // ✅ React Query retries — but only for hooks (useQuery/useMutation).
        // Direct api.get() / api.post() calls outside hooks get no retry.
      },
```

### Impact on Users
On Tanzania's 3G/4G networks, transient connection drops are common. A single failed API call (e.g. saving a score) shows an error immediately with no retry attempt, forcing the user to manually retry.

### Suggested Fix Location
- **`frontend/src/services/api.js`** — Add a response interceptor that retries on network errors (`!error.response`) and 503 responses, with exponential backoff (e.g. 1s, 2s, 4s), up to 3 attempts. Skip retry for 4xx errors (client errors that won't change on retry).

---

## 6. Token Refresh Only Reactive, Not Proactive

**Description:** This is closely related to Error #1 but specifically concerns the refresh mechanism. The `/auth/refresh` endpoint and the `refreshToken` cookie are fully implemented and working. The gap is that the frontend never calls refresh proactively — it only calls it after a request has already failed with a 401.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/services/api.js` | 107–145 | Refresh triggered only inside the 401 error handler |
| `backend/routes/auth-refresh.js` | 140–200 | `POST /auth/refresh` endpoint — fully implemented |
| `backend/routes/auth-refresh.js` | 47–52 | Access token expires in 15 minutes |

### Code Showing the Problem

**`frontend/src/services/api.js` — lines 107–130 (refresh is reactive):**
```js
if (error.response?.status === 401) {
  const errorMessage = error.response?.data?.message || 'Authentication required';
  const isTokenExpired = errorMessage.toLowerCase().includes('expired') || ...

  if (isTokenExpired && !error.config._retry) {
    error.config._retry = true;
    try {
      const refreshResponse = await api.post('/auth/refresh');
      // ❌ This only runs AFTER a request has already received a 401.
      // The user's original request (e.g. saving a score) has already failed.
      // The retry (line below) re-sends it, but the user sees a delay.
      if (refreshResponse.data.message === 'Token refreshed successfully') {
        return api.request(error.config);
      }
```

**`backend/routes/auth-refresh.js` — lines 140–200 (endpoint is ready):**
```js
router.post('/refresh', async (req, res) => {
  // ✅ Endpoint fully implemented: validates refreshToken cookie,
  //    issues new accessToken cookie, returns { message: 'Token refreshed successfully' }
  // It just needs to be called proactively from the frontend.
```

### Impact on Users
Every 15 minutes, the next API call the user makes will fail with a 401, then silently retry after refresh. This causes a noticeable 1–3 second delay on the first request after token expiry. In slow network conditions, the retry may also fail.

### Suggested Fix Location
- **`frontend/src/context/AuthContext.jsx`** — On login success, read the `expiresIn` value from the login response (currently returned as `expiresIn: 15 * 60` in `auth-refresh.js` line 136). Set a `setTimeout` to call `api.post('/auth/refresh')` at `(expiresIn - 300) * 1000` ms (5 minutes before expiry). Reset the timer after each successful refresh.

---

## 7. Offline Detection Not Surfaced

**Description:** `NetworkStatusBanner` is fully implemented with online/offline event listeners and a slow-network detector. It is mounted in `App.jsx`. However, the banner uses a blinking animation (`setInterval` toggling `visible` every 2 seconds) which means it is invisible 50% of the time. On a slow network, users may miss the warning entirely.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/components/common/NetworkStatusBanner.jsx` | 1–78 | Full implementation — online/offline detection works |
| `frontend/src/App.jsx` | 196 | `<NetworkStatusBanner />` is mounted |
| `frontend/src/components/common/NetworkStatusBanner.jsx` | 43–51 | Blinking timer that hides the banner every 2 seconds |

### Code Showing the Problem

**`frontend/src/components/common/NetworkStatusBanner.jsx` — lines 43–51 (blinking hides the banner):**
```jsx
useEffect(() => {
  if (!status) {
    setVisible(true);
    return undefined;
  }
  setVisible(true);
  const timer = setInterval(() => {
    setVisible((prev) => !prev);  // ❌ Toggles visibility every 2 seconds.
  }, 2000);                        //    Banner is invisible half the time.
  return () => clearInterval(timer);
}, [status]);
```

**`frontend/src/components/common/NetworkStatusBanner.jsx` — lines 53–54 (hidden when not visible):**
```jsx
if (!status || !visible) return null;  // ❌ Returns null when !visible (every other 2s interval)
```

**`frontend/src/App.jsx` — line 196 (correctly mounted):**
```jsx
<NetworkStatusBanner />  {/* ✅ Mounted in the right place */}
```

### Impact on Users
When a user goes offline, the warning banner blinks on and off. A user who glances at the screen during the "off" phase sees no indication they are offline and may continue trying to submit forms, losing data.

### Suggested Fix Location
- **`frontend/src/components/common/NetworkStatusBanner.jsx`** — Remove the blinking `setInterval` (lines 43–51). Keep the banner permanently visible when `status` is `'offline'` or `'slow'`. A CSS pulse animation on the icon is sufficient to draw attention without hiding the text.

---

## 8. File Upload Validation Missing on Authority Page

**Description:** `Logo.jsx` and `Stamp.jsx` both validate file type and size before uploading. `Authority.jsx` validates file type but **does not validate file size** before calling `uploadSignatureMutation.mutate(file)`. The backend enforces a 5MB limit via multer, but the user gets no client-side feedback.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/pages/admin/Logo.jsx` | 50–60 | ✅ Validates type AND size (5MB) |
| `frontend/src/pages/admin/Stamp.jsx` | 50–60 | ✅ Validates type AND size (5MB) |
| `frontend/src/pages/admin/Authority.jsx` | 101–110 | ⚠️ Validates type but NOT size |
| `backend/routes/admin.js` | 430–445 | Backend enforces 5MB via multer `fileSize` limit |

### Code Showing the Problem

**`frontend/src/pages/admin/Authority.jsx` — lines 101–110 (missing size check):**
```jsx
const handleFileSelect = (file) => {
  if (!file) return;

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    toast.error('Invalid file type. Please upload PNG, JPG, JPEG, GIF, or WEBP');
    return;
  }
  // ❌ No file size check here. A 50MB file will be sent to the server
  //    and rejected by multer with a generic error message.

  uploadSignatureMutation.mutate(file);
};
```

**`frontend/src/pages/admin/Logo.jsx` — lines 50–60 (correct pattern):**
```jsx
const handleFileSelect = (file) => {
  if (!file) return;
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    toast.error('Invalid file type. Please upload PNG, JPG, JPEG, or WEBP');
    return;
  }
  // ✅ Size check present:
  if (file.size > 5 * 1024 * 1024) {
    toast.error('File size too large. Maximum size is 5MB');
    return;
  }
  uploadMutation.mutate(file);
};
```

### Impact on Users
Uploading a large signature image on a slow connection wastes bandwidth and time before receiving a server-side error. The error message from multer (`Upload error: File too large`) is less user-friendly than the client-side toast.

### Suggested Fix Location
- **`frontend/src/pages/admin/Authority.jsx`** — Add the file size check (lines 56–59 from `Logo.jsx`) between the type check and the `uploadSignatureMutation.mutate(file)` call.

---

## 9. No Field-Level Form Validation Feedback

**Description:** When form validation fails, all pages show a single toast notification (e.g. "Name and title are required"). There is no inline highlighting of which specific field failed, no red border, and no field-level error message below the input. This is a UX gap across all admin forms.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/pages/admin/Administrators.jsx` | 122–127 | Single toast on validation failure |
| `frontend/src/pages/admin/Announcements.jsx` | 128–132 | Single toast on validation failure |
| `frontend/src/pages/admin/SchoolBranding.jsx` | 196–199 | Single toast on validation failure |
| `frontend/src/pages/students/RegistrationForm.jsx` | All | Needs audit for field-level errors |

### Code Showing the Problem

**`frontend/src/pages/admin/Administrators.jsx` — lines 122–127:**
```jsx
const handleSubmit = (e) => {
  e.preventDefault();
  if (!formData.name.trim() || !formData.title.trim()) {
    toast.error('Name and title are required');
    // ❌ User sees a toast but doesn't know which field is invalid.
    //    Both "Name" and "Title" inputs look identical — no red border,
    //    no inline error message.
    return;
  }
```

**`frontend/src/pages/admin/Announcements.jsx` — lines 128–132:**
```jsx
const handleSubmit = (e) => {
  e.preventDefault();
  if (!formData.title.trim() || !formData.content.trim() || !formData.date) {
    toast.error('Title, content, and date are required');
    // ❌ Same pattern — no field-level feedback.
    return;
  }
```

### Impact on Users
Users with multiple empty fields must guess which field caused the error. This is especially confusing on long forms (e.g. student registration) where many fields are required.

### Suggested Fix Location
- **All form pages** — Introduce a `formErrors` state object (e.g. `{ name: 'Name is required', title: '' }`). Populate it during validation and render error messages below each input. Add a CSS class (e.g. `input--error`) to highlight invalid fields with a red border. The `backend/middleware/validation.js` already returns field-level errors in the format `{ field, message }` — use these for server-side validation feedback too.

---

## 10. Duplicate Submissions Possible on Some Forms

**Description:** This is the intersection of Error #3 and the specific risk of data duplication. Pages that use `useMutation` from React Query and correctly set `disabled={mutation.isPending}` are protected. Pages that use raw `api.post()` calls inside `onClick` handlers without a loading state guard are vulnerable.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/pages/admin/Announcements.jsx` | 232–235 | ✅ Protected — `disabled={saveMutation.isPending}` |
| `frontend/src/pages/admin/Administrators.jsx` | 122–135 | ✅ Uses `saveMutation.mutate()` — verify button has `disabled` |
| `frontend/src/pages/academic/ScoreEntryEnter.jsx` | All | ⚠️ High-risk — score entry must be audited |
| `frontend/src/pages/admin/PreFormOneScoreEntry.jsx` | All | ⚠️ High-risk — score entry must be audited |
| `frontend/src/pages/students/RegistrationForm.jsx` | All | ⚠️ High-risk — student registration must be audited |

### Code Showing the Problem

**`frontend/src/pages/admin/Announcements.jsx` — lines 232–235 (correct pattern):**
```jsx
<button type="submit" className="excel-btn primary" disabled={saveMutation.isPending}>
  {saveMutation.isPending ? 'Saving...' : 'Publish Announcement'}
</button>
// ✅ Button is disabled during submission — no duplicate possible.
```

Pages that do **not** follow this pattern allow the user to click the button multiple times before the first request completes, sending multiple identical POST requests to the backend.

### Impact on Users
Duplicate student registrations, duplicate score entries, or duplicate announcements can be created. Cleaning up duplicate database records requires manual admin intervention.

### Suggested Fix Location
- **`frontend/src/pages/academic/ScoreEntryEnter.jsx`** and **`frontend/src/pages/admin/PreFormOneScoreEntry.jsx`** — Audit all submit handlers. Ensure every mutation-triggering button has `disabled={mutation.isPending}` or a local `isSubmitting` state guard.
- **`frontend/src/pages/students/RegistrationForm.jsx`** — Same audit required.

---

## 11. Slow Queries — No Pagination on Student List

**Description:** The main student list endpoint (`GET /api/students/`) applies a hard `LIMIT` of 500 (configurable up to 2000) but has no `OFFSET`-based pagination. The frontend requests all students at once. There are no database indexes on the most-queried columns (`level`, `stream`, `year`).

### Files

| File | Lines | Role |
|------|-------|------|
| `backend/routes/students.js` | 320–415 | `GET /` — applies LIMIT but no OFFSET/pagination |
| `backend/routes/students.js` | 395–400 | Hard limit of 500 (max 2000) with no page parameter |
| `backend/config/database.js` | 1–130 | No index creation for students table |

### Code Showing the Problem

**`backend/routes/students.js` — lines 393–400 (limit without pagination):**
```js
// Limit per request for fast loading (default 500; allow up to 2000 for large classes)
const requestedLimit = parseInt(req.query.limit, 10);
const maxStudents = Math.min(isNaN(requestedLimit) ? 500 : requestedLimit, 2000);
queryText += ` LIMIT ${maxStudents}`;
// ❌ No OFFSET. No `page` parameter. No `total` count returned.
// The frontend cannot implement pagination — it always gets the first N records.

const result = await query(queryText, params);
res.json({ students: result.rows || [] });
// ❌ Response doesn't include { total, page, limit } metadata.
```

**`backend/config/database.js` — lines 24–37 (no student indexes):**
```js
const pool = new Pool({
  host: process.env.PGHOST || ...,
  // ...
});
// ❌ No CREATE INDEX statements for the students table.
// Queries filtering by level + stream + year do a full table scan.
// With 500+ students, this becomes slow (>100ms per query).
```

### Impact on Users
As the student database grows, the student list page becomes progressively slower. With 1000+ students across multiple years, queries can take several seconds on Railway's shared PostgreSQL instance.

### Suggested Fix Location
- **`backend/routes/students.js`** — Add `page` and `limit` query parameters. Return `{ students, total, page, limit }`. Add `OFFSET (page - 1) * limit` to the query.
- **`backend/config/database.js`** or a new migration file — Add indexes:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_students_level_stream_year ON students(level, stream, year);
  CREATE INDEX IF NOT EXISTS idx_students_year ON students(year);
  CREATE INDEX IF NOT EXISTS idx_students_adm_no ON students(adm_no);
  ```

---

## 12. Missing Images Return Placeholder Only for /static/uploads

**Description:** The server correctly serves a placeholder SVG for missing files under `/static/uploads`. However, this middleware only covers the `/static/uploads` path. Images served from other paths (e.g. direct `/static/` references, or Cloudinary URLs that have been deleted from Cloudinary) return a 404 or a broken image icon.

### Files

| File | Lines | Role |
|------|-------|------|
| `backend/server.js` | 44–48 | `PLACEHOLDER_IMAGE` SVG defined |
| `backend/server.js` | 248–305 | `/static/uploads` middleware — serves placeholder on missing file |
| `backend/server.js` | 307–316 | `/static` static file middleware — no placeholder fallback |

### Code Showing the Problem

**`backend/server.js` — lines 248–307 (placeholder only for /static/uploads):**
```js
// Serve uploads: if file exists send it, otherwise send placeholder
app.use('/static/uploads', (req, res, next) => {
  if (req.method !== 'GET') return next();
  const relativePath = req.path.replace(/^\//, '');
  const filePath = path.join(__dirname, 'static', 'uploads', relativePath);
  if (fs.existsSync(filePath)) {
    // ... serve the file with ETag/Last-Modified
    return res.sendFile(filePath);
  }
  // ✅ Placeholder served for /static/uploads missing files:
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.send(PLACEHOLDER_IMAGE);
});

// Serve other static files — NO placeholder fallback:
app.use('/static', express.static(path.join(__dirname, 'static'), {
  maxAge: staticMaxAge * 1000,
  // ❌ express.static returns 404 for missing files outside /uploads.
  //    No fallback to PLACEHOLDER_IMAGE.
}));
```

**`backend/server.js` — lines 44–48 (placeholder SVG):**
```js
const PLACEHOLDER_IMAGE = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" ...>...</svg>',
  'utf8'
);
// ✅ Placeholder exists — just needs to be used more broadly.
```

### Impact on Users
Deleted or missing images outside the `/uploads` subdirectory show as broken image icons (the browser's default 404 image error). This affects the public-facing school website (staff photos, gallery images) and looks unprofessional.

### Suggested Fix Location
- **`backend/server.js`** — Move the `/static/uploads` middleware to cover all of `/static`, or add a 404 handler specifically for image requests that returns `PLACEHOLDER_IMAGE` when the file extension is an image type.

---

## 13. No CSRF Protection

**Description:** The Express server has no CSRF middleware. State-changing requests (POST, PUT, DELETE) rely entirely on JWT/cookie authentication. Since the app uses `httpOnly` cookies with `sameSite: 'lax'`, the CSRF risk is partially mitigated for cross-origin requests, but same-site CSRF attacks (e.g. from a malicious page on the same domain) are not prevented.

### Files

| File | Lines | Role |
|------|-------|------|
| `backend/server.js` | 220–240 | Middleware stack — no CSRF middleware present |
| `backend/routes/auth-refresh.js` | 120–135 | Cookies set with `sameSite: 'lax'` (partial mitigation) |
| `backend/middleware/csrf.js` | — | **Does not exist** |

### Code Showing the Problem

**`backend/server.js` — lines 220–240 (middleware stack, no CSRF):**
```js
app.use(securityHeaders);
app.use(customSecurityHeaders);
app.use(securityMonitor);
app.use(globalApiRateLimit);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cookieParser());
app.use(cors({ ... }));
app.use(express.json({ limit: '1mb' }));
// ❌ No CSRF middleware in this stack.
// No csrf token generation, no csrf token validation.
```

**`backend/routes/auth-refresh.js` — lines 120–135 (sameSite: 'lax' is partial mitigation):**
```js
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',   // ← Prevents cross-origin CSRF but not same-site CSRF
  maxAge: 15 * 60 * 1000
});
```

### Impact on Users
A malicious page on the same domain (or a subdomain, depending on cookie scope) could make authenticated requests on behalf of a logged-in admin. This is a security vulnerability, not a UX issue.

### Suggested Fix Location
- **`backend/server.js`** — Install `csurf` or `csrf-csrf` npm package. Add CSRF middleware after `cookieParser()`. Generate a CSRF token on `GET /api/auth/csrf-token` and require it as a header (`X-CSRF-Token`) on all state-changing requests.
- **`frontend/src/services/api.js`** — Fetch the CSRF token on app load and attach it to all non-GET requests via a request interceptor.

---

## 14. Hardcoded API URL Fallback

**Description:** The production API URL is hardcoded as a fallback string in `api.js`. If `VITE_API_URL` is not set in the environment, the app silently uses the hardcoded Railway URL. This makes it impossible to deploy the frontend to a different environment (staging, testing) without modifying source code.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/services/api.js` | 5–10 | Hardcoded fallback URL |
| `frontend/.env.example` | — | **Does not exist** — no documented env var template |

### Code Showing the Problem

**`frontend/src/services/api.js` — lines 5–10:**
```js
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  return import.meta.env.VITE_API_URL || 'https://arucase-production.up.railway.app/api';
  //                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                                      ❌ Hardcoded production URL as fallback.
  //                                      If VITE_API_URL is missing, this silently
  //                                      points all environments at production.
};
```

### Impact on Users
A staging or testing deployment without `VITE_API_URL` set will silently hit the production database. This can corrupt production data during testing.

### Suggested Fix Location
- **`frontend/src/services/api.js`** — Remove the hardcoded fallback. Throw an error in production if `VITE_API_URL` is not set:
  ```js
  const getBaseURL = () => {
    if (import.meta.env.DEV) return 'http://localhost:3001/api';
    const url = import.meta.env.VITE_API_URL;
    if (!url) throw new Error('VITE_API_URL environment variable is required in production');
    return url;
  };
  ```
- **`frontend/.env.example`** — Create this file documenting all required environment variables:
  ```
  VITE_API_URL=https://your-backend.railway.app/api
  ```

---

## 15. No Error Tracking Service

**Description:** Unhandled errors are caught by global handlers in `main.jsx` and `App.jsx` (via `ErrorBoundary`), but they are only logged to the browser console or suppressed entirely. There is no integration with an error tracking service (Sentry, Bugsnag, etc.) on either the frontend or backend.

### Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/main.jsx` | 15–23 | Global error handlers — suppress errors silently |
| `frontend/src/components/common/ErrorBoundary.jsx` | 19–28 | Logs to `logger` utility — no external service |
| `backend/server.js` | 460–480 | `uncaughtException` / `unhandledRejection` — logs to console only |

### Code Showing the Problem

**`frontend/src/main.jsx` — lines 15–23 (errors suppressed):**
```js
// Global error handling for uncaught promises (silent)
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();  // ❌ Silently suppressed — no tracking.
});

// Global error handling for uncaught errors (silent)
window.addEventListener('error', (event) => {
  // Silent error handling  // ❌ No logging, no tracking.
});
```

**`frontend/src/components/common/ErrorBoundary.jsx` — lines 19–28:**
```jsx
componentDidCatch(error, errorInfo) {
  logger.error('React Error Boundary Caught Error', error, {
    componentStack: errorInfo.componentStack,
    errorInfo,
  });
  // ❌ `logger` is a local utility — errors go to the browser console only.
  // No Sentry.captureException(), no external service call.
```

**`backend/server.js` — lines 460–480:**
```js
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // ❌ console.error only — no external tracking.
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // ❌ console.error only — no external tracking.
});
```

### Impact on Users
Production errors are invisible to developers unless they actively check Railway logs. Intermittent bugs (e.g. a crash that affects 1% of users) go undetected indefinitely.

### Suggested Fix Location
- **`frontend/src/main.jsx`** — Install `@sentry/react`. Initialize Sentry before `ReactDOM.createRoot()`. Replace the silent `event.preventDefault()` handlers with `Sentry.captureException(event.reason)`.
- **`frontend/src/components/common/ErrorBoundary.jsx`** — Add `Sentry.captureException(error)` in `componentDidCatch`.
- **`backend/server.js`** — Install `@sentry/node`. Initialize Sentry at the top of `server.js`. Add `Sentry.captureException(error)` in the `uncaughtException` and `unhandledRejection` handlers.

---

## 16. Race Conditions — No Optimistic Locking

**Description:** When two users edit the same record simultaneously (e.g. two teachers entering scores for the same student at the same time), the last write wins with no conflict detection. Database tables have no `version` or `updated_at` column used for conflict detection.

### Files

| File | Lines | Role |
|------|-------|------|
| `backend/routes/students.js` | 700–900 | Score entry — no version check on UPDATE |
| `backend/routes/admin.js` | 1060–1080 | School branding save — no version check |
| `backend/config/database.js` | 1–130 | `withTransaction` helper exists but not used for conflict detection |

### Code Showing the Problem

**`backend/routes/students.js` — score entry UPDATE (representative pattern):**
```js
// Score entry uses INSERT ... ON CONFLICT DO UPDATE (upsert)
await query(
  `INSERT INTO individual_scores (adm_no, level, stream, year, month, subject_code, score, ...)
   VALUES ($1, $2, $3, $4, $5, $6, $7, ...)
   ON CONFLICT (adm_no, level, stream, year, month, subject_code)
   DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()`,
  [...]
);
// ❌ No version/timestamp check. If Teacher A and Teacher B both load
//    the score entry page and submit, the second submission silently
//    overwrites the first with no warning to either teacher.
```

**`backend/config/database.js` — lines 95–120 (`withTransaction` exists but doesn't help with optimistic locking):**
```js
const withTransaction = async (fn) => {
  // ✅ Transaction support exists — but transactions alone don't prevent
  //    the last-write-wins race condition. Optimistic locking requires
  //    a version field checked in the WHERE clause.
```

### Impact on Users
In a school with multiple teachers entering scores simultaneously, one teacher's scores can silently overwrite another's. The overwritten teacher sees no error — their data appears saved but is actually lost.

### Suggested Fix Location
- **`backend/routes/students.js`** — For score updates, add an `updated_at` check: `WHERE updated_at = $expected_updated_at`. If the row was modified since the user loaded it, return `409 Conflict`.
- **`frontend/src/pages/academic/ScoreEntryEnter.jsx`** — Store the `updated_at` timestamp when scores are loaded. Send it with the save request. Show a conflict warning if a 409 is received.

---

## 17. No Audit Logging for Admin Actions

**Description:** The `saveUserActivity` utility exists and is used for login/logout events. However, destructive admin actions (deleting a student, deleting scores, changing user permissions, deleting announcements) are not logged. There is no audit trail for "who deleted what and when."

### Files

| File | Lines | Role |
|------|-------|------|
| `backend/routes/admin.js` | 1000–1025 | `DELETE /announcements/:id` — no audit log |
| `backend/routes/students.js` | All DELETE handlers | Student deletion — no audit log |
| `backend/routes/auth-refresh.js` | 240–260 | ✅ Logout is logged via `saveUserActivity` |
| `backend/middleware/auditLog.js` | — | **Does not exist** |

### Code Showing the Problem

**`backend/routes/admin.js` — lines 1000–1020 (delete without audit log):**
```js
router.delete('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM public_announcements WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    res.json({ message: 'Announcement deleted successfully' });
    clearCachePattern('public');
    // ❌ No saveUserActivity() call here.
    //    No record of who deleted this announcement or when.
  } catch (error) { ... }
});
```

**`backend/routes/auth-refresh.js` — lines 240–260 (login IS logged — reference pattern):**
```js
await saveUserActivity({
  username: username,
  activity_type: 'login_success',
  description: `Successful login as ${user.role}`,
  details: { role: user.role }
});
// ✅ This pattern should be applied to all destructive admin actions.
```

### Impact on Users
If a student's data is accidentally deleted, there is no way to determine who deleted it or when. This makes incident response and data recovery impossible without database-level backups.

### Suggested Fix Location
- **`backend/routes/admin.js`** — Add `saveUserActivity()` calls to all DELETE and sensitive PUT handlers. Log the action type, the affected record ID, and the acting user (`req.user.username`).
- **`backend/routes/students.js`** — Same for student deletion and bulk operations.
- **`backend/middleware/auditLog.js`** — Create this file as a reusable Express middleware that automatically logs all non-GET requests to the `user_activity` table, reducing the need to add logging to every individual route.

---

## 18. Missing Pagination on Student Queries

**Description:** This is the pagination-specific aspect of Error #11. The student list endpoint returns up to 500 students (max 2000) in a single response with no page/offset support. The frontend renders all returned students in a single DOM list with no virtual scrolling.

### Files

| File | Lines | Role |
|------|-------|------|
| `backend/routes/students.js` | 393–400 | LIMIT without OFFSET — no pagination |
| `frontend/src/pages/students/StudentList.jsx` | All | Renders all students at once |
| `frontend/src/components/common/DataTable.jsx` | All | DataTable component — check if it supports pagination |

### Code Showing the Problem

**`backend/routes/students.js` — lines 393–400:**
```js
const requestedLimit = parseInt(req.query.limit, 10);
const maxStudents = Math.min(isNaN(requestedLimit) ? 500 : requestedLimit, 2000);
queryText += ` LIMIT ${maxStudents}`;
// ❌ No OFFSET. No page parameter. No total count.
// Response: { students: [...500 rows...] }
// Missing: { students: [...], total: 1200, page: 1, limit: 50 }

const result = await query(queryText, params);
res.json({ students: result.rows || [] });
```

### Impact on Users
Schools with large student populations (500+ students per year across multiple years) will experience slow page loads and sluggish scrolling as the browser renders hundreds of DOM nodes simultaneously.

### Suggested Fix Location
- **`backend/routes/students.js`** — Add `page` (default: 1) and `limit` (default: 50, max: 200) query parameters. Add `OFFSET (page - 1) * limit`. Return `{ students, total, page, limit, totalPages }`.
- **`frontend/src/pages/students/StudentList.jsx`** — Add pagination controls (Previous/Next buttons, page number display). Pass `page` and `limit` to the API call.
- **`frontend/src/components/common/DataTable.jsx`** — Verify the DataTable component supports server-side pagination; if not, add it.

---

## 19. No HTTP Caching in Development

**Description:** The `cacheMiddleware` in `backend/middleware/cache.js` explicitly skips caching in development (`if (process.env.NODE_ENV !== 'production') return next()`). This means the development environment never exercises the caching code path, making it easy for caching bugs to reach production undetected. Additionally, the frontend has no service worker or HTTP cache headers for static assets in development.

### Files

| File | Lines | Role |
|------|-------|------|
| `backend/middleware/cache.js` | 33–36 | Caching disabled in development |
| `backend/server.js` | 307–316 | Static files: 7-day cache in production, 1-hour in development |
| `frontend/src/main.jsx` | 195–210 | Service worker commented out |

### Code Showing the Problem

**`backend/middleware/cache.js` — lines 33–36 (dev bypass):**
```js
const cacheMiddleware = (prefix, ttl = CACHE_TTL.MEDIUM) => {
  return (req, res, next) => {
    // Skip caching in development
    if (process.env.NODE_ENV !== 'production') {
      return next();  // ❌ Cache code never runs in development.
    }
```

**`frontend/src/main.jsx` — lines 195–210 (service worker disabled):**
```js
// Service Worker disabled temporarily for deployment
// if ('serviceWorker' in navigator && import.meta.env.PROD) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')...
//   });
// }
// ❌ No service worker = no offline caching, no background sync.
//    The comment says "temporarily" but there is no sw.js file.
```

### Impact on Users
Without a service worker, the app requires a network connection for every page load. On slow 3G connections, repeat visits to the same page re-download all assets. The cache middleware gap means production caching bugs are only discovered in production.

### Suggested Fix Location
- **`backend/middleware/cache.js`** — Remove the `NODE_ENV !== 'production'` bypass, or replace it with a `DISABLE_CACHE=true` environment variable that can be set explicitly in development when needed.
- **`frontend/src/main.jsx`** — Create a `public/sw.js` service worker that caches static assets and API responses for offline use. Re-enable the service worker registration.

---

## 20. No Schema Validation on CSV Bulk Imports

**Description:** The CSV bulk upload endpoint (`POST /api/students/scores/bulk-upload`) reads the uploaded CSV file and processes rows without validating the data schema. Invalid rows (wrong column count, non-numeric scores, missing admission numbers) are silently skipped or cause unhandled errors.

### Files

| File | Lines | Role |
|------|-------|------|
| `backend/routes/students.js` | 640–750 | `POST /scores/bulk-upload` — CSV parsing without schema validation |
| `frontend/src/pages/admin/BulkImport.jsx` | — | **Does not exist** — bulk import is embedded in score entry pages |
| `frontend/src/pages/academic/ScoreEntryEnter.jsx` | All | Contains the CSV upload UI for score entry |

### Code Showing the Problem

**`backend/routes/students.js` — lines 640–700 (CSV processing without validation):**
```js
router.post('/scores/bulk-upload', csvUpload.single('file'), async (req, res) => {
  try {
    let { level, stream, year, month, subject_code } = req.body;
    // ... parameter validation ...

    // CSV is parsed and rows are processed:
    // ❌ No validation that:
    //    - The CSV has the expected columns (Adm No, First Name, Middle Name, Surname, Score)
    //    - Score values are numeric and within 0-100
    //    - Adm No values are non-empty and match existing students
    //    - The file is actually a valid CSV (not a renamed .exe or .pdf)
    //
    // Invalid rows are silently skipped with no feedback to the user
    // about how many rows were rejected and why.
```

**`backend/routes/students.js` — lines 200–215 (CSV multer config — only checks MIME type):**
```js
const csvUpload = multer({
  storage: csvStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
    // ❌ Only checks file extension/MIME type.
    //    Does not validate the CSV content structure.
  }
});
```

### Impact on Users
A teacher who uploads a CSV with incorrect column order, non-numeric scores, or wrong admission numbers will see a success message (or a confusing partial-success message) with no indication of which rows failed and why. This leads to silent data corruption where some students have scores and others don't.

### Suggested Fix Location
- **`backend/routes/students.js`** — After parsing the CSV, validate each row:
  1. Check that the row has exactly 5 columns.
  2. Check that `Score` is a number between 0 and 100.
  3. Check that `Adm No` is non-empty and exists in the `students` table.
  4. Collect all validation errors and return them in the response: `{ imported: 45, skipped: 3, errors: [{ row: 5, adm_no: 'ADM999', reason: 'Student not found' }] }`.
- **`frontend/src/pages/academic/ScoreEntryEnter.jsx`** — Display the `errors` array from the response so teachers know exactly which rows were rejected.

---

## Summary Table

| # | Error | Primary File | Lines | Severity |
|---|-------|-------------|-------|----------|
| 1 | Token Expiration — No Warning | `frontend/src/context/AuthContext.jsx` | 15–17 | High |
| 2 | No Per-Route Error Boundaries | `frontend/src/App.jsx` | 183–186 | High |
| 3 | No Loading States (Inconsistent) | Multiple form pages | Various | Medium |
| 4 | No Input Validation | `frontend/src/pages/admin/Administrators.jsx` | 122–127 | Medium |
| 5 | No Retry Logic | `frontend/src/services/api.js` | 75–80 | Medium |
| 6 | Token Refresh Only Reactive | `frontend/src/services/api.js` | 107–130 | High |
| 7 | Offline Banner Blinks Off | `frontend/src/components/common/NetworkStatusBanner.jsx` | 43–51 | Low |
| 8 | File Size Validation Missing (Authority) | `frontend/src/pages/admin/Authority.jsx` | 101–110 | Low |
| 9 | No Field-Level Validation Feedback | Multiple form pages | Various | Medium |
| 10 | Duplicate Submissions Possible | `frontend/src/pages/academic/ScoreEntryEnter.jsx` | All | High |
| 11 | Slow Queries — No Indexes | `backend/routes/students.js` | 393–400 | High |
| 12 | Missing Images — Partial Coverage | `backend/server.js` | 307–316 | Low |
| 13 | No CSRF Protection | `backend/server.js` | 220–240 | High |
| 14 | Hardcoded API URL Fallback | `frontend/src/services/api.js` | 9–10 | Medium |
| 15 | No Error Tracking | `frontend/src/main.jsx` | 15–23 | Medium |
| 16 | Race Conditions — No Optimistic Locking | `backend/routes/students.js` | Score entry handlers | High |
| 17 | No Audit Logging | `backend/routes/admin.js` | 1000–1020 | Medium |
| 18 | Missing Pagination | `backend/routes/students.js` | 393–400 | High |
| 19 | No Caching in Development | `backend/middleware/cache.js` | 33–36 | Low |
| 20 | No CSV Schema Validation | `backend/routes/students.js` | 640–700 | High |

---

## Fix Priority Order

**Fix immediately (data integrity / security risk):**
1. Error #13 — CSRF Protection
2. Error #16 — Race Conditions on Score Entry
3. Error #10 — Duplicate Submissions on Score Entry
4. Error #20 — CSV Bulk Import Validation
5. Error #1 / #6 — Token Expiration (combined fix)

**Fix next (user experience / reliability):**
6. Error #11 / #18 — Pagination and Indexes (combined fix)
7. Error #2 — Per-Route Error Boundaries
8. Error #4 — Input Validation
9. Error #9 — Field-Level Validation Feedback
10. Error #17 — Audit Logging

**Fix when time allows (polish / observability):**
11. Error #5 — Retry Logic
12. Error #14 — Hardcoded API URL
13. Error #15 — Error Tracking (Sentry)
14. Error #3 — Loading States Audit
15. Error #7 — Offline Banner Blinking
16. Error #8 — Authority File Size Validation
17. Error #12 — Missing Image Placeholder Coverage
18. Error #19 — Development Caching
