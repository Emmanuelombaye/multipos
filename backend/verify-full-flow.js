import 'dotenv/config.js';
import { supabase } from './src/db/supabase.js';
import * as inventoryService from './src/services/inventoryService.js';
import * as transactionService from './src/services/transactionService.js';

const TAMASHA_ID = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const TODAY = new Date().toISOString().split('T')[0];

async function verifyFullFlow() {
    try {
        console.log('🚀 Starting Full Flow Verification (Sale -> Auto-Init History)...\n');

        // 1. Get a test product
        const { data: products } = await supabase.from('products').select('*').limit(1);
        const product = products[0];
        if (!product) throw new Error('No products found');
        console.log(`Using product: ${product.name} (${product.id})`);

        // 2. Clean up
        await supabase.from('stock_history').delete().eq('product_id', product.id).eq('branch_id', TAMASHA_ID).in('date', [YESTERDAY, TODAY]);

        // 3. Setup: Yesterday Closing = 25kg
        console.log(`Step 1: Setting yesterday's closing stock to 25kg...`);
        await inventoryService.recordClosingStock(product.id, TAMASHA_ID, 25, YESTERDAY);

        // 4. Action: Make a SALE today (should auto-init history)
        console.log(`Step 2: Performing a sale of 2.5kg today...`);
        const { data: users } = await supabase.from('users').select('id', 'role').limit(1); // Any user
        const adminId = users[0].id;

        await transactionService.createTransaction(TAMASHA_ID, adminId, [{
            productId: product.id,
            quantity: 2.5,
            pricePerKg: product.price_per_kg,
            subtotal: 2.5 * product.price_per_kg
        }], 'cash');

        // 5. Verify History Initialization
        console.log('\n--- Final Verification ---');
        const { data: history } = await supabase
            .from('stock_history')
            .select('*')
            .eq('product_id', product.id)
            .eq('branch_id', TAMASHA_ID)
            .eq('date', TODAY)
            .maybeSingle();

        if (!history) {
            throw new Error(`FAILURE: Today's history record was NOT created automatically by the sale.`);
        }

        console.log(`Today's History Record (Created by Sale):`);
        console.log(`- Opening Stock: ${history.opening_stock}kg (Expected: 25kg)`);
        console.log(`- Closing Stock: ${history.closing_stock ?? '--'} (Expected: --/null)`);

        if (parseFloat(history.opening_stock) === 25 && history.closing_stock === null) {
            console.log('\n✅ SUCCESS: Sale automatically initialized today\'s history with correct Opening Stock!');
        } else {
            console.error(`\n❌ FAILURE: history data mismatch.`);
        }

    } catch (error) {
        console.error('\n❌ Verification Error:', error.message);
    }
}

verifyFullFlow();
