import express from 'express';
import { supabase } from '../db/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { triggerManualAudit } from '../services/auditScheduler.js';

const router = express.Router();

// Get audit logs (admin only)
router.get('/logs', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data, error, count } = await supabase
      .from('system_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ data, count });
  } catch (error) {
    next(error);
  }
});

// Get latest audit status (admin only)
router.get('/status', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('system_audit_logs')
      .select('*')
      .eq('audit_type', 'daily_stock_audit')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    res.json(data || { message: 'No audit logs found' });
  } catch (error) {
    next(error);
  }
});

// Trigger manual audit (admin only)
router.post('/trigger', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    // Run audit in background
    triggerManualAudit().catch(err => {
      console.error('Manual audit failed:', err);
    });

    res.json({ message: 'Audit triggered successfully. Check logs for results.' });
  } catch (error) {
    next(error);
  }
});

export default router;
