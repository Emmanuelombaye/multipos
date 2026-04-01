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
    console.log('[InventoryRoute] PUT /entry/closing', { productId, branchId, closingStock, date });

    if (!productId || !branchId || closingStock === undefined || !date) {
      res.status(400).json({ error: 'productId, branchId, closingStock, and date are required' });
      return;
    }

    const entry = await inventoryService.recordClosingStock(
      productId,
      branchId,
      closingStock,
      date,
      req.user?.name || req.user?.email || 'Cashier'
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

// Transfer stock between branches (admin/manager only)
router.post('/transfer', authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { fromBranchId, toBranchId, productId, quantity, notes } = req.body;

    if (!fromBranchId || !toBranchId || !productId || !quantity) {
      res.status(400).json({ error: 'fromBranchId, toBranchId, productId, and quantity are required' });
      return;
    }
    if (fromBranchId === toBranchId) {
      res.status(400).json({ error: 'Source and destination branches must be different' });
      return;
    }
    if (parseFloat(quantity) <= 0) {
      res.status(400).json({ error: 'Quantity must be greater than 0' });
      return;
    }

    const transferredBy = req.user?.name || req.user?.email || 'Admin';
    const result = await inventoryService.transferStock(fromBranchId, toBranchId, productId, quantity, transferredBy, notes);

    clearCache(`/inventory/current/${fromBranchId}`);
    clearCache(`/inventory/current/${toBranchId}`);
    clearCache(`/inventory/history/${fromBranchId}`);
    clearCache(`/inventory/history/${toBranchId}`);
    clearCache(`/inventory/transfers`);
    clearCache(`/dashboard/admin`);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get internal transfer audit log
router.get('/transfers', async (req, res, next) => {
  try {
    const { branchId, limit = 50, offset = 0 } = req.query;
    const result = await inventoryService.getStockTransfers(
      branchId || null,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// External dispatch (to hotels, schools, villas, etc.)
router.post('/dispatch', authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { branchId, productId, clientName, clientType, quantity, pricePerKg, paymentStatus, paymentMethod, notes, dispatchDate } = req.body;

    if (!branchId || !productId || !clientName || !clientType || !quantity || !pricePerKg || !dispatchDate) {
      res.status(400).json({ error: 'branchId, productId, clientName, clientType, quantity, pricePerKg, and dispatchDate are required' });
      return;
    }

    const dispatchedBy = req.user?.name || req.user?.email || 'Admin';
    const result = await inventoryService.createExternalDispatch({
      branchId, productId, clientName, clientType,
      quantity: parseFloat(quantity),
      pricePerKg: parseFloat(pricePerKg),
      paymentStatus, paymentMethod, notes, dispatchedBy, dispatchDate
    });

    clearCache(`/inventory/current/${branchId}`);
    clearCache(`/inventory/history/${branchId}`);
    clearCache(`/inventory/dispatches/${branchId}`);
    clearCache(`/dashboard/admin`);
    clearCache(`/dashboard/branch/${branchId}`);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Get dispatches for a branch (or all if no branchId)
router.get('/dispatches/:branchId', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await inventoryService.getExternalDispatches(
      req.params.branchId === 'all' ? null : req.params.branchId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update dispatch payment status
router.patch('/dispatch/:id/payment', authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    if (!paymentStatus) {
      res.status(400).json({ error: 'paymentStatus is required' });
      return;
    }
    const result = await inventoryService.updateDispatchPayment(req.params.id, paymentStatus, paymentMethod);
    res.json(result);
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
