import express from 'express';
import * as transactionService from '../services/transactionService.js';
import { authorize } from '../middleware/auth.js';
import { clearCache } from '../middleware/cache.js';

const router = express.Router();

// Create transaction (cashier, manager, admin)
router.post('/', authorize(['cashier', 'manager', 'admin']), async (req, res, next) => {
  try {
    const { branchId, items, paymentMethod } = req.body;
    const cashierId = req.user?.id;
    console.log(`[Transactions] Request from cashier: ${cashierId || 'ANONYMOUS'} for branch ${branchId}`);

    if (!branchId || !items || !paymentMethod || !cashierId) {
      console.error(`[Transactions] Missing required fields: branchId=${!!branchId}, items=${!!items}, paymentMethod=${!!paymentMethod}, cashierId=${!!cashierId}`);
      res.status(400).json({ error: 'branchId, items, paymentMethod, and user identification are required' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items must be a non-empty array' });
      return;
    }

    console.log(`[Transactions] Creating sale for branch ${branchId}: KES ${items.reduce((sum, i) => sum + i.subtotal, 0)} via ${paymentMethod}`);

    const transaction = await transactionService.createTransaction(
      branchId,
      cashierId,
      items,
      paymentMethod
    );

    console.log(`[Transactions] Successfully created transaction: ${transaction.id}`);

    // Invalidate caches after successful transaction
    clearCache(`/dashboard/branch/${branchId}`);
    clearCache(`/dashboard/admin`);
    clearCache(`/transactions/branch/${branchId}`);
    clearCache(`/transactions/branch/${branchId}/range`);
    clearCache(`/inventory/current/${branchId}`);

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id);
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Get transactions by branch
router.get('/branch/:branchId', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const transactions = await transactionService.getTransactionsByBranch(
      req.params.branchId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get transactions by date range
router.get('/branch/:branchId/range', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    const transactions = await transactionService.getTransactionsByDateRange(
      req.params.branchId,
      startDate,
      endDate
    );
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get total sales for today
router.get('/branch/:branchId/today-sales', async (req, res, next) => {
  try {
    const total = await transactionService.getTotalSalesByDay(req.params.branchId);
    res.json({ total });
  } catch (error) {
    next(error);
  }
});

export default router;
