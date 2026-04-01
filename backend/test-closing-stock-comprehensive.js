import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/db/supabase.js';
import {
  recordStockEntry,
  recordClosingStock,
  ensureDailyHistory,
  addStock,
} from './src/services/inventoryService.js';

const TAMASHA = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const PRODUCT  = '201912c4-9b16-476a-b2fa-7d0f547f4757'; // kuku Kienyeji

const TODAY     = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const YESTERDAY = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); })();
const TOMORROW  = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); })();

let passed = 0;
let failed = 0;
const failures = [];

const assert = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✅  ${label}${detail ? '  →  ' + detail : ''}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}${detail ? '  →  ' + detail : ''}`);
    failed++;
    failures.push(label);
  }
};

const getLiveStock = async () => {
  const { data } = await supabase.from('branch_stock').select('current_stock')
    .eq('branch_id', TAMASHA).eq('product_id', PRODUCT).maybeSingle();
  return parseFloat(data?.current_stock ?? 0);
};

const getHistory = async (date) => {
  const { data } = await supabase.from('stock_history').select('*')
    .eq('branch_id', TAMASHA).eq('product_id', PRODUCT).eq('date', date).maybeSingle();
  return data;
};

const cleanDate = async (date) => {
  await supabase.from('stock_history').delete()
    .eq('branch_id', TAMASHA).eq('product_id', PRODUCT).eq('date', date);
};

// Save originals
const origStock = await getLiveStock();
const origYesterdayHist = await getHistory(YESTERDAY);

console.log('\n' + '═'.repeat(68));
console.log('  OPENING & CLOSING STOCK — COMPREHENSIVE EDGE CASE TEST');
console.log('  Branch: Edendrop Tamasha  |  Product: kuku Kienyeji');
console.log('═'.repeat(68));
console.log(`  Today: ${TODAY}  |  Yesterday: ${YESTERDAY}  |  Tomorrow: ${TOMORROW}`);
console.log(`  Original live stock: ${origStock}kg\n`);

// ── Clean slate ────────────────────────────────────────────────
await cleanDate(TODAY);
await cleanDate(TOMORROW);

// ══════════════════════════════════════════════════════════════
// TEST 1: Record opening stock — creates history row + syncs branch_stock
// ══════════════════════════════════════════════════════════════
console.log('── TEST 1: Record opening stock ─────────────────────────────');
await recordStockEntry(PRODUCT, TAMASHA, 100, TODAY, 'Manager John');
const h1 = await getHistory(TODAY);
const live1 = await getLiveStock();

assert('History row created for today',           h1 !== null);
assert('opening_stock = 100',                     h1?.opening_stock == 100,       `got ${h1?.opening_stock}`);
assert('closing_stock = null (not yet closed)',   h1?.closing_stock === null,     `got ${h1?.closing_stock}`);
assert('added_by = Manager John',                 h1?.added_by === 'Manager John', `got ${h1?.added_by}`);
assert('branch_stock synced to 100',              live1 === 100,                  `got ${live1}`);

// ══════════════════════════════════════════════════════════════
// TEST 2: Re-record opening stock (manager corrects a mistake)
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 2: Re-record opening stock (correction) ────────────');
await recordStockEntry(PRODUCT, TAMASHA, 95, TODAY, 'Manager John (corrected)');
const h2 = await getHistory(TODAY);
const live2 = await getLiveStock();
const { count: rowCount } = await supabase.from('stock_history').select('*', { count: 'exact', head: true })
  .eq('branch_id', TAMASHA).eq('product_id', PRODUCT).eq('date', TODAY);

assert('No duplicate row created (still 1 row)',  rowCount === 1,                 `got ${rowCount} rows`);
assert('opening_stock updated to 95',             h2?.opening_stock == 95,        `got ${h2?.opening_stock}`);
assert('branch_stock synced to 95',               live2 === 95,                   `got ${live2}`);

// ══════════════════════════════════════════════════════════════
// TEST 3: Simulate POS sales (branch_stock deducted, history untouched)
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 3: POS sales deduct branch_stock, history untouched ');
await supabase.from('branch_stock')
  .update({ current_stock: 70, updated_at: new Date().toISOString() })
  .eq('branch_id', TAMASHA).eq('product_id', PRODUCT);
const h3 = await getHistory(TODAY);
const live3 = await getLiveStock();

assert('branch_stock = 70 after sales',           live3 === 70,                   `got ${live3}`);
assert('history opening_stock still 95',          h3?.opening_stock == 95,        `got ${h3?.opening_stock}`);
assert('history closing_stock still null',        h3?.closing_stock === null,     `got ${h3?.closing_stock}`);

// ══════════════════════════════════════════════════════════════
// TEST 4: Record closing stock
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 4: Record closing stock ─────────────────────────────');
await recordClosingStock(PRODUCT, TAMASHA, 68, TODAY, 'Cashier Alice');
const h4 = await getHistory(TODAY);
const live4 = await getLiveStock();

assert('closing_stock = 68',                      h4?.closing_stock == 68,        `got ${h4?.closing_stock}`);
assert('opening_stock unchanged at 95',           h4?.opening_stock == 95,        `got ${h4?.opening_stock}`);
assert('added_by = Cashier Alice',                h4?.added_by === 'Cashier Alice', `got ${h4?.added_by}`);
assert('branch_stock synced to 68 (physical)',    live4 === 68,                   `got ${live4}`);
assert('variance = 27kg (95-68)',                 (h4?.opening_stock - h4?.closing_stock) === 27, `got ${h4?.opening_stock - h4?.closing_stock}`);

// ══════════════════════════════════════════════════════════════
// TEST 5: Re-submit closing stock (cashier corrects count)
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 5: Re-submit closing stock (correction) ────────────');
await recordClosingStock(PRODUCT, TAMASHA, 65, TODAY, 'Cashier Alice (corrected)');
const h5 = await getHistory(TODAY);
const live5 = await getLiveStock();

assert('closing_stock updated to 65',             h5?.closing_stock == 65,        `got ${h5?.closing_stock}`);
assert('branch_stock updated to 65',              live5 === 65,                   `got ${live5}`);
assert('opening_stock still 95',                  h5?.opening_stock == 95,        `got ${h5?.opening_stock}`);

// ══════════════════════════════════════════════════════════════
// TEST 6: Next-day auto-init inherits today's closing stock
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 6: Next-day auto-init inherits closing stock ────────');
await cleanDate(TOMORROW);
const tomorrowHist = await ensureDailyHistory(PRODUCT, TAMASHA, TOMORROW);

assert('Tomorrow history row created',            tomorrowHist !== null);
assert('Tomorrow opening = today closing (65)',   tomorrowHist?.opening_stock == 65, `got ${tomorrowHist?.opening_stock}`);
assert('Tomorrow closing = null',                 tomorrowHist?.closing_stock === null);
assert('Tomorrow added_by = System (Auto-Init)', tomorrowHist?.added_by === 'System (Auto-Init)', `got ${tomorrowHist?.added_by}`);

// ══════════════════════════════════════════════════════════════
// TEST 7: ensureDailyHistory is idempotent (calling twice = same row)
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 7: ensureDailyHistory is idempotent ─────────────────');
const tomorrowHist2 = await ensureDailyHistory(PRODUCT, TAMASHA, TOMORROW);
const { count: tomorrowCount } = await supabase.from('stock_history').select('*', { count: 'exact', head: true })
  .eq('branch_id', TAMASHA).eq('product_id', PRODUCT).eq('date', TOMORROW);

assert('Same row returned on second call',        tomorrowHist2?.id === tomorrowHist?.id, `ids match: ${tomorrowHist2?.id === tomorrowHist?.id}`);
assert('Still only 1 row for tomorrow',           tomorrowCount === 1,             `got ${tomorrowCount}`);

// ══════════════════════════════════════════════════════════════
// TEST 8: addStock (delivery arrives mid-day) updates opening_stock
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 8: addStock (mid-day delivery) ──────────────────────');
// Reset today to a clean state for this test
await cleanDate(TODAY);
await supabase.from('branch_stock').update({ current_stock: 50 }).eq('branch_id', TAMASHA).eq('product_id', PRODUCT);
await recordStockEntry(PRODUCT, TAMASHA, 50, TODAY, 'Manager');
await addStock(TAMASHA, PRODUCT, 30, 'Delivery Driver');

const h8 = await getHistory(TODAY);
const live8 = await getLiveStock();

assert('branch_stock = 80 after delivery',        live8 === 80,                   `got ${live8}`);
assert('opening_stock updated to 80 (50+30)',     h8?.opening_stock == 80,        `got ${h8?.opening_stock}`);

// ══════════════════════════════════════════════════════════════
// TEST 9: No opening stock recorded — ensureDailyHistory falls back to branch_stock
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 9: No opening stock — auto-init from branch_stock ───');
await cleanDate(TODAY);
await supabase.from('branch_stock').update({ current_stock: 42 }).eq('branch_id', TAMASHA).eq('product_id', PRODUCT);
// Don't record opening stock — simulate manager forgetting
const autoHist = await ensureDailyHistory(PRODUCT, TAMASHA, TODAY);

assert('Auto-init row created',                   autoHist !== null);
assert('opening_stock = 42 (from branch_stock)',  autoHist?.opening_stock == 42,  `got ${autoHist?.opening_stock}`);
assert('added_by = System (Auto-Init)',           autoHist?.added_by === 'System (Auto-Init)');

// ══════════════════════════════════════════════════════════════
// TEST 10: Closing stock without prior opening stock (cashier submits cold)
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 10: Closing stock with no prior opening stock ───────');
await cleanDate(TODAY);
await supabase.from('branch_stock').update({ current_stock: 35 }).eq('branch_id', TAMASHA).eq('product_id', PRODUCT);
// No opening stock recorded — cashier submits closing directly
await recordClosingStock(PRODUCT, TAMASHA, 30, TODAY, 'Cashier Bob');
const h10 = await getHistory(TODAY);
const live10 = await getLiveStock();

assert('History row created via auto-init',       h10 !== null);
assert('opening_stock auto-set from branch_stock (35)', h10?.opening_stock == 35, `got ${h10?.opening_stock}`);
assert('closing_stock = 30',                      h10?.closing_stock == 30,       `got ${h10?.closing_stock}`);
assert('branch_stock synced to 30',               live10 === 30,                  `got ${live10}`);
assert('added_by = Cashier Bob',                  h10?.added_by === 'Cashier Bob', `got ${h10?.added_by}`);

// ══════════════════════════════════════════════════════════════
// TEST 11: Yesterday had no closing stock — today auto-init falls back to branch_stock
// ══════════════════════════════════════════════════════════════
console.log('\n── TEST 11: Yesterday no closing → today falls back to branch_stock');
// Ensure yesterday has no closing stock
if (origYesterdayHist) {
  await supabase.from('stock_history').update({ closing_stock: null })
    .eq('id', origYesterdayHist.id);
}
await cleanDate(TODAY);
await supabase.from('branch_stock').update({ current_stock: 55 }).eq('branch_id', TAMASHA).eq('product_id', PRODUCT);
const h11 = await ensureDailyHistory(PRODUCT, TAMASHA, TODAY);

assert('Auto-init created',                       h11 !== null);
assert('opening_stock = 55 (branch_stock fallback)', h11?.opening_stock == 55,   `got ${h11?.opening_stock}`);

// Restore yesterday if it existed
if (origYesterdayHist?.closing_stock !== null && origYesterdayHist?.closing_stock !== undefined) {
  await supabase.from('stock_history').update({ closing_stock: origYesterdayHist.closing_stock })
    .eq('id', origYesterdayHist.id);
}

// ══════════════════════════════════════════════════════════════
// CLEANUP & SUMMARY
// ══════════════════════════════════════════════════════════════
await cleanDate(TODAY);
await cleanDate(TOMORROW);
await supabase.from('branch_stock')
  .update({ current_stock: origStock, updated_at: new Date().toISOString() })
  .eq('branch_id', TAMASHA).eq('product_id', PRODUCT);

console.log('\n' + '═'.repeat(68));
console.log(`  RESULTS:  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
if (failures.length > 0) {
  console.log('\n  FAILED:');
  failures.forEach(f => console.log('    ❌ ' + f));
} else {
  console.log('  All tests passed — opening & closing stock is solid ✅');
}
console.log(`  [Restored] branch_stock → ${origStock}kg`);
console.log('═'.repeat(68) + '\n');
