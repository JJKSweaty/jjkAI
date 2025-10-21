# JJK.AI Deployment Guide

## 🚀 Quick Deploy

### Frontend (Vercel)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js
6. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Click "Deploy"

### Backend (Railway)
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Click "Add variables" and add:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `PORT=3001`
   - `NODE_ENV=production`
5. In Settings:
   - **Root Directory**: `apps/server`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
6. Click "Deploy"

## 🔗 Connect Frontend to Backend

After Railway deploys, you'll get a URL like: `https://your-app.up.railway.app`

Update your frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
```

Then redeploy Vercel (it will auto-redeploy on git push).

## ✅ Verify Deployment

### Backend Health Check
```bash
curl https://your-app.up.railway.app/health
```
Expected: `{"status":"ok"}`

### Frontend
Visit your Vercel URL: `https://your-app.vercel.app`

## 🔒 Security Checklist

- [ ] Supabase RLS (Row Level Security) is enabled
- [ ] API keys are set as environment variables (not in code)
- [ ] CORS is configured properly in backend
- [ ] Rate limiting is enabled (if needed)

## 📊 Monitoring

- **Vercel**: Analytics tab shows performance
- **Railway**: Metrics tab shows CPU/Memory usage
- **Supabase**: Dashboard shows database queries

## 🐛 Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure `apps/server/package.json` has correct scripts

### Frontend API errors
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify CORS is enabled in backend
- Check Railway app is running

### Database connection issues
- Verify Supabase URL and keys
- Check Supabase connection pooler settings
- Ensure database is accessible from Railway IP

## 🔄 CI/CD

Both platforms auto-deploy on git push to main:
- **Vercel**: Deploys on every push
- **Railway**: Deploys on every push

## 💰 Cost Optimization

- **Vercel**: Free tier includes 100GB bandwidth
- **Railway**: Free $5/month credit, then pay-as-you-go
- **Supabase**: Free tier includes 500MB database

Your token optimization should keep Anthropic costs very low (70-85% reduction)!

---

Need help? Check the logs:
- Vercel: Project → Deployments → Click deployment → Logs
- Railway: Project → Deployments → View Logs
