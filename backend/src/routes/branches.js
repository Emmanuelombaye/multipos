import express from 'express';
import * as branchService from '../services/branchService.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all branches
router.get('/', async (req, res, next) => {
  try {
    const branches = await branchService.getAllBranches();
    res.json(branches);
  } catch (error) {
    next(error);
  }
});

// Get branch by ID with stats
router.get('/:id', async (req, res, next) => {
  try {
    const branch = await branchService.getBranchWithStats(req.params.id);
    res.json(branch);
  } catch (error) {
    next(error);
  }
});

// Create branch (admin only)
router.post('/', authorize(['admin']), async (req, res, next) => {
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
router.put('/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const branch = await branchService.updateBranch(req.params.id, req.body);
    res.json(branch);
  } catch (error) {
    next(error);
  }
});

export default router;
