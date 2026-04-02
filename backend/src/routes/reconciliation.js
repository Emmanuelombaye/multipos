import express from 'express';
import { reconcileDailyOpeningStock, reconcileBranchOpeningStock } from '../services/stockReconciliationService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Reconcile all branches (admin only)
router.post('/reconcile/all', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const result = await reconcileDailyOpeningStock();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Reconcile specific branch (admin only)
router.post('/reconcile/branch/:branchId', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const result = await reconcileBranchOpeningStock(req.params.branchId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
