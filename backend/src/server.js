import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import inventoryRoutes from './routes/inventory.js';
import expenseRoutes from './routes/expenses.js';
import staffRoutes from './routes/staff.js';
import dashboardRoutes from './routes/dashboard.js';
import reconciliationRoutes from './routes/reconciliation.js';
import auditRoutes from './routes/audit.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { cacheMiddleware, cacheHeaders } from './middleware/cache.js';
import { initializeScheduledJobs } from './services/auditScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (v4.2.2 - Deep Scan Mode)
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/$/, '')).filter(o => o.length > 0)
  : ['http://localhost:5173', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow internal/no-origin requests
    if (!origin) return callback(null, true);

    // Check if in whitelist OR is a Vercel preview URL
    const isWhitelisted = allowedOrigins.some(allowed => 
      origin === allowed || origin.startsWith(allowed)
    ) || allowedOrigins.includes('*');
    
    // Allow all Vercel preview URLs (*.vercel.app)
    const isVercelPreview = origin.endsWith('.vercel.app');

    if (isWhitelisted || isVercelPreview) {
      return callback(null, true);
    }

    console.warn('❌ CORS BLOCKED:', {
      incoming: origin,
      whitelist: allowedOrigins
    });

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache middleware
app.use(cacheHeaders); // Add Cache-Control and Expires headers
app.use(cacheMiddleware(5000)); // Cache GET responses for 5 seconds

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/branches', branchRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/transactions', authenticate, transactionRoutes);
app.use('/api/inventory', authenticate, inventoryRoutes);
app.use('/api/expenses', authenticate, expenseRoutes);
app.use('/api/staff', authenticate, staffRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/reconciliation', authenticate, reconciliationRoutes);
app.use('/api/audit', authenticate, auditRoutes);

// Serve frontend in production environments or if dist exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs';

let distPath = path.join(__dirname, '../../dist');

// If ../../dist doesn't exist, try ../dist (in case we are in a different structure)
if (!fs.existsSync(distPath)) {
  const altPath = path.join(__dirname, '../dist');
  if (fs.existsSync(altPath)) {
    distPath = altPath;
  }
}

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' || process.env.RENDER) {
  console.log(`🌐 Production Mode: Attempting to serve static files from: ${distPath}`);
  console.log(`📂 Directory exists: ${fs.existsSync(distPath)}`);

  if (fs.existsSync(distPath)) {
    try {
      const files = fs.readdirSync(distPath);
      console.log(`📄 Files in dist: ${files.join(', ')}`);
    } catch (e) {
      console.error('❌ Error reading dist directory:', e.message);
    }
  } else {
    console.error('❌ WARNING: dist directory not found! Static files will NOT be served.');
    console.log(`📍 Current __dirname: ${__dirname}`);
    console.log(`📍 Current process.cwd(): ${process.cwd()}`);
  }

  // Serve static files
  app.use(express.static(distPath));

  // Handle SPA fallback
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }

    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built. Please run build command.');
    }
  });
} else {
  console.log('🛠️ Development mode: Static file serving is disabled');
}

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  
  // Initialize automated audit system
  initializeScheduledJobs();
});
