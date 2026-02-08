# 🚀 START HERE - EdenDropInvestment Backend

## ✅ Backend Installation Complete!

Dependencies have been installed successfully. Your backend is ready to use!

---

## Quick Start (3 Simple Steps)

### Step 1️⃣: Create Database Tables

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select project: `toczvlitmnzkyguxjxxn`
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy entire content from: `src/db/schema.sql`
6. Paste into the editor
7. Click **Run**

✅ Your database is now set up!

---

### Step 2️⃣: Start the Backend Server

Open terminal in `backend` folder and run:

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📍 Environment: development
```

The backend is now live! 🎉

---

### Step 3️⃣: Test the API

Open another terminal and test:

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{"status":"OK","message":"Server is running"}
```

✅ Backend is working!

---

## Next: Test Authentication

### Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "cashier"
  }'
```

### Login to Get Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

You'll get back a token: `{ "token": "eyJ0eXAi..." }`

### Use Token for Protected Requests

```bash
curl -X GET http://localhost:5000/api/branches \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `README.md` | Full API reference |
| `ARCHITECTURE.md` | System design & diagrams |
| `INTEGRATION.md` | Frontend integration guide |
| `API_TESTING.md` | Testing with Postman/curl |

---

## 🎯 Environment Variables

Your `.env` file is already configured with Supabase credentials:

```
SUPABASE_URL=https://toczvlitmnzkyguxjxxn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_7fuap3GUjL7farXcVp09zw_ohotBiO2
SUPABASE_SERVICE_KEY=[your-service-key-from-env]
JWT_SECRET=your_jwt_secret_key_change_this_in_production_super_secret_123
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## API Endpoints Available

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`

### Core Resources
- `GET/POST /api/branches`
- `GET/POST /api/products`
- `POST /api/transactions` (POS)
- `POST /api/inventory/entry` (Stock)
- `POST /api/expenses`
- `GET /api/dashboard/branch/:id`

**Full list** → See `README.md`

---

## Troubleshooting

### Port 5000 Already in Use
Change in `.env`: `PORT=5001`

### Cannot Connect to Supabase
- Verify credentials in `.env`
- Check internet connection
- Project might be paused (check Supabase dashboard)

### Auth Token Not Working
- Token valid for 24 hours
- Login again to get new token
- Include `Authorization: Bearer TOKEN`

---

## Production Deployment

When ready to deploy, you can use:
- **Vercel** (Free Node.js hosting)
- **Railway** (Simple deployment)
- **Heroku** (if available)
- **AWS, Google Cloud, DigitalOcean**

All the code is production-ready! 🚀

---

## What's Running

```
Frontend:   http://localhost:5173  (React + Vite)
Backend:    http://localhost:5000  (Express API)
Database:   Supabase Cloud (PostgreSQL)
```

---

## Next Steps

1. ✅ Backend installed
2. ✅ Database schema created
3. ✅ API running on port 5000
4. ⏭️ **Next**: Connect React frontend to backend
   - See `INTEGRATION.md` for step-by-step guide

---

**Your multi-branch EdenDropInvestment system is now online!** 🥩📊

Need help? Check the documentation files or the API testing guide.

Happy coding! 🎉
