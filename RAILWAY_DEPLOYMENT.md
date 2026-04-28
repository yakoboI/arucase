# 🚂 Railway Deployment Guide for Backend

This guide will walk you through deploying your Node.js/Express backend to Railway.

## Prerequisites

- ✅ Railway account ([railway.app](https://railway.app))
- ✅ GitHub account (your code should be in a GitHub repository)
- ✅ Node.js 18+ (for local testing)

## Step-by-Step Deployment

### 1. **Prepare Your Repository**

Make sure your backend code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. **Create a Railway Project**

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will create a new project

### 3. **Add PostgreSQL Database**

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway will automatically create a PostgreSQL database
5. **Important**: Railway automatically sets the `DATABASE_URL` environment variable for services in the same project

### 4. **Deploy Your Backend Service**

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"** (or **"Empty Service"** if you want to configure manually)
3. Select your repository
4. Railway will detect it's a Node.js project

### 5. **Configure the Service**

1. Click on your backend service
2. Go to **"Settings"** tab
3. Set the **Root Directory** to: `backend`
4. Railway will automatically detect:
   - Build command: `npm install` (from `railway.json`)
   - Start command: `node server.js` (from `railway.json`)
   - Port: Railway sets `PORT` automatically

### 6. **Set Environment Variables**

Go to the **"Variables"** tab in your service settings and add:

#### Required Variables:

```env
# Node Environment
NODE_ENV=production

# JWT Secret (IMPORTANT: Generate a strong random secret!)
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-to-random-string

# Database (Railway sets DATABASE_URL automatically, but you can also set these individually)
# DATABASE_URL is automatically provided by Railway when you add PostgreSQL
# If you need individual vars instead:
# PGHOST=your-postgres-host
# PGPORT=5432
# PGUSER=postgres
# PGPASSWORD=your-password
# PGDATABASE=railway

# CORS - Add your frontend URL(s)
ALLOWED_ORIGINS=https://your-frontend-domain.railway.app,https://your-custom-domain.com
```

#### Optional Variables (with defaults):

```env
# Rate Limiting (default: 200000 requests per 15 min)
RATE_LIMIT_MAX=200000

# Database Connection Pool (default: 100)
POOL_MAX=100

# Database Query Timeout (default: 60000ms = 60 seconds)
STATEMENT_TIMEOUT_MS=60000

# Max Concurrent Queries (default: 0 = unlimited)
DB_MAX_CONCURRENT_QUERIES=80
```

### 7. **Link Database to Backend Service**

1. In your backend service settings, go to **"Variables"** tab
2. Click **"New Variable"**
3. Click **"Reference Variable"**
4. Select your PostgreSQL service
5. Select `DATABASE_URL`
6. Railway will automatically inject the database connection string

**OR** Railway does this automatically if both services are in the same project - the `DATABASE_URL` is available to all services.

### 8. **Deploy**

1. Railway will automatically deploy when you:
   - Push to your connected branch (usually `main` or `master`)
   - Or manually trigger a deployment from the **"Deployments"** tab
2. Watch the build logs in the **"Deployments"** tab
3. Once deployed, Railway provides a public URL like: `https://your-backend-production.up.railway.app`

### 9. **Verify Deployment**

1. Check the deployment logs for any errors
2. Visit your backend URL + `/health`:
   ```
   https://your-backend-production.up.railway.app/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "timestamp": "2026-02-19T..."
   }
   ```

3. Test database connection:
   ```
   https://your-backend-production.up.railway.app/api/health/database
   ```

### 10. **Initialize Database (First Time)**

After deployment, you need to initialize your database tables. You have two options:

#### Option A: Using Railway CLI (Recommended)

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Run initialization script:
   ```bash
   railway run npm run init-db
   ```

5. Create admin user:
   ```bash
   railway run npm run create-admin
   ```

#### Option B: Using Railway's Web Terminal

1. Go to your backend service in Railway dashboard
2. Click **"Deployments"** tab
3. Click on the latest deployment
4. Click **"View Logs"** → **"Shell"** tab
5. Run:
   ```bash
   npm run init-db
   npm run create-admin
   ```

## 🔧 Configuration Files

Your `backend/railway.json` is already configured:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

This tells Railway:
- ✅ Use Nixpacks builder (auto-detects Node.js)
- ✅ Run `npm install` during build
- ✅ Start with `node server.js`
- ✅ Auto-restart on failure (up to 10 times)

## 🌐 Custom Domain (Optional)

1. In your service settings, go to **"Settings"** tab
2. Scroll to **"Domains"**
3. Click **"Generate Domain"** or **"Custom Domain"**
4. For custom domain, add your domain and configure DNS:
   - Add a CNAME record pointing to Railway's domain
   - Railway automatically provisions SSL certificates

## 📊 Monitoring & Logs

- **Logs**: View real-time logs in Railway dashboard → **"Deployments"** → **"View Logs"**
- **Metrics**: Railway provides basic metrics (CPU, Memory, Network)
- **Health Checks**: Your `/health` endpoint can be used for monitoring

## 🔄 Continuous Deployment

Railway automatically deploys when you:
- Push to your connected branch (usually `main`)
- Merge a pull request (if configured)

To disable auto-deploy or change branch:
1. Go to service **"Settings"**
2. Under **"Source"**, configure branch settings

## 🐛 Troubleshooting

### Database Connection Issues

1. **Check `DATABASE_URL`**: Ensure it's set correctly in Variables
2. **Verify Database Service**: Make sure PostgreSQL service is running
3. **Check Logs**: Look for connection errors in deployment logs
4. **Test Connection**: Use `/api/health/database` endpoint

### Build Failures

1. **Check Node Version**: Ensure `package.json` specifies Node 18+:
   ```json
   "engines": {
     "node": ">=18.0.0"
   }
   ```
2. **Check Dependencies**: Ensure all dependencies are in `package.json`
3. **Check Build Logs**: Railway shows detailed build errors

### Port Issues

- Railway automatically sets `PORT` environment variable
- Your code uses `process.env.PORT || 5000` ✅ (correct!)
- No manual port configuration needed

### Environment Variables Not Working

1. **Check Variable Names**: Ensure they match exactly (case-sensitive)
2. **Redeploy**: After adding variables, trigger a new deployment
3. **Check Logs**: Variables are logged (but secrets are masked)

## 📝 Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] PostgreSQL database added
- [ ] Backend service created and configured
- [ ] Root directory set to `backend`
- [ ] Environment variables set (especially `JWT_SECRET_KEY` and `NODE_ENV`)
- [ ] Database linked (automatic via `DATABASE_URL`)
- [ ] Service deployed successfully
- [ ] Health check passes (`/health` endpoint)
- [ ] Database initialized (`npm run init-db`)
- [ ] Admin user created (`npm run create-admin`)

## 🔗 Next Steps

After backend is deployed:

1. **Deploy Frontend**: Point frontend to your backend URL
2. **Update Frontend Environment**: Set `VITE_API_URL` to your backend Railway URL
3. **Test Endpoints**: Verify all API endpoints work
4. **Set Up Monitoring**: Configure alerts for health checks

## 💡 Pro Tips

1. **Use Railway's Private Networking**: Services in the same project can communicate via private network (faster, no egress costs)

2. **Environment-Specific Variables**: Use Railway's environment feature to have different variables for staging/production

3. **Database Backups**: Railway PostgreSQL includes automatic backups, but you can also use your `backupDatabase.js` script

4. **Secrets Management**: Never commit `.env` files. Use Railway's Variables tab for all secrets.

5. **Resource Limits**: Monitor your usage. Railway's free tier includes:
   - $5 credit/month
   - 500 hours of usage
   - 100GB bandwidth

---

**Need Help?** Check Railway's documentation: [docs.railway.app](https://docs.railway.app)
