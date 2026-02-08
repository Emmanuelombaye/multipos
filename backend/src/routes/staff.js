import express from 'express';
import { supabase } from '../db/supabase.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all staff
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, branch_id, status')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Get staff for branch
router.get('/branch/:branchId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, branch_id, status')
      .eq('branch_id', req.params.branchId)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Get staff by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, branch_id, status')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Update staff (admin/manager only)
router.put('/:id', authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.role !== undefined) updates.role = req.body.role;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, name, email, role, branch_id, status')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
