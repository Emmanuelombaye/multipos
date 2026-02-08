import express from 'express';
import * as inventoryService from '../services/inventoryService.js';
import { authorize } from '../middleware/auth.js';
import { clearCache } from '../middleware/cache.js';

const router = express.Router();

// Record stock entry
router.post('/entry', authorize(['manager', 'admin']), async (req, res, next) => {
  try {
    const { productId, branchId, openingStock, date, addedBy } = req.body;

    if (!productId || !branchId || openingStock === undefined || !date) {
      res.status(400).json({ error: 'productId, branchId, openingStock, and date are required' });
      return;
    }

    const entry = await inventoryService.recordStockEntry(
      productId,
      branchId,
      openingStock,
      date,
      addedBy
    );

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// Record closing stock
router.put('/entry/closing', authorize(['cashier', 'manager', 'admin']), async (req, res, next) => {
  try {
    const { productId, branchId, closingStock, date } = req.body;

    if (!productId || !branchId || closingStock === undefined || !date) {
      res.status(400).json({ error: 'productId, branchId, closingStock, and date are required' });
      return;
    }

    const entry = await inventoryService.recordClosingStock(
      productId,
      branchId,
      closingStock,
      date
    );

    // Invalidate caches after closing stock update
    clearCache(`/dashboard/branch/${branchId}`);
    clearCache(`/dashboard/admin`);
    clearCache(`/inventory/history/${branchId}`);
    clearCache(`/inventory/current/${branchId}`);

    res.json(entry);
  } catch (error) {
    next(error);
  }
});

// Get stock history by branch
router.get('/history/:branchId', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const history = await inventoryService.getStockHistoryByBranch(
      req.params.branchId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Get stock history by date
router.get('/history/:branchId/:date', async (req, res, next) => {
  try {
    const history = await inventoryService.getStockHistoryByDate(req.params.branchId, req.params.date);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Get low stock products for branch
router.get('/low-stock/:branchId', async (req, res, next) => {
  try {
    const products = await inventoryService.getLowStockProducts(req.params.branchId);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Get current stock for branch
router.get('/current/:branchId', async (req, res, next) => {
  try {
    const stock = await inventoryService.getCurrentStockByBranch(req.params.branchId);
    res.json(stock);
  } catch (error) {
    next(error);
  }
});

// Update branch stock (admin only)
router.put('/stock/:branchId/:productId', authorize(['admin']), async (req, res, next) => {
  try {
    const { currentStock } = req.body;
    const { branchId, productId } = req.params;

    if (currentStock === undefined) {
      res.status(400).json({ error: 'currentStock is required' });
      return;
    }

    const stock = await inventoryService.updateBranchStock(branchId, productId, currentStock);

    res.json(stock);
  } catch (error) {
    console.error('Stock update error:', error.message, { branchId: req.params.branchId, productId: req.params.productId });
    next(error);
  }
});

export default router;
