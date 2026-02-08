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

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { cacheMiddleware, cacheHeaders } from './middleware/cache.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache middleware
app.use(cacheHeaders); // Add Cache-Control and Expires headers
app.use(cacheMiddleware(5000)); // Cache GET responses for 5 seconds

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
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

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, '../../dist');

  // Serve static files
  app.use(express.static(distPath));

  // Handle SPA fallback
  app.get('*', (req, res, next) => {
    // Skip API routes so they can hit the error handler or 404 json
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});
