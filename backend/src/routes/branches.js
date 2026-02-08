import express from 'express';
import * as branchService from '../services/branchService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all branches
// Ensure this route is always public (no auth middleware)
router.get('/', (req, res, next) => {
  branchService.getAllBranches()
    .then(branches => res.json(branches))
    .catch(next);
});

// Get branch by ID with stats
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const branch = await branchService.getBranchWithStats(req.params.id);
    res.json(branch);
  } catch (error) {
    next(error);
  }
});

// Create branch (admin only)
router.post('/', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const { name, location } = req.body;

    if (!name || !location) {
      res.status(400).json({ error: 'Name and location are required' });
      return;
    }

    const branch = await branchService.createBranch(name, location);
    res.status(201).json(branch);
  } catch (error) {
    next(error);
  }
});

// Update branch (admin only)
router.put('/:id', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const branch = await branchService.updateBranch(req.params.id, req.body);
    res.json(branch);
  } catch (error) {
    next(error);
  }
});

export default router;
