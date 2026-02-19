# Deployment Checklist

## Pre-Deployment

### 1. MongoDB Atlas
- [ ] Create free tier cluster (M0)
- [ ] Create database user with password
- [ ] Whitelist IP: `0.0.0.0/0`
- [ ] Get connection string
- [ ] Test connection with MongoDB Compass

### 2. Backend Preparation
- [ ] Update `requirements.txt` (run `pip freeze > requirements.txt`)
- [ ] Create `.env` from `.env.example`
- [ ] Test locally: `uvicorn server:app --reload`
- [ ] Verify all endpoints work
- [ ] Run seed script: `python seed_data.py`

### 3. Frontend Preparation
- [ ] Create `.env` from `.env.example`
- [ ] Update `REACT_APP_BACKEND_URL` to local backend
- [ ] Test locally: `yarn start`
- [ ] Verify all pages load correctly
- [ ] Test build: `yarn build`

## Render Deployment (Backend)

### Setup
- [ ] Create Render account
- [ ] Push code to GitHub
- [ ] Create new Web Service
- [ ] Connect GitHub repository
- [ ] Set root directory: `backend`

### Configuration
- [ ] Environment: Python 3
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Environment Variables
- [ ] `MONGO_URL` = MongoDB Atlas connection string
- [ ] `DB_NAME` = `provanota_db`
- [ ] `CORS_ORIGINS` = `https://your-app.vercel.app` (will update after Vercel deploy)
- [ ] `JWT_SECRET` = Generate secure random string

### Post-Deploy
- [ ] Wait for deployment to complete (~5-10 min)
- [ ] Copy backend URL: `https://provanota-api.onrender.com`
- [ ] Test health endpoint: `curl https://provanota-api.onrender.com/api/`
- [ ] Check logs for errors

### Seed Database
Option A - Local:
```bash
export MONGO_URL="mongodb+srv://..."
python seed_data.py
```

Option B - Render Shell:
- [ ] Go to Render Dashboard → Shell
- [ ] Run: `python seed_data.py`
- [ ] Verify test credentials work

## Vercel Deployment (Frontend)

### Setup
- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Import project

### Configuration
- [ ] Root Directory: `frontend`
- [ ] Framework Preset: Create React App
- [ ] Build Command: `yarn build`
- [ ] Output Directory: `build`
- [ ] Install Command: `yarn install`

### Environment Variables
- [ ] `REACT_APP_BACKEND_URL` = Render backend URL
  Example: `https://provanota-api.onrender.com`

### Post-Deploy
- [ ] Wait for deployment (~2-3 min)
- [ ] Copy frontend URL: `https://provanota.vercel.app`
- [ ] Open URL in browser
- [ ] Test login page loads

## CORS Update

- [ ] Go back to Render
- [ ] Update `CORS_ORIGINS` environment variable
- [ ] Add Vercel URL: `https://provanota.vercel.app`
- [ ] Render will automatically redeploy

## Testing

### Authentication
- [ ] Register new account
- [ ] Login with test credentials:
  - Admin: `admin@provanota.com` / `admin123`
  - Student: `estudante@provanota.com` / `estudante123`
- [ ] Verify JWT persistence (refresh page)
- [ ] Test logout

### Student Flow
- [ ] View dashboard
- [ ] See available exams
- [ ] Start simulation
- [ ] Answer questions
- [ ] Submit simulation
- [ ] View results
- [ ] Check attempt history

### Admin Flow
- [ ] Access admin dashboard
- [ ] Create new exam
- [ ] Add questions
- [ ] Publish exam
- [ ] Verify it appears for students

### Premium Flow
- [ ] Login as free student
- [ ] Verify ads are visible (dashboard, results)
- [ ] Go to profile
- [ ] Click upgrade button
- [ ] Verify status changes to premium
- [ ] Verify ads disappear

## Production Checklist

### Security
- [ ] Change JWT_SECRET to strong random value
- [ ] Use strong MongoDB password
- [ ] Enable MongoDB authentication
- [ ] Review CORS settings (don't use `*` in production)

### Monitoring
- [ ] Set up Render notifications
- [ ] Monitor Render logs regularly
- [ ] Check MongoDB Atlas metrics
- [ ] Set up Vercel analytics (optional)

### Performance
- [ ] Test cold start time (Render free tier)
- [ ] Verify frontend loads quickly
- [ ] Check MongoDB query performance
- [ ] Test on mobile devices

### Documentation
- [ ] Update README with production URLs
- [ ] Document any customizations
- [ ] Add troubleshooting notes
- [ ] Create user guide (optional)

## Common Issues

### "Application failed to respond" (Render)
- Check if service is hibernating (free tier)
- Wait 30-60 seconds for cold start
- Check logs for startup errors
- Verify PORT environment variable

### CORS Errors
- Update CORS_ORIGINS on Render
- Include both http://localhost:3000 (dev) and production URL
- Restart Render service after updating

### MongoDB Connection Failed
- Verify connection string
- Check Network Access whitelist
- Test with MongoDB Compass
- Verify username/password

### Build Failed (Vercel)
- Check if `package.json` and `yarn.lock` are committed
- Verify build command
- Check environment variables
- Review build logs

## Rollback Plan

### Render
- Dashboard → Deploys → Previous deploy → Redeploy

### Vercel
- Deployments → Previous deployment → Promote to Production

### Database
- MongoDB Atlas → Backup → Restore
- Or keep local backup of seed_data.py output

## Maintenance

### Regular Tasks
- [ ] Monitor Render logs weekly
- [ ] Check MongoDB storage usage
- [ ] Review error reports
- [ ] Update dependencies monthly
- [ ] Test all critical flows

### Updates
- [ ] Test changes locally first
- [ ] Deploy backend first
- [ ] Then deploy frontend
- [ ] Verify everything works
- [ ] Rollback if issues

## Success Criteria

✅ Frontend loads without errors
✅ Backend API responds
✅ Authentication works
✅ Students can take exams
✅ Admins can manage content
✅ Scoring is accurate
✅ No console errors
✅ Mobile responsive
✅ Cold start < 60s (Render)

## Support

For issues:
1. Check Render logs
2. Check browser console
3. Review MongoDB Atlas logs
4. Test API endpoints with curl
5. Refer to troubleshooting section in README.md
