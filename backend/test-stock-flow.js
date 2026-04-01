import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/db/supabase.js';
import {
  ensureDailyHistory,
  recordStockEntry,
  recordClosingStock,
} from './src/services/inventoryService.js';

const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const log = (label, data) => {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(60));
  if (data) console.log(JSON.stringify(data, null, 2));
};

async function run() {
  const today = getKenyaDate();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  OPENING & CLOSING STOCK TEST  —  ${today}`);
  console.log(`${'═'.repeat(60)}`);

  // ── 1. Fetch one real branch and one real product ──────────────
  const { data: branches } = await supabase.from('branches').select('id, name').limit(1).single();
  const { data: products } = await supabase.from('products').select('id, name').limit(1).single();

  if (!branches || !products) {
    console.error('No branches or products found in database. Seed data first.');
    process.exit(1);
  }

  const branchId  = branches.id;
  const productId = products.id;

  log('TEST TARGET', { branch: branches.name, product: products.name, date: today });

  // ── 2. Read current branch_stock BEFORE anything ──────────────
  const { data: stockBefore } = await supabase
    .from('branch_stock')
    .select('current_stock')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .maybeSingle();

  log('STEP 1 — branch_stock BEFORE test', {
    current_stock: stockBefore?.current_stock ?? 'no row yet'
  });

  // ── 3. Delete today's stock_history row so we start clean ─────
  await supabase
    .from('stock_history')
    .delete()
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .eq('date', today);

  console.log('\n  [Cleaned] Removed any existing stock_history row for today');

  // ── 4. Record OPENING STOCK = 80kg ────────────────────────────
  log('STEP 2 — Recording OPENING STOCK = 80kg');
  const openingEntry = await recordStockEntry(productId, branchId, 80, today, 'Test (Opening)');
  log('RESULT — stock_history row created', {
    id: openingEntry.id,
    date: openingEntry.date,
    opening_stock: openingEntry.opening_stock,
    closing_stock: openingEntry.closing_stock,
    added_by: openingEntry.added_by,
  });

  // ── 5. Read branch_stock after opening ────────────────────────
  const { data: stockAfterOpening } = await supabase
    .from('branch_stock')
    .select('current_stock')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .maybeSingle();

  log('STEP 3 — branch_stock AFTER opening stock recorded', {
    current_stock: stockAfterOpening?.current_stock,
    expected: 80,
    match: stockAfterOpening?.current_stock == 80 ? '✅ CORRECT' : '❌ MISMATCH'
  });

  // ── 6. Simulate POS sales deducting 20kg ──────────────────────
  log('STEP 4 — Simulating POS sales: deducting 20kg from branch_stock');
  await supabase
    .from('branch_stock')
    .update({ current_stock: 60, updated_at: new Date().toISOString() })
    .eq('branch_id', branchId)
    .eq('product_id', productId);

  const { data: stockMidDay } = await supabase
    .from('branch_stock')
    .select('current_stock')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .maybeSingle();

  log('RESULT — branch_stock mid-day (after 20kg sold)', {
    current_stock: stockMidDay?.current_stock,
    expected: 60,
    match: stockMidDay?.current_stock == 60 ? '✅ CORRECT' : '❌ MISMATCH'
  });

  // ── 7. Record CLOSING STOCK = 58kg (physical count) ───────────
  log('STEP 5 — Recording CLOSING STOCK = 58kg (cashier physical count)');
  const closingEntry = await recordClosingStock(productId, branchId, 58, today);
  log('RESULT — stock_history row updated', {
    id: closingEntry.id,
    date: closingEntry.date,
    opening_stock: closingEntry.opening_stock,
    closing_stock: closingEntry.closing_stock,
    variance_kg: closingEntry.opening_stock - closingEntry.closing_stock,
    added_by: closingEntry.added_by,
  });

  // ── 8. Read branch_stock after closing ────────────────────────
  const { data: stockAfterClosing } = await supabase
    .from('branch_stock')
    .select('current_stock')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .maybeSingle();

  log('STEP 6 — branch_stock AFTER closing stock recorded', {
    current_stock: stockAfterClosing?.current_stock,
    expected: 58,
    match: stockAfterClosing?.current_stock == 58 ? '✅ CORRECT' : '❌ MISMATCH',
    note: 'branch_stock now reflects physical count, not POS-calculated count'
  });

  // ── 9. Simulate NEXT DAY — ensureDailyHistory auto-init ───────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  log(`STEP 7 — Simulating NEXT DAY (${tomorrowStr}) auto-init via ensureDailyHistory`);

  // Clean tomorrow first
  await supabase
    .from('stock_history')
    .delete()
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .eq('date', tomorrowStr);

  const tomorrowHistory = await ensureDailyHistory(productId, branchId, tomorrowStr);
  log('RESULT — tomorrow\'s stock_history auto-created', {
    date: tomorrowHistory?.date,
    opening_stock: tomorrowHistory?.opening_stock,
    closing_stock: tomorrowHistory?.closing_stock,
    added_by: tomorrowHistory?.added_by,
    expected_opening: 58,
    match: tomorrowHistory?.opening_stock == 58
      ? '✅ CORRECT — inherited from today\'s closing stock'
      : '❌ MISMATCH'
  });

  // ── 10. Cleanup tomorrow row ──────────────────────────────────
  await supabase
    .from('stock_history')
    .delete()
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .eq('date', tomorrowStr);

  // ── 11. Restore original branch_stock ─────────────────────────
  if (stockBefore?.current_stock !== undefined) {
    await supabase
      .from('branch_stock')
      .update({ current_stock: stockBefore.current_stock, updated_at: new Date().toISOString() })
      .eq('branch_id', branchId)
      .eq('product_id', productId);
    console.log(`\n  [Restored] branch_stock reset to original: ${stockBefore.current_stock}kg`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  TEST COMPLETE');
  console.log(`${'═'.repeat(60)}\n`);
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
