import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function fixReemOpening() {
    const today = '2026-02-17';
    const branchId = 'd63d73a2-c039-40c7-8a0b-aea168bcfd3b'; // Edendrop Reem

    // 1. Get current branch_stock (the CORRECT opening values)
    const { data: branchStock, error: bsErr } = await supabase
        .from('branch_stock')
        .select('product_id, current_stock, products:product_id(name)')
        .eq('branch_id', branchId);

    if (bsErr) { console.log('Error: ' + JSON.stringify(bsErr)); return; }

    // 2. Get today's stock_history (the WRONG opening values)
    const { data: history, error: hErr } = await supabase
        .from('stock_history')
        .select('id, product_id, opening_stock, products:product_id(name)')
        .eq('branch_id', branchId)
        .eq('date', today);

    if (hErr) { console.log('Error: ' + JSON.stringify(hErr)); return; }

    // Build lookup of current stock by product_id
    const currentStockMap = {};
    branchStock.forEach(bs => {
        currentStockMap[bs.product_id] = { stock: bs.current_stock, name: bs.products?.name };
    });

    console.log('=== PROPOSED CHANGES (Opening Stock -> Current Stock) ===');
    console.log('');

    const updates = [];
    for (const h of history) {
        const curr = currentStockMap[h.product_id];
        if (!curr) {
            console.log('SKIP: ' + (h.products?.name || h.product_id) + ' - No current stock found');
            continue;
        }
        const oldVal = h.opening_stock;
        const newVal = curr.stock;
        console.log((h.products?.name || 'Unknown') + ':  ' + oldVal + '  -->  ' + newVal);
        updates.push({ historyId: h.id, productId: h.product_id, newOpening: newVal, name: h.products?.name });
    }

    // Also check for products in branch_stock that DON'T have a stock_history entry
    const historyProductIds = new Set(history.map(h => h.product_id));
    for (const bs of branchStock) {
        if (!historyProductIds.has(bs.product_id)) {
            console.log((bs.products?.name || bs.product_id) + ':  (no entry) -->  ' + bs.current_stock + ' [NEW RECORD]');
            updates.push({ historyId: null, productId: bs.product_id, newOpening: bs.current_stock, name: bs.products?.name, isNew: true });
        }
    }

    console.log('');
    console.log('Total updates: ' + updates.length);

    // 3. Apply the updates
    console.log('');
    console.log('=== APPLYING CHANGES ===');

    let success = 0;
    let failed = 0;

    for (const u of updates) {
        if (u.isNew) {
            // Insert a new stock_history record
            const { error } = await supabase
                .from('stock_history')
                .insert({
                    product_id: u.productId,
                    branch_id: branchId,
                    date: today,
                    opening_stock: u.newOpening,
                    added_by: 'Admin (Corrected)'
                });
            if (error) {
                console.log('FAILED to insert for ' + u.name + ': ' + error.message);
                failed++;
            } else {
                console.log('INSERTED: ' + u.name + ' = ' + u.newOpening);
                success++;
            }
        } else {
            // Update existing stock_history record
            const { error } = await supabase
                .from('stock_history')
                .update({ opening_stock: u.newOpening, added_by: 'Admin (Corrected)' })
                .eq('id', u.historyId);
            if (error) {
                console.log('FAILED to update ' + u.name + ': ' + error.message);
                failed++;
            } else {
                console.log('UPDATED: ' + u.name + ' = ' + u.newOpening);
                success++;
            }
        }
    }

    console.log('');
    console.log('=== DONE === Success: ' + success + ' | Failed: ' + failed);
}

fixReemOpening().catch(e => console.log('FATAL: ' + e.message));
