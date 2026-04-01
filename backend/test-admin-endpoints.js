import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/db/supabase.js';
import * as branchService     from './src/services/branchService.js';
import * as productService    from './src/services/productService.js';
import * as transactionService from './src/services/transactionService.js';
import * as expenseService    from './src/services/expenseService.js';
import * as inventoryService  from './src/services/inventoryService.js';

const TAMASHA = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const REEM    = 'd63d73a2-c039-40c7-8a0b-aea168bcfd3b';

const TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const START = `${TODAY}T00:00:00+03:00`;
const END   = `${TODAY}T23:59:59+03:00`;

let passed = 0;
let failed = 0;
const failures = [];

const check = (section, endpoint, data, assertion, note = '') => {
  const ok = assertion(data);
  const status = ok ? '✅' : '❌';
  const label = `${status}  [${section}] ${endpoint}`;
  if (ok) {
    const preview = Array.isArray(data)
      ? `${data.length} records`
      : typeof data === 'object' && data !== null
        ? Object.keys(data).slice(0, 4).join(', ')
        : String(data);
    console.log(`${label}  →  ${preview}${note ? '  ' + note : ''}`);
    passed++;
  } else {
    console.log(`${label}  →  ${JSON.stringify(data)?.slice(0, 120)}${note ? '  ' + note : ''}`);
    failed++;
    failures.push(`[${section}] ${endpoint}`);
  }
};

console.log('\n' + '═'.repeat(72));
console.log('  ADMIN ENDPOINT TEST  —  All sections, real Supabase data');
console.log('  Date: ' + TODAY);
console.log('═'.repeat(72) + '\n');

// ══════════════════════════════════════════════════════════════
// 1. BRANCHES
// ══════════════════════════════════════════════════════════════
console.log('── BRANCHES ─────────────────────────────────────────────────');

const branches = await branchService.getAllBranches();
check('Branches', 'GET /branches', branches,
  d => Array.isArray(d) && d.length > 0);

const branch = await branchService.getBranchById(TAMASHA);
check('Branches', 'GET /branches/:id', branch,
  d => d?.id === TAMASHA, `name: ${branch?.name}`);

const branchWithStats = await branchService.getBranchWithStats(TAMASHA);
check('Branches', 'GET /branches/:id (with stats)', branchWithStats,
  d => d?.id === TAMASHA && 'todaySales' in d, `todaySales: KES ${branchWithStats?.todaySales}`);

// ══════════════════════════════════════════════════════════════
// 2. PRODUCTS
// ══════════════════════════════════════════════════════════════
console.log('\n── PRODUCTS ─────────────────────────────────────────────────');

const allProducts = await productService.getAllProducts();
check('Products', 'GET /products', allProducts,
  d => Array.isArray(d) && d.length > 0, `${allProducts?.length} products`);

const firstProduct = allProducts?.[0];
const productById = await productService.getProductById(firstProduct?.id);
check('Products', 'GET /products/:id', productById,
  d => d?.id === firstProduct?.id, `name: ${productById?.name}`);

const branchProducts = await productService.getBranchProducts(TAMASHA);
check('Products', 'GET /products/branch/:branchId', branchProducts,
  d => Array.isArray(d), `${branchProducts?.length} products in Tamasha`);

const productsWithStock = await productService.getProductsWithStock(TAMASHA);
check('Products', 'GET /products/stock/:branchId', productsWithStock,
  d => Array.isArray(d), `${productsWithStock?.length} products with stock`);

// ══════════════════════════════════════════════════════════════
// 3. INVENTORY
// ══════════════════════════════════════════════════════════════
console.log('\n── INVENTORY ────────────────────────────────────────────────');

const currentStock = await inventoryService.getCurrentStockByBranch(TAMASHA);
check('Inventory', 'GET /inventory/current/:branchId', currentStock,
  d => Array.isArray(d), `${currentStock?.length} products tracked`);

const currentStockReem = await inventoryService.getCurrentStockByBranch(REEM);
check('Inventory', 'GET /inventory/current/:branchId (Reem)', currentStockReem,
  d => Array.isArray(d), `${currentStockReem?.length} products tracked`);

const stockHistory = await inventoryService.getStockHistoryByBranch(TAMASHA, 10, 0);
check('Inventory', 'GET /inventory/history/:branchId', stockHistory,
  d => d && 'data' in d && Array.isArray(d.data), `${stockHistory?.count} total records`);

const stockHistoryByDate = await inventoryService.getStockHistoryByDate(TAMASHA, TODAY);
check('Inventory', 'GET /inventory/history/:branchId/:date', stockHistoryByDate,
  d => Array.isArray(d), `${stockHistoryByDate?.length} records for today`);

const lowStock = await inventoryService.getLowStockProducts(TAMASHA);
check('Inventory', 'GET /inventory/low-stock/:branchId', lowStock,
  d => Array.isArray(d), `${lowStock?.length} low stock items`);

const transfers = await inventoryService.getStockTransfers(null, 10, 0);
check('Inventory', 'GET /inventory/transfers (all)', transfers,
  d => d && 'data' in d, `${transfers?.count} transfer records`);

const transfersByBranch = await inventoryService.getStockTransfers(TAMASHA, 10, 0);
check('Inventory', 'GET /inventory/transfers?branchId=Tamasha', transfersByBranch,
  d => d && 'data' in d, `${transfersByBranch?.count} records involving Tamasha`);

const dispatches = await inventoryService.getExternalDispatches(null, 10, 0);
check('Inventory', 'GET /inventory/dispatches/all', dispatches,
  d => d && 'data' in d, `${dispatches?.count} dispatch records`);

const dispatchesByBranch = await inventoryService.getExternalDispatches(TAMASHA, 10, 0);
check('Inventory', 'GET /inventory/dispatches/:branchId', dispatchesByBranch,
  d => d && 'data' in d, `${dispatchesByBranch?.count} dispatches from Tamasha`);

// ══════════════════════════════════════════════════════════════
// 4. TRANSACTIONS
// ══════════════════════════════════════════════════════════════
console.log('\n── TRANSACTIONS ─────────────────────────────────────────────');

const txByBranch = await transactionService.getTransactionsByBranch(TAMASHA, 10, 0);
check('Transactions', 'GET /transactions/branch/:branchId', txByBranch,
  d => d && ('data' in d || Array.isArray(d)),
  `${Array.isArray(txByBranch) ? txByBranch.length : txByBranch?.data?.length} transactions`);

const txByRange = await transactionService.getTransactionsByDateRange(TAMASHA, START, END);
check('Transactions', 'GET /transactions/branch/:branchId/range', txByRange,
  d => Array.isArray(d), `${txByRange?.length} transactions today`);

const todaySalesTamasha = await transactionService.getTotalSalesByDay(TAMASHA);
check('Transactions', 'GET /transactions/branch/:branchId/today-sales', todaySalesTamasha,
  d => typeof d === 'number', `KES ${todaySalesTamasha}`);

const todaySalesReem = await transactionService.getTotalSalesByDay(REEM);
check('Transactions', 'GET /transactions/branch/:branchId/today-sales (Reem)', todaySalesReem,
  d => typeof d === 'number', `KES ${todaySalesReem}`);

// Get a real transaction ID for single-record test
const { data: sampleTx } = await supabase
  .from('transactions').select('id').eq('branch_id', TAMASHA).limit(1).maybeSingle();
if (sampleTx?.id) {
  const txById = await transactionService.getTransactionById(sampleTx.id);
  check('Transactions', 'GET /transactions/:id', txById,
    d => d?.id === sampleTx.id, `total: KES ${txById?.total}`);
} else {
  console.log('⚠️   [Transactions] GET /transactions/:id  →  no transactions exist yet');
}

// ══════════════════════════════════════════════════════════════
// 5. EXPENSES
// ══════════════════════════════════════════════════════════════
console.log('\n── EXPENSES ─────────────────────────────────────────────────');

const expByBranch = await expenseService.getExpensesByBranch(TAMASHA, 10, 0);
check('Expenses', 'GET /expenses/branch/:branchId', expByBranch,
  d => d && ('data' in d || Array.isArray(d)),
  `${Array.isArray(expByBranch) ? expByBranch.length : expByBranch?.data?.length} expenses`);

const expByRange = await expenseService.getExpensesByDateRange(TAMASHA, START, END);
check('Expenses', 'GET /expenses/branch/:branchId/range', expByRange,
  d => Array.isArray(d), `${expByRange?.length} expenses today`);

const todayExpenses = await expenseService.getTotalExpensesByDay(TAMASHA);
check('Expenses', 'GET /expenses/branch/:branchId/today-expenses', todayExpenses,
  d => typeof d === 'number', `KES ${todayExpenses}`);

const expByCategory = await expenseService.getExpensesByCategory(TAMASHA, START, END);
check('Expenses', 'GET /expenses/branch/:branchId/by-category', expByCategory,
  d => typeof d === 'object', `categories: ${Object.keys(expByCategory || {}).join(', ') || 'none today'}`);

// ══════════════════════════════════════════════════════════════
// 6. STAFF
// ══════════════════════════════════════════════════════════════
console.log('\n── STAFF ────────────────────────────────────────────────────');

const { data: allStaff } = await supabase
  .from('users').select('id, name, email, role, branch_id, status').order('name');
check('Staff', 'GET /staff', allStaff,
  d => Array.isArray(d) && d.length > 0, `${allStaff?.length} users`);

const { data: staffByBranch } = await supabase
  .from('users').select('id, name, email, role, branch_id, status')
  .eq('branch_id', TAMASHA).order('name');
check('Staff', 'GET /staff/branch/:branchId', staffByBranch,
  d => Array.isArray(d), `${staffByBranch?.length} staff at Tamasha`);

const firstStaff = allStaff?.[0];
if (firstStaff) {
  const { data: staffById } = await supabase
    .from('users').select('id, name, email, role, branch_id, status')
    .eq('id', firstStaff.id).single();
  check('Staff', 'GET /staff/:id', staffById,
    d => d?.id === firstStaff.id, `${staffById?.name} (${staffById?.role})`);
}

// ══════════════════════════════════════════════════════════════
// 7. DASHBOARD
// ══════════════════════════════════════════════════════════════
console.log('\n── DASHBOARD ────────────────────────────────────────────────');

// Admin dashboard — replicate the route logic directly
const { data: allBranches } = await supabase.from('branches').select('*');
const { data: allTx }       = await supabase.from('transactions').select('total');
const { data: allExp }      = await supabase.from('expenses').select('amount');
const { data: allBranchStock } = await supabase
  .from('branch_stock').select('*, products(low_stock_threshold)');

const adminStats = {
  totalBranches:  allBranches?.length || 0,
  activeBranches: allBranches?.filter(b => b.status === 'open').length || 0,
  total_sales:    allTx?.reduce((s, t) => s + (t.total || 0), 0) || 0,
  totalExpenses:  allExp?.reduce((s, e) => s + (e.amount || 0), 0) || 0,
  low_stock_count: new Set(
    (allBranchStock || [])
      .filter(i => i.current_stock < (i.products?.low_stock_threshold || 5))
      .map(i => i.product_id)
  ).size,
};
adminStats.profit = adminStats.total_sales - adminStats.totalExpenses;

check('Dashboard', 'GET /dashboard/admin — branches', adminStats,
  d => d.totalBranches > 0, `${adminStats.totalBranches} branches, ${adminStats.activeBranches} open`);
check('Dashboard', 'GET /dashboard/admin — financials', adminStats,
  d => typeof d.total_sales === 'number',
  `sales: KES ${adminStats.total_sales.toLocaleString()}  expenses: KES ${adminStats.totalExpenses.toLocaleString()}  profit: KES ${adminStats.profit.toLocaleString()}`);
check('Dashboard', 'GET /dashboard/admin — low stock', adminStats,
  d => typeof d.low_stock_count === 'number', `${adminStats.low_stock_count} products low`);

// Branch dashboard
const branchDash = await branchService.getBranchWithStats(TAMASHA);
check('Dashboard', 'GET /dashboard/branch/:branchId (Tamasha)', branchDash,
  d => d?.id === TAMASHA && 'todaySales' in d,
  `sales: KES ${branchDash?.todaySales}  expenses: KES ${branchDash?.todayExpenses}`);

const branchDashReem = await branchService.getBranchWithStats(REEM);
check('Dashboard', 'GET /dashboard/branch/:branchId (Reem)', branchDashReem,
  d => d?.id === REEM && 'todaySales' in d,
  `sales: KES ${branchDashReem?.todaySales}  expenses: KES ${branchDashReem?.todayExpenses}`);

// Metrics
const { data: metricsTx } = await supabase
  .from('transactions').select('total, created_at')
  .eq('branch_id', TAMASHA)
  .gte('created_at', `${TODAY} 00:00:00`).lte('created_at', `${TODAY} 23:59:59`);
const { data: metricsExp } = await supabase
  .from('expenses').select('amount, created_at')
  .eq('branch_id', TAMASHA)
  .gte('created_at', `${TODAY} 00:00:00`).lte('created_at', `${TODAY} 23:59:59`);
check('Dashboard', 'GET /dashboard/metrics/:branchId', { tx: metricsTx, exp: metricsExp },
  d => Array.isArray(d.tx) && Array.isArray(d.exp),
  `${metricsTx?.length} tx, ${metricsExp?.length} expenses today`);

// ══════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(72));
console.log(`  RESULTS:  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
if (failures.length > 0) {
  console.log('\n  FAILED ENDPOINTS:');
  failures.forEach(f => console.log('    ❌ ' + f));
}
console.log('═'.repeat(72) + '\n');
