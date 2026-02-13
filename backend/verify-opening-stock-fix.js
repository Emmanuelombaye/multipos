import 'dotenv/config.js';
import { supabase } from './src/db/supabase.js';
import * as inventoryService from './src/services/inventoryService.js';
import * as transactionService from './src/services/transactionService.js';

const TAMASHA_ID = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const TODAY = new Date().toISOString().split('T')[0];

async function verifyOpeningStockFix() {
    try {
        console.log('🚀 Starting Opening Stock Fix Verification...\n');

        // 1. Get a test product
        const { data: products } = await supabase.from('products').select('*').limit(1);
        const product = products[0];
        if (!product) throw new Error('No products found');
        console.log(`Using product: ${product.name} (${product.id})`);

        // 2. Clean up any existing history for today/yesterday for this product to ensure a fresh test
        await supabase.from('stock_history').delete().eq('product_id', product.id).eq('branch_id', TAMASHA_ID).in('date', [YESTERDAY, TODAY]);

        // 3. Record YESTERDAY'S closing stock as 10kg
        console.log(`Step 1: Recording YESTERDAY'S (${YESTERDAY}) closing stock as 10kg...`);
        await inventoryService.recordClosingStock(product.id, TAMASHA_ID, 10, YESTERDAY);

        // 4. Simulate a SALE today of 3kg (reducing branch_stock to 7kg)
        console.log('Step 2: Simulating a SALE today of 3kg...');
        // Manually update branch_stock to simulate a sale without creating a full transaction record if unnecessary,
        // but let's use the service to be realistic.
        const { data: users } = await supabase.from('users').select('id').eq('role', 'admin').limit(1);
        const adminId = users[0].id;
        await transactionService.createTransaction(TAMASHA_ID, adminId, [{
            productId: product.id,
            quantity: 3,
            pricePerKg: product.price_per_kg,
            subtotal: 3 * product.price_per_kg
        }], 'cash');

        const { data: midStock } = await supabase.from('branch_stock').select('current_stock').eq('branch_id', TAMASHA_ID).eq('product_id', product.id).single();
        console.log(`Current live branch_stock is now: ${midStock.current_stock}kg`);

        // 5. Record TODAY'S closing stock
        console.log(`Step 3: Recording TODAY'S (${TODAY}) closing stock as 7kg...`);
        await inventoryService.recordClosingStock(product.id, TAMASHA_ID, 7, TODAY);

        // 6. Verify TODAY'S opening stock in history
        console.log('\n--- Final Verification ---');
        const { data: todayHistory } = await supabase
            .from('stock_history')
            .select('*')
            .eq('product_id', product.id)
            .eq('branch_id', TAMASHA_ID)
            .eq('date', TODAY)
            .single();

        console.log(`Today's History Record:`);
        console.log(`- Opening Stock: ${todayHistory.opening_stock}kg`);
        console.log(`- Closing Stock: ${todayHistory.closing_stock}kg`);

        if (parseFloat(todayHistory.opening_stock) === 10) {
            console.log('\n✅ SUCCESS: Opening stock correctly inherited from yesterday/s closing (10kg)!');
        } else {
            console.error(`\n❌ FAILURE: Opening stock is ${todayHistory.opening_stock}kg, expected 10kg.`);
            console.log('Reason: The system incorrectly took the live stock (7kg) instead of yesterday/s closing (10kg).');
        }

    } catch (error) {
        console.error('\n❌ Verification Error:', error.message);
    }
}

verifyOpeningStockFix();
