import express from 'express';
import * as expenseService from '../services/expenseService.js';
import { authorize } from '../middleware/auth.js';
import { clearCache } from '../middleware/cache.js';

const router = express.Router();

// Create expense
router.post('/', authorize(['cashier', 'manager', 'admin']), async (req, res, next) => {
  try {
    const { branchId, category, amount, description } = req.body;
    const recordedBy = req.user.id;

    if (!branchId || !category || !amount) {
      res.status(400).json({ error: 'branchId, category, and amount are required' });
      return;
    }

    const expense = await expenseService.createExpense(
      branchId,
      category,
      amount,
      description,
      recordedBy
    );

    // Invalidate caches after successful expense creation
    clearCache(`/dashboard/branch/${branchId}`);
    clearCache(`/dashboard/admin`);
    clearCache(`/expenses/branch/${branchId}`);

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

// Get expenses by branch
router.get('/branch/:branchId', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const expenses = await expenseService.getExpensesByBranch(
      req.params.branchId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

// Get expenses by date range
router.get('/branch/:branchId/range', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    const expenses = await expenseService.getExpensesByDateRange(
      req.params.branchId,
      startDate,
      endDate
    );
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

// Get total expenses for today
router.get('/branch/:branchId/today-expenses', async (req, res, next) => {
  try {
    const total = await expenseService.getTotalExpensesByDay(req.params.branchId);
    res.json({ total });
  } catch (error) {
    next(error);
  }
});

// Get expenses by category
router.get('/branch/:branchId/by-category', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    const expenses = await expenseService.getExpensesByCategory(
      req.params.branchId,
      startDate,
      endDate
    );
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

export default router;
