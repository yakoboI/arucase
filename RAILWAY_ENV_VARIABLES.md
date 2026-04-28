# 🔐 Railway Environment Variables for Backend (Frontend on Vercel)

This document lists all environment variables needed for your backend on Railway when your frontend is hosted on Vercel.

## ✅ Required Variables

### 1. **NODE_ENV**
```env
NODE_ENV=production
```
**Purpose**: Sets the environment to production mode  
**Required**: Yes  
**Auto-set by Railway**: No

---

### 2. **JWT_SECRET_KEY**
```env
JWT_SECRET_KEY=your-super-secret-random-string-minimum-32-characters-long
```
**Purpose**: Secret key for signing JWT tokens  
**Required**: Yes ⚠️ **CRITICAL**  
**Auto-set by Railway**: No  
**Security**: Generate a strong random string (use `openssl rand -base64 32` or similar)

---

### 3. **ALLOWED_ORIGINS** ⭐ **IMPORTANT FOR VERCEL**
```env
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```
**Purpose**: CORS configuration - allows your Vercel frontend to make API requests  
**Required**: Yes ⚠️ **CRITICAL**  
**Auto-set by Railway**: No  
**Format**: Comma-separated list of URLs (no trailing slashes)

**Example for Vercel:**
```env
# If your Vercel app is: https://arucase-frontend.vercel.app
ALLOWED_ORIGINS=https://arucase-frontend.vercel.app

# If you have multiple domains (Vercel + custom domain):
ALLOWED_ORIGINS=https://arucase-frontend.vercel.app,https://arucase.co.tz,https://www.arucase.co.tz

# If you also want to allow localhost for testing:
ALLOWED_ORIGINS=https://arucase-frontend.vercel.app,http://localhost:3000,http://localhost:5173
```

**Note**: Make sure to include:
- Your Vercel production URL (`*.vercel.app`)
- Your custom domain (if you have one)
- Any preview/staging URLs if needed

---

### 4. **DATABASE_URL**
```env
DATABASE_URL=postgresql://user:password@host:port/database
```
**Purpose**: PostgreSQL connection string  
**Required**: Yes  
**Auto-set by Railway**: ✅ **YES** (when you add PostgreSQL service)  
**Action**: Railway automatically provides this when you add a PostgreSQL database to your project

---

### 5. **PORT**
```env
PORT=5000
```
**Purpose**: Server port  
**Required**: No (has default: 5000)  
**Auto-set by Railway**: ✅ **YES** (Railway sets this automatically)  
**Action**: Railway sets this automatically - you don't need to set it manually

---

## 🔧 Optional but Recommended Variables

### 6. **API_URL**
```env
API_URL=https://your-backend.railway.app
```
**Purpose**: Full backend URL for internal API calls (PDF generation, etc.)  
**Required**: No (defaults to `http://localhost:${PORT}`)  
**Auto-set by Railway**: No  
**When to set**: If your backend needs to make HTTP requests to itself (e.g., for PDF generation)

**Example:**
```env
API_URL=https://arucase-backend-production.up.railway.app
```

---

### 7. **JWT_ACCESS_TOKEN_EXPIRES**
```env
JWT_ACCESS_TOKEN_EXPIRES=5m
```
**Purpose**: JWT token expiration time  
**Required**: No (default: 5 minutes)  
**Auto-set by Railway**: No  
**Format**: Time string (e.g., `5m`, `1h`, `24h`)

---

## 📊 Database Configuration (Optional - if not using DATABASE_URL)

If Railway doesn't automatically set `DATABASE_URL`, you can use individual variables:

```env
PGHOST=your-postgres-host.railway.app
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-password
PGDATABASE=railway
```

**Note**: Railway usually provides `DATABASE_URL` automatically, so these are rarely needed.

---

## ⚡ Performance Tuning Variables (Optional)

### 8. **RATE_LIMIT_MAX**
```env
RATE_LIMIT_MAX=200000
```
**Purpose**: Maximum requests per 15-minute window  
**Required**: No (default: 200000)  
**Auto-set by Railway**: No

---

### 9. **POOL_MAX**
```env
POOL_MAX=100
```
**Purpose**: Maximum database connection pool size  
**Required**: No (default: 100)  
**Auto-set by Railway**: No  
**Range**: 1-200

---

### 10. **STATEMENT_TIMEOUT_MS**
```env
STATEMENT_TIMEOUT_MS=60000
```
**Purpose**: Maximum query execution time in milliseconds  
**Required**: No (default: 60000 = 60 seconds)  
**Auto-set by Railway**: No

---

### 11. **DB_MAX_CONCURRENT_QUERIES**
```env
DB_MAX_CONCURRENT_QUERIES=80
```
**Purpose**: Maximum concurrent database queries (0 = unlimited)  
**Required**: No (default: 0 = unlimited)  
**Auto-set by Railway**: No  
**Recommendation**: Set to 80% of `POOL_MAX` if you want to limit concurrent queries

---

## 🤖 AI/ML Variables (Optional)

### 12. **ANTHROPIC_API_KEY**
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```
**Purpose**: Anthropic Claude API key for AI features  
**Required**: No (only if using AI features)  
**Auto-set by Railway**: No

---

### 13. **ANTHROPIC_MODEL**
```env
ANTHROPIC_MODEL=claude-3-opus-20240229
```
**Purpose**: Anthropic model to use  
**Required**: No  
**Auto-set by Railway**: No

---

## � Cloudinary Variables (Required for Student Photos)

### 14. **CLOUDINARY_CLOUD_NAME**
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
```
**Purpose**: Cloudinary cloud name for image storage  
**Required**: Yes ⚠️ **CRITICAL for photo uploads**  
**Auto-set by Railway**: No  
**How to get**: Sign up at cloudinary.com → Dashboard → Cloud Name

---

### 15. **CLOUDINARY_API_KEY**
```env
CLOUDINARY_API_KEY=123456789012345
```
**Purpose**: Cloudinary API key for authentication  
**Required**: Yes ⚠️ **CRITICAL for photo uploads**  
**Auto-set by Railway**: No  
**How to get**: Cloudinary Dashboard → API Keys

---

### 16. **CLOUDINARY_API_SECRET**
```env
CLOUDINARY_API_SECRET=your-api-secret-key
```
**Purpose**: Cloudinary API secret for authentication  
**Required**: Yes ⚠️ **CRITICAL for photo uploads**  
**Auto-set by Railway**: No  
**How to get**: Cloudinary Dashboard → API Keys  
**Security**: Keep this secret - never commit to git

---

## 📋 Quick Setup Checklist for Railway

1. ✅ **Add PostgreSQL Database** → Railway auto-sets `DATABASE_URL`
2. ✅ **Set `NODE_ENV=production`**
3. ✅ **Set `JWT_SECRET_KEY`** (generate a strong random secret)
4. ✅ **Set `ALLOWED_ORIGINS`** with your Vercel URL(s)
5. ✅ **Set `API_URL`** to your Railway backend URL (for internal calls)
6. ✅ **Set Cloudinary credentials** for student photo uploads (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
7. ✅ **Optional**: Set performance tuning variables
8. ✅ **Optional**: Set `ANTHROPIC_API_KEY` if using AI features

---

## 🔍 How to Find Your Vercel URL

1. Go to your Vercel dashboard: [vercel.com](https://vercel.com)
2. Select your project
3. Go to **"Settings"** → **"Domains"**
4. Your production URL will be: `https://your-project-name.vercel.app`
5. If you have a custom domain, use that instead

---

## 📝 Example Complete Configuration

Here's a complete example of all variables you might set in Railway:

```env
# Environment
NODE_ENV=production

# Security
JWT_SECRET_KEY=your-super-secret-jwt-key-minimum-32-chars-change-this
JWT_ACCESS_TOKEN_EXPIRES=5m

# CORS (Vercel Frontend)
ALLOWED_ORIGINS=https://arucase-frontend.vercel.app,https://arucase.co.tz

# API URL (Your Railway Backend URL)
API_URL=https://arucase-backend-production.up.railway.app

# Database (Auto-set by Railway when you add PostgreSQL)
# DATABASE_URL=postgresql://... (automatically set)

# Performance (Optional)
RATE_LIMIT_MAX=200000
POOL_MAX=100
STATEMENT_TIMEOUT_MS=60000
DB_MAX_CONCURRENT_QUERIES=80

# AI Features (Optional)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-opus-20240229

# Cloudinary for Student Photos
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret-key
```

---

## ⚠️ Common Mistakes to Avoid

1. **Missing ALLOWED_ORIGINS**: Your frontend won't be able to make API calls
2. **Wrong Vercel URL format**: Make sure to use `https://` not `http://`
3. **Trailing slashes**: Don't include trailing slashes in `ALLOWED_ORIGINS` (e.g., use `https://app.vercel.app` not `https://app.vercel.app/`)
4. **Weak JWT_SECRET_KEY**: Use a strong random secret, not "dev-secret-key"
5. **Forgetting NODE_ENV**: Set it to `production` for security and performance

---

## 🔗 Related Documentation

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Railway Environment Variables Docs](https://docs.railway.app/develop/variables)

---

**Last Updated**: February 2026
