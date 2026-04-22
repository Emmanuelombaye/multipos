import express from 'express';
import * as productService from '../services/productService.js';
import * as inventoryService from '../services/inventoryService.js';
import { authorize } from '../middleware/auth.js';
import { clearCache } from '../middleware/cache.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Get products with current stock for branch
router.get('/stock/:branchId', async (req, res, next) => {
  try {
    const products = await productService.getProductsWithStock(req.params.branchId);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Get products available in a specific branch (only products with branch_stock)
router.get('/branch/:branchId', async (req, res, next) => {
  try {
    const products = await productService.getBranchProducts(req.params.branchId);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Add product to a specific branch (admin only)
router.post('/branch/:branchId', authorize(['admin']), async (req, res, next) => {
  try {
    const { name, category, pricePerKg, discountPricePerKg, lowStockThreshold, image, initialStock } = req.body;

    if (!name || !category || !pricePerKg) {
      res.status(400).json({ error: 'Name, category, and pricePerKg are required' });
      return;
    }

    const product = await productService.addProductToBranch(req.params.branchId, {
      name,
      category,
      pricePerKg,
      discountPricePerKg,
      lowStockThreshold,
      image,
      initialStock,
    });

    // Invalidate caches
    clearCache('/products');
    clearCache('/inventory');

    res.status(201).json(product);
  } catch (error) {
    if (error.message === 'Product already exists in this branch') {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

// Remove product from a specific branch (admin only)
router.delete('/:productId/branch/:branchId', authorize(['admin']), async (req, res, next) => {
  try {
    await productService.removeProductFromBranch(req.params.branchId, req.params.productId);

    // Invalidate caches
    clearCache('/products');
    clearCache('/inventory');

    res.json({ message: 'Product removed from branch successfully' });
  } catch (error) {
    next(error);
  }
});

// Get product by ID (must be after branch-specific routes)
router.get('/:id', async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Create product (admin only)
router.post('/', authorize(['admin']), async (req, res, next) => {
  try {
    const { name, category, pricePerKg, discountPricePerKg, lowStockThreshold, image } = req.body;

    if (!name || !category || !pricePerKg) {
      res.status(400).json({ error: 'Name, category, and pricePerKg are required' });
      return;
    }

    const product = await productService.createProduct(
      name,
      category,
      pricePerKg,
      discountPricePerKg,
      lowStockThreshold,
      image
    );

    // Invalidate product caches
    clearCache('/products');

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// Update product (admin only)
router.put('/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);

    // Invalidate product caches
    clearCache('/products');

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Delete product (admin only)
router.delete('/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const product = await productService.deleteProduct(req.params.id);

    // Invalidate all product and inventory caches
    clearCache('/products');
    clearCache('/inventory');

    res.json({ message: 'Product deleted successfully', product });
  } catch (error) {
    next(error);
  }
});

// Update branch-specific product details (admin only)
router.put('/branch/:branchId/:productId', authorize(['admin']), async (req, res, next) => {
  try {
    const product = await productService.updateBranchProduct(req.params.branchId, req.params.productId, req.body);

    // Invalidate caches
    clearCache('/products');

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Add stock to branch product (admin only)
router.post('/branch/:branchId/:productId/stock', authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { amount } = req.body;
    const addedBy = req.user?.name || 'Admin';

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const result = await inventoryService.addStock(req.params.branchId, req.params.productId, amount, addedBy);

    // Invalidate caches
    clearCache('/inventory');
    clearCache('/products');

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
