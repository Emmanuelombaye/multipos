import 'dotenv/config.js';
import supabase from './src/db/supabase.js';
import * as inventoryService from './src/services/inventoryService.js';
import * as transactionService from './src/services/transactionService.js';

const TAMASHA_ID = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const TEST_DATE = new Date().toISOString().split('T')[0];

async function verifyFixes() {
    try {
        console.log('🚀 Starting Verification...\n');

        // 1. Get a test product
        const { data: products } = await supabase.from('products').select('*').limit(1);
        const product = products[0];
        if (!product) throw new Error('No products found');
        console.log(`Using product: ${product.name} (${product.id})`);

        // 2. Check initial stock
        const { data: initialStock } = await supabase
            .from('branch_stock')
            .select('current_stock')
            .eq('branch_id', TAMASHA_ID)
            .eq('product_id', product.id)
            .single();

        const openingStockVal = initialStock?.current_stock || 0;
        console.log(`Initial current_stock: ${openingStockVal}kg`);

        // 3. Test Transaction Stock Reduction
        console.log('\n--- Test 1: Transaction Stock Reduction ---');
        const saleItems = [{
            productId: product.id,
            quantity: 1.5,
            pricePerKg: product.price_per_kg,
            subtotal: 1.5 * product.price_per_kg
        }];

        // We use a dummy cashier ID (admin)
        const { data: users } = await supabase.from('users').select('id').eq('role', 'admin').limit(1);
        const adminId = users[0].id;

        console.log('Creating test transaction...');
        await transactionService.createTransaction(TAMASHA_ID, adminId, saleItems, 'cash');

        const { data: afterSaleStock } = await supabase
            .from('branch_stock')
            .select('current_stock')
            .eq('branch_id', TAMASHA_ID)
            .eq('product_id', product.id)
            .single();

        console.log(`Stock after sale: ${afterSaleStock.current_stock}kg`);
        if (parseFloat(afterSaleStock.current_stock) === openingStockVal - 1.5) {
            console.log('✅ Stock reduced correctly!');
        } else {
            console.error('❌ Stock reduction FAILED');
        }

        // 4. Test Closing Stock Fix & Sync
        console.log('\n--- Test 2: Closing Stock Fix & Sync ---');
        const NEW_CLOSING = 40.5;
        console.log(`Recording closing stock: ${NEW_CLOSING}kg for date ${TEST_DATE}...`);

        await inventoryService.recordClosingStock(product.id, TAMASHA_ID, NEW_CLOSING, TEST_DATE);
        console.log('✅ recordClosingStock call succeeded (No 500 error)');

        const { data: historyVerify } = await supabase
            .from('stock_history')
            .select('*')
            .eq('product_id', product.id)
            .eq('branch_id', TAMASHA_ID)
            .eq('date', TEST_DATE)
            .single();

        console.log(`History record: opening=${historyVerify.opening_stock}, closing=${historyVerify.closing_stock}`);

        const { data: branchStockVerify } = await supabase
            .from('branch_stock')
            .select('current_stock')
            .eq('branch_id', TAMASHA_ID)
            .eq('product_id', product.id)
            .single();

        console.log(`Current stock after sync: ${branchStockVerify.current_stock}kg`);
        if (parseFloat(branchStockVerify.current_stock) === NEW_CLOSING) {
            console.log('✅ branch_stock synced with closing stock correctly!');
        } else {
            console.error('❌ branch_stock sync FAILED');
        }

        console.log('\n✨ Verification Complete!');

    } catch (error) {
        console.error('\n❌ Verification Error:', error.message);
    }
}

verifyFixes();
