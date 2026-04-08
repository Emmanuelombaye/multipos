# Keep Backend Alive - 2 Minute Setup (100% Free)

## Use UptimeRobot (Easiest & Free Forever)

### Step 1: Sign Up (30 seconds)
1. Go to https://uptimerobot.com/
2. Click "Free Sign Up"
3. Enter email and create password
4. Verify email

### Step 2: Add Monitor (1 minute)
1. Click "+ Add New Monitor"
2. Fill in:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** MultiPOS Backend
   - **URL:** `https://multipos.onrender.com/health`
   - **Monitoring Interval:** 5 minutes (free tier)
3. Click "Create Monitor"

### Done! ✅

Your backend will:
- Get pinged every 5 minutes
- Never sleep
- Stay up 24/7
- Work forever without you

---

## Alternative: Cron-Job.org (Also Free)

1. Go to https://cron-job.org/en/
2. Sign up free
3. Create cron job:
   - URL: `https://multipos.onrender.com/health`
   - Schedule: Every 10 minutes
4. Enable and save

---

## Why This Works

Render free tier sleeps after 15 minutes of inactivity.
By pinging every 5-10 minutes, it never sleeps.

**Total cost: $0**
**Setup time: 2 minutes**
**Maintenance: None**
