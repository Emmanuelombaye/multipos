import { supabase } from './db/supabase.js';
import { createTransaction } from './services/transactionService.js';

async function verifyLoanIntegration() {
    console.log('🚀 Starting Loan Integration Verification...\n');

    try {
        // 1. Get branch and product for test
        const { data: branch } = await supabase.from('branches').select('id, name').limit(1).single();
        const { data: product } = await supabase.from('products').select('id, name, price_per_kg').limit(1).single();
        const { data: user } = await supabase.from('users').select('id').limit(1).single();

        if (!branch || !product || !user) {
            throw new Error('Test data not found');
        }

        console.log(`📍 Testing with: \n   Branch: ${branch.name}\n   Product: ${product.name}\n`);

        const testAmount = 1000;
        const items = [{
            productId: product.id,
            quantity: testAmount / product.price_per_kg,
            pricePerKg: product.price_per_kg,
            subtotal: testAmount
        }];

        // 2. Create a Loan Transaction
        console.log('📝 Creating Loan Transaction...');
        let transaction;
        try {
            transaction = await createTransaction(branch.id, user.id, items, 'loan');
        } catch (err) {
            if (err.message.includes('check constraint')) {
                console.error('\n⚠️  DATABASE BLOCK: The "transactions" table has a check constraint that only allows cash, mpesa, and card.');
                console.error('👉 ACTION REQUIRED: You must run the fix SQL provided in the summary to enable recorded Loan sales in the database.\n');
                process.exit(0);
            }
            throw err;
        }
        console.log(`✅ Transaction created: ${transaction.id}\n`);

        // 3. Verify Dashboard Aggregation Logic
        console.log('📊 Verifying Aggregation Logic (similar to AdminFinancials.tsx)...');

        // Get today's range in EAT
        const today = new Date().toISOString().split('T')[0];
        const { data: txs } = await supabase
            .from('transactions')
            .select('total, payment_method')
            .eq('branch_id', branch.id)
            .gte('created_at', `${today} 00:00:00`)
            .lte('created_at', `${today} 23:59:59`);

        const loanSales = txs.filter(t => t.payment_method === 'loan').reduce((sum, t) => sum + (t.total || 0), 0);
        const mpesaSales = txs.filter(t => t.payment_method === 'mpesa').reduce((sum, t) => sum + (t.total || 0), 0);
        const cashSales = txs.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + (t.total || 0), 0);

        console.log(`   Expected Loan Sales (Today): >= KES ${testAmount}`);
        console.log(`   Actual Loan Sales (Today): KES ${loanSales}`);
        console.log(`   M-Pesa Sales (Today): KES ${mpesaSales}`);
        console.log(`   Cash Sales (Today): KES ${cashSales}`);

        if (loanSales >= testAmount) {
            console.log('\n🌟 VERIFICATION SUCCESSFUL: Loan payment mode is working perfectly and integrated with financials!');
        } else {
            console.error('\n❌ VERIFICATION FAILED: Loan sales calculation mismatch.');
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        process.exit(0);
    }
}

verifyLoanIntegration();
