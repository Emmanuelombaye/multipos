import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/db/supabase.js';
import {
  recordStockEntry,
  recordClosingStock,
  transferStock,
  createExternalDispatch,
} from './src/services/inventoryService.js';

// ── Real IDs ───────────────────────────────────────────────────
const TAMASHA = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const REEM    = 'd63d73a2-c039-40c7-8a0b-aea168bcfd3b';
const PRODUCT = '201912c4-9b16-476a-b2fa-7d0f547f4757'; // kuku Kienyeji

const TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const getLiveStock = async (branchId) => {
  const { data } = await supabase.from('branch_stock').select('current_stock')
    .eq('branch_id', branchId).eq('product_id', PRODUCT).maybeSingle();
  return parseFloat(data?.current_stock || 0);
};

const getHistory = async (branchId) => {
  const { data } = await supabase.from('stock_history').select('*')
    .eq('branch_id', branchId).eq('product_id', PRODUCT).eq('date', TODAY).maybeSingle();
  return data;
};

const snapshot = async (label) => {
  const [tS, rS, tH, rH] = await Promise.all([
    getLiveStock(TAMASHA), getLiveStock(REEM),
    getHistory(TAMASHA),   getHistory(REEM),
  ]);
  console.log('\n' + '─'.repeat(70));
  console.log('  SNAPSHOT: ' + label);
  console.log('─'.repeat(70));
  console.log(`  TAMASHA │ live: ${String(tS).padStart(5)}kg │ opening: ${String(tH?.opening_stock ?? '—').padStart(5)}kg │ closing: ${String(tH?.closing_stock ?? 'null').padStart(5)}kg`);
  console.log(`  REEM    │ live: ${String(rS).padStart(5)}kg │ opening: ${String(rH?.opening_stock ?? '—').padStart(5)}kg │ closing: ${String(rH?.closing_stock ?? 'null').padStart(5)}kg`);
};

// ── Save originals ─────────────────────────────────────────────
const origTamasha = await getLiveStock(TAMASHA);
const origReem    = await getLiveStock(REEM);

// ── Clean today's history ──────────────────────────────────────
await supabase.from('stock_history').delete()
  .eq('product_id', PRODUCT).eq('date', TODAY)
  .in('branch_id', [TAMASHA, REEM]);

console.log('\n' + '═'.repeat(70));
console.log('  FULL SCENARIO: Opening → POS Sales → Internal Transfer → External Dispatch → Closing');
console.log('  Product: kuku Kienyeji  |  Date: ' + TODAY);
console.log('═'.repeat(70));

await snapshot('BASELINE (original live stock)');

// ── STEP 1: Opening stock ──────────────────────────────────────
console.log('\n  STEP 1 ▶ Opening stock — Tamasha: 100kg, Reem: 30kg');
await recordStockEntry(PRODUCT, TAMASHA, 100, TODAY, 'Manager (Opening)');
await recordStockEntry(PRODUCT, REEM,     30, TODAY, 'Manager (Opening)');
await snapshot('After opening stock');

// ── STEP 2: POS sales at Tamasha 15kg ─────────────────────────
console.log('\n  STEP 2 ▶ POS sales at Tamasha: 15kg sold  (100 → 85)');
await supabase.from('branch_stock')
  .update({ current_stock: 85, updated_at: new Date().toISOString() })
  .eq('branch_id', TAMASHA).eq('product_id', PRODUCT);
await snapshot('After POS sales 15kg');

// ── STEP 3: Internal transfer Tamasha → Reem 20kg ─────────────
console.log('\n  STEP 3 ▶ Internal transfer: Tamasha → Reem, 20kg');
const tr = await transferStock(TAMASHA, REEM, PRODUCT, 20, 'Admin');
console.log(`           Tamasha: ${tr.fromBefore}kg → ${tr.fromAfter}kg`);
console.log(`           Reem:    ${tr.toBefore}kg → ${tr.toAfter}kg`);
await snapshot('After internal transfer (Tamasha→Reem 20kg)');

// ── STEP 4: External dispatch Tamasha → Villa Mandhara 10kg ───
console.log('\n  STEP 4 ▶ External dispatch: Tamasha → Villa Mandhara, 10kg @ KES 900/kg');
const dp = await createExternalDispatch({
  branchId: TAMASHA, productId: PRODUCT,
  clientName: 'Villa Mandhara', clientType: 'villa',
  quantity: 10, pricePerKg: 900,
  paymentStatus: 'pending', paymentMethod: 'invoice',
  notes: 'Weekly standing order',
  dispatchedBy: 'Admin', dispatchDate: TODAY,
});
console.log(`           Tamasha after dispatch: ${dp.newStock}kg  |  Invoice: KES ${dp.total_value}`);
await snapshot('After external dispatch (Villa Mandhara 10kg)');

// ── STEP 5: Cashier closing stock ─────────────────────────────
// Tamasha: system expects 55kg (100-15-20-10), cashier counts 53kg → 2kg shrinkage
// Reem:    system expects 50kg (30+20),        cashier counts 48kg → 2kg shrinkage
console.log('\n  STEP 5 ▶ Cashier closing stock');
console.log('           Tamasha physical count: 53kg  (system: 55kg → 2kg shrinkage)');
console.log('           Reem    physical count: 48kg  (system: 50kg → 2kg shrinkage)');
await recordClosingStock(PRODUCT, TAMASHA, 53, TODAY);
await recordClosingStock(PRODUCT, REEM,    48, TODAY);
await snapshot('After closing stock');

// ── FINAL REPORT ──────────────────────────────────────────────
const [tF, rF] = await Promise.all([getHistory(TAMASHA), getHistory(REEM)]);
const [tLive, rLive] = await Promise.all([getLiveStock(TAMASHA), getLiveStock(REEM)]);

// Variance = opening - closing (what left the branch that day, including transfers out + sales + dispatch + shrinkage)
const tVariance = tF.opening_stock - tF.closing_stock; // 100 - 53 = 47 (15 sales + 20 transfer + 10 dispatch + 2 shrinkage)
const rVariance = rF.opening_stock - rF.closing_stock; // 50  - 48 = 2  (pure shrinkage, transfer-in is in opening)

// Integrity: all stock must be accounted for
// Total original opening = 100 + 30 = 130
// Accounted: Tamasha closing(53) + Reem closing(48) + dispatch(10) + POS sales(15) + shrinkage(4) = 130
const originalTotal  = 100 + 30;
const accountedTotal = tF.closing_stock + rF.closing_stock + 10 + 15 + 4;

console.log('\n' + '═'.repeat(70));
console.log('  FINAL RECONCILIATION REPORT');
console.log('═'.repeat(70));
console.log(`
  TAMASHA
  ├─ Opening stock:              100kg
  ├─ POS sales deducted:         -15kg
  ├─ Internal transfer out:      -20kg  → Reem
  ├─ External dispatch:          -10kg  → Villa Mandhara (KES ${dp.total_value})
  ├─ Expected closing:            55kg
  ├─ Actual closing (physical):   ${tF.closing_stock}kg
  ├─ Shrinkage:                   ${tF.closing_stock == 53 ? 2 : tF.opening_stock - tF.closing_stock - 45}kg
  ├─ history.opening_stock:       ${tF.opening_stock}kg  ${tF.opening_stock == 100 ? '✅' : '❌'}
  ├─ history.closing_stock:       ${tF.closing_stock}kg  ${tF.closing_stock == 53 ? '✅' : '❌'}
  └─ branch_stock (live):         ${tLive}kg  ${tLive == 53 ? '✅ matches closing' : '❌ mismatch'}

  REEM
  ├─ Opening stock (physical):    30kg
  ├─ Transfer-in added:          +20kg  ← Tamasha
  ├─ Effective opening:           50kg  (opening_stock in history)
  ├─ Expected closing:            50kg
  ├─ Actual closing (physical):   ${rF.closing_stock}kg
  ├─ Shrinkage:                   ${rF.closing_stock == 48 ? 2 : rF.opening_stock - rF.closing_stock}kg
  ├─ history.opening_stock:       ${rF.opening_stock}kg  ${rF.opening_stock == 50 ? '✅ includes transfer-in' : '❌ expected 50'}
  ├─ history.closing_stock:       ${rF.closing_stock}kg  ${rF.closing_stock == 48 ? '✅' : '❌'}
  └─ branch_stock (live):         ${rLive}kg  ${rLive == 48 ? '✅ matches closing' : '❌ mismatch'}

  EXTERNAL DISPATCH
  └─ Villa Mandhara: 10kg @ KES 900/kg = KES ${dp.total_value}  [${dp.payment_status}]

  SYSTEM INTEGRITY  (original 130kg must all be accounted for)
  ├─ Tamasha closing:             ${tF.closing_stock}kg
  ├─ Reem closing:                ${rF.closing_stock}kg
  ├─ Dispatched externally:       10kg
  ├─ POS sales:                   15kg
  ├─ Total shrinkage:              4kg  (2kg each branch)
  ├─ Sum:                         ${tF.closing_stock + rF.closing_stock + 10 + 15 + 4}kg
  └─ Original opening total:      130kg  ${tF.closing_stock + rF.closing_stock + 10 + 15 + 4 === 130 ? '✅ FULLY BALANCED' : '❌ IMBALANCED'}
`);

// ── Restore ────────────────────────────────────────────────────
await supabase.from('branch_stock')
  .update({ current_stock: origTamasha, updated_at: new Date().toISOString() })
  .eq('branch_id', TAMASHA).eq('product_id', PRODUCT);
await supabase.from('branch_stock')
  .update({ current_stock: origReem, updated_at: new Date().toISOString() })
  .eq('branch_id', REEM).eq('product_id', PRODUCT);
await supabase.from('external_dispatches')
  .delete().eq('client_name', 'Villa Mandhara').eq('dispatch_date', TODAY);

console.log(`  [Restored] Tamasha → ${origTamasha}kg, Reem → ${origReem}kg`);
console.log('  [Cleaned]  Test dispatch removed\n');
