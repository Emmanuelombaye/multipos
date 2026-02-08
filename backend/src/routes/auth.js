import express from 'express';
import * as authService from '../services/authService.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, branchId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const user = await authService.register(name, email, password, role, branchId);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Debug endpoint (can be removed later)
router.get('/check-user/:email', async (req, res, next) => {
  try {
    const { data: user, error } = await authService.checkUserExists(req.params.email);
    if (error) throw error;
    if (!user) {
      return res.status(404).json({ exists: false, message: 'User not found' });
    }
    res.json({
      exists: true,
      role: user.role,
      branchId: user.branch_id,
      status: user.status
    });
  } catch (error) {
    next(error);
  }
});

export default router;
