import 'dotenv/config.js';
import { supabase } from './src/db/supabase.js';
import * as inventoryService from './src/services/inventoryService.js';
import * as transactionService from './src/services/transactionService.js';

const TAMASHA_ID = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const TODAY = new Date().toISOString().split('T')[0];

async function verifyAdditiveStock() {
    try {
        console.log('🚀 Starting Additive Opening Stock Verification...\n');

        // 1. Get a test product
        const { data: products } = await supabase.from('products').select('*').limit(1);
        const product = products[0];
        if (!product) throw new Error('No products found');
        console.log(`Using product: ${product.name} (${product.id})`);

        // 2. Clean up
        await supabase.from('stock_history').delete().eq('product_id', product.id).eq('branch_id', TAMASHA_ID).in('date', [YESTERDAY, TODAY]);

        // 3. Setup: Yesterday Closing = 10kg
        console.log(`Step 1: Setting yesterday's closing stock to 10kg...`);
        await inventoryService.recordClosingStock(product.id, TAMASHA_ID, 10, YESTERDAY);

        // 4. Action: Add 5kg today (Morning)
        console.log(`Step 2: Admin adding 5kg in the morning...`);
        await inventoryService.addStock(TAMASHA_ID, product.id, 5, 'Admin Morning');

        // 5. Check Opening Stock
        let { data: h1 } = await supabase.from('stock_history').select('*').eq('product_id', product.id).eq('branch_id', TAMASHA_ID).eq('date', TODAY).single();
        console.log(`- Opening Stock after morning addition: ${h1.opening_stock}kg (Expected: 15kg)`);

        if (parseFloat(h1.opening_stock) !== 15) {
            throw new Error(`Morning addition failed: expected 15, got ${h1.opening_stock}`);
        }

        // 6. Action: Simulate sale of 2kg
        console.log(`Step 3: Simulating sale of 2kg...`);
        const { data: users } = await supabase.from('users').select('id').eq('role', 'admin').limit(1);
        const adminId = users[0].id;
        await transactionService.createTransaction(TAMASHA_ID, adminId, [{
            productId: product.id,
            quantity: 2,
            pricePerKg: product.price_per_kg,
            subtotal: 2 * product.price_per_kg
        }], 'cash');

        // 7. Action: Add 3kg today (Afternoon)
        console.log(`Step 4: Admin adding 3kg in the afternoon...`);
        await inventoryService.addStock(TAMASHA_ID, product.id, 3, 'Admin Afternoon');

        // 8. Final Check
        let { data: h2 } = await supabase.from('stock_history').select('*').eq('product_id', product.id).eq('branch_id', TAMASHA_ID).eq('date', TODAY).single();
        console.log(`- Final Opening Stock: ${h2.opening_stock}kg (Expected: 18kg)`);

        if (parseFloat(h2.opening_stock) === 18) {
            console.log('\n✅ SUCCESS: Opening stock is additive and correctly inherits from yesterday!');
        } else {
            console.error(`\n❌ FAILURE: Final Opening stock is ${h2.opening_stock}kg, expected 18kg.`);
        }

    } catch (error) {
        console.error('\n❌ Verification Error:', error.message);
    }
}

verifyAdditiveStock();
