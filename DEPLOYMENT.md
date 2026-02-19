# Deployment Guide

## Quick Start

1. **MongoDB Atlas** (Database)
2. **Render** (Backend API)
3. **Vercel** (Frontend)

## Step-by-Step

### 1. MongoDB Atlas Setup

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create new cluster (M0 Free Tier)
3. Create database user (Database Access)
4. Whitelist IP: `0.0.0.0/0` (Network Access)
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net
   ```

### 2. Deploy Backend to Render

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. New → Web Service
4. Connect GitHub repo
5. Settings:
   - **Name**: `provanota-api`
   - **Root Directory**: `backend`
   - **Environment**: Python 3
   - **Build**: `pip install -r requirements.txt`
   - **Start**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Environment Variables:
   ```
   MONGO_URL=mongodb+srv://...
   DB_NAME=provanota_db
   CORS_ORIGINS=https://your-app.vercel.app
   JWT_SECRET=your-secret-key
   ```
7. Create Web Service
8. Copy URL: `https://provanota-api.onrender.com`

### 3. Seed Database

Locally:
```bash
export MONGO_URL="mongodb+srv://..."
python backend/seed_data.py
```

Or use Render Shell.

### 4. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import Project → GitHub
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: Create React App
   - **Build**: `yarn build`
   - **Output**: `build`
4. Environment Variable:
   ```
   REACT_APP_BACKEND_URL=https://provanota-api.onrender.com
   ```
5. Deploy
6. Copy URL: `https://provanota.vercel.app`

### 5. Update CORS

On Render, update `CORS_ORIGINS`:
```
CORS_ORIGINS=https://provanota.vercel.app
```

## Done! 🎉

Your app is live:
- Frontend: `https://provanota.vercel.app`
- Backend: `https://provanota-api.onrender.com`

## Free Tier Limitations

- **Render**: Hibernates after 15min inactivity (30-60s cold start)
- **MongoDB Atlas**: 512MB storage, shared cluster
- **Vercel**: 100GB bandwidth/month

## Custom Domain (Optional)

### Vercel
1. Domains → Add Domain
2. Update DNS records

### Render
1. Settings → Custom Domain
2. Update DNS records