# Quick Production Security Fix Guide
## URGENT - Do These NOW Before Any Deployment

---

## 🚨 CRITICAL: Your .env file has REAL SECRETS exposed!

```
SUPABASE_SERVICE_KEY=[your-service-key-from-env]
JWT_SECRET=your_jwt_secret_key_change_this_in_production_super_secret_123
```

**These are LIVE credentials that can access your entire database!**

---

## 1️⃣ IMMEDIATE ACTION (Do in next 15 minutes)

### Replace ALL Secrets

```powershell
# 1. Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Update backend/.env
```env
# DELETE THE OLD VALUES AND USE NEW ONES

# Generate new service key in Supabase Dashboard:
# https://app.supabase.com/project/YOUR_PROJECT/settings/api
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
SUPABASE_SERVICE_KEY=YOUR_NEW_SERVICE_KEY

# Use the generated JWT secret from above
JWT_SECRET=YOUR_NEW_GENERATED_SECRET_HERE

PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

---

## 2️⃣ ADD SECURITY PACKAGES (30 minutes)

```powershell
cd backend

# Install security packages
npm install helmet express-rate-limit joi cors dotenv winston

# Install dev dependencies
npm install --save-dev nodemon
```

---

## 3️⃣ UPDATE server.js (15 minutes)

Replace your `backend/src/server.js` with this hardened version:

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import inventoryRoutes from './routes/inventory.js';
import expenseRoutes from './routes/expenses.js';
import staffRoutes from './routes/staff.js';
import dashboardRoutes from './routes/dashboard.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { cacheMiddleware, cacheHeaders } from './middleware/cache.js';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const allowedOrigins = isProduction 
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // More strict in production
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
  skipSuccessfulRequests: true,
});

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Cache middleware
app.use(cacheHeaders);
app.use(cacheMiddleware(5000));

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Documentation (in development only)
if (!isProduction) {
  app.get('/api', (req, res) => {
    res.json({
      message: 'EdenDropInvestment API',
      version: '1.0.0',
      endpoints: {
        auth: ['/api/auth/register', '/api/auth/login'],
        branches: ['/api/branches'],
        products: ['/api/products'],
        transactions: ['/api/transactions'],
        inventory: ['/api/inventory'],
        expenses: ['/api/expenses'],
        staff: ['/api/staff'],
        dashboard: ['/api/dashboard']
      }
    });
  });
}

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/branches', authenticate, branchRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/transactions', authenticate, transactionRoutes);
app.use('/api/inventory', authenticate, inventoryRoutes);
app.use('/api/expenses', authenticate, expenseRoutes);
app.use('/api/staff', authenticate, staffRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  if (!isProduction) {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
```

---

## 4️⃣ ADD INPUT VALIDATION (20 minutes)

Create `backend/src/middleware/validation.js`:

```javascript
import Joi from 'joi';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, and one number'
      }),
    role: Joi.string().valid('admin', 'manager', 'cashier').default('cashier'),
    branchId: Joi.string().uuid().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  transaction: Joi.object({
    branchId: Joi.string().uuid().required(),
    items: Joi.array().items(Joi.object({
      productId: Joi.string().uuid().required(),
      quantity: Joi.number().positive().required(),
      price: Joi.number().positive().required()
    })).min(1).required(),
    paymentMethod: Joi.string().valid('cash', 'mpesa', 'card').required()
  }),

  expense: Joi.object({
    branchId: Joi.string().uuid().required(),
    category: Joi.string().valid('supplies', 'utilities', 'petty-cash', 'maintenance', 'other').required(),
    amount: Joi.number().positive().max(1000000).required(),
    description: Joi.string().max(500).required()
  })
};
```

Update `backend/src/routes/auth.js`:

```javascript
import express from 'express';
import * as authService from '../services/authService.js';
import { validateRequest, schemas } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', validateRequest(schemas.register), async (req, res, next) => {
  try {
    const { name, email, password, role, branchId } = req.body;
    const user = await authService.register(name, email, password, role, branchId);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validateRequest(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

## 5️⃣ IMPROVE ERROR HANDLING (10 minutes)

Update `backend/src/middleware/errorHandler.js`:

```javascript
export const errorHandler = (err, req, res, next) => {
  // Don't log in production (use proper logger instead)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  // Determine status code
  const status = err.status || err.statusCode || 500;
  
  // Prepare error message
  const message = err.message || 'Internal server error';
  
  // Build response
  const errorResponse = {
    error: message,
    timestamp: new Date().toISOString()
  };

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Send response
  res.status(status).json(errorResponse);
};
```

---

## 6️⃣ CONFIGURE FRONTEND FOR PRODUCTION (5 minutes)

Create `frontend/.env.production`:

```env
VITE_API_URL=https://api.yourdomain.com/api
```

Create `frontend/.env.development`:

```env
VITE_API_URL=http://localhost:5000/api
```

Update `src/app/api/client.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

---

## 7️⃣ ADD .env.example FILES (5 minutes)

Create `backend/.env.example`:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_long_random_secret_here

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## 8️⃣ UPDATE package.json SCRIPTS

Update `backend/package.json`:

```json
{
  "scripts": {
    "start": "NODE_ENV=production node src/server.js",
    "dev": "NODE_ENV=development nodemon src/server.js",
    "build": "echo 'Build step for Node.js'",
    "seed": "node src/db/seed.js",
    "seed:realistic": "node src/db/seed-realistic.js",
    "validate": "node -e \"require('dotenv').config(); const required = ['SUPABASE_URL', 'JWT_SECRET']; required.forEach(v => { if (!process.env[v]) { console.error('Missing:', v); process.exit(1); }})\""
  }
}
```

---

## 9️⃣ DEPLOYMENT CHECKLIST

Before deploying:

- [ ] All secrets rotated in .env
- [ ] JWT_SECRET is cryptographically random
- [ ] NODE_ENV=production set
- [ ] Rate limiting enabled
- [ ] Input validation added
- [ ] Security headers (helmet) enabled
- [ ] CORS configured for production domain
- [ ] Error handling improved
- [ ] Console.logs removed or behind ENV checks
- [ ] Frontend .env.production created
- [ ] Database backups enabled in Supabase
- [ ] HTTPS/SSL certificate obtained
- [ ] Test deployment in staging first

---

## 🚀 QUICK DEPLOY OPTIONS

### Option 1: Railway (Easiest)
1. Push code to GitHub (make sure .env is in .gitignore!)
2. Go to railway.app
3. Create new project from GitHub repo
4. Add environment variables in Railway dashboard
5. Deploy!

### Option 2: Render
1. Push code to GitHub
2. Go to render.com
3. Create Web Service from repo
4. Add environment variables
5. Deploy!

### Option 3: DigitalOcean App Platform
1. Push to GitHub
2. Create app in DigitalOcean
3. Configure environment variables
4. Deploy!

---

## ⚠️ WHAT NOT TO DO

❌ **NEVER** commit .env files to Git  
❌ **NEVER** use weak/default JWT secrets  
❌ **NEVER** deploy without HTTPS  
❌ **NEVER** use service role key in production (implement RLS instead)  
❌ **NEVER** skip rate limiting  
❌ **NEVER** deploy without testing in staging first  

---

## ✅ AFTER DEPLOYMENT

1. Test all endpoints with production URL
2. Monitor error rates in first 24 hours
3. Check database performance
4. Verify rate limiting is working
5. Confirm HTTPS is enforced
6. Test from multiple devices/networks

---

## 🆘 IF SOMETHING BREAKS

1. **Check logs** - Railway/Render/DO all have log viewers
2. **Verify environment variables** - Are they set correctly?
3. **Check CORS** - Is your frontend URL whitelisted?
4. **Database connection** - Can backend reach Supabase?
5. **Rollback** - Most platforms let you rollback to previous deployment

---

## 📞 NEED HELP?

Common issues:
- **502 Bad Gateway**: Backend not starting (check logs for env var errors)
- **CORS errors**: Frontend URL not in allowedOrigins
- **401 Unauthorized**: JWT_SECRET mismatch between deploys
- **Database errors**: Check Supabase connection string

---

**Total Time to Secure**: ~2 hours  
**Difficulty**: Medium  
**Priority**: 🔴 CRITICAL - Do before any production deployment
