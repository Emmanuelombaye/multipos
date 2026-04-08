# Keep Backend Alive - Setup Instructions

## Option 1: Use Cron-Job.org (Recommended - Free & Automatic)

1. Go to https://cron-job.org/en/
2. Sign up for free account
3. Create new cron job:
   - **Title:** Keep Render Backend Alive
   - **URL:** https://multipos.onrender.com/health
   - **Schedule:** Every 10 minutes
   - **Method:** GET
4. Save and enable

Backend will never sleep again!

## Option 2: Use UptimeRobot (Free)

1. Go to https://uptimerobot.com/
2. Sign up for free account
3. Add new monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** MultiPOS Backend
   - **URL:** https://multipos.onrender.com/health
   - **Monitoring Interval:** 5 minutes
4. Save

## Option 3: Deploy Keep-Alive Script (Requires Another Server)

If you have another server (Vercel, Netlify, etc.):

```bash
# Run this script
node backend/keep-alive.js
```

Or deploy as serverless function that runs every 10 minutes.

## Option 4: GitHub Actions (Free)

Create `.github/workflows/keep-alive.yml`:

```yaml
name: Keep Backend Alive
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Backend
        run: curl https://multipos.onrender.com/health
```

## Recommended: Option 1 (Cron-Job.org)
- Completely free
- No coding needed
- Set and forget
- Works forever
