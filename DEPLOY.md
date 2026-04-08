# DEPLOYMENT CHECKLIST

## Backend (Render)

### Environment Variables Required:
```
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_KEY=<your_service_key>
JWT_SECRET=<your_jwt_secret>
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://edendrop001pos.vercel.app,https://edendrop001.vercel.app
```

### Steps:
1. Go to https://dashboard.render.com
2. Select your service: multipos
3. Go to Environment tab
4. Update FRONTEND_URL (remove trailing slash, add both domains)
5. Click "Save Changes"
6. Service will auto-redeploy

## Frontend (Vercel)

### Environment Variables Required:
```
VITE_API_URL=https://multipos.onrender.com/api
```

### Steps:
1. Already deployed via GitHub
2. Auto-deploys on push to main
3. Check: https://edendrop001pos.vercel.app

## Testing After Deploy

1. Open https://edendrop001pos.vercel.app
2. Check console - should see no CORS errors
3. Try login - should work
4. Check offline mode - should work after logout

## If CORS Still Fails

Backend might be sleeping (Render free tier). Wait 30 seconds for it to wake up.
