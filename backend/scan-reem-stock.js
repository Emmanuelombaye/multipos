import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function scanReemStock() {
    const today = '2026-02-17';

    // 1. Find Reem branch
    const { data: branches, error: brErr } = await supabase
        .from('branches')
        .select('*')
        .ilike('name', '%reem%');

    if (brErr) { console.log('Error fetching branches: ' + JSON.stringify(brErr)); return; }
    if (!branches || branches.length === 0) {
        console.log('No branch found matching "Reem"');
        const { data: allBranches } = await supabase.from('branches').select('id, name, location, status');
        console.log('\nAll branches:\n' + JSON.stringify(allBranches, null, 2));
        return;
    }

    const reem = branches[0];
    console.log('Branch: ' + reem.name + ' | ID: ' + reem.id + ' | Location: ' + reem.location + ' | Status: ' + reem.status);

    // 2. Get stock_history for today
    const { data: history, error: hErr } = await supabase
        .from('stock_history')
        .select('*, products:product_id(name, category)')
        .eq('branch_id', reem.id)
        .eq('date', today);

    if (hErr) { console.log('Error: ' + JSON.stringify(hErr)); return; }

    console.log('\n=== STOCK HISTORY for ' + today + ' ===');
    if (!history || history.length === 0) {
        console.log('No stock_history records for today.');
    } else {
        history.forEach((h, i) => {
            console.log((i + 1) + '. ' + (h.products?.name || 'Unknown') + ' (' + (h.products?.category || '-') + ')');
            console.log('   Opening Stock: ' + h.opening_stock);
            console.log('   Closing Stock: ' + (h.closing_stock !== null ? h.closing_stock : '(not set)'));
            console.log('   Added By: ' + (h.added_by || '-'));
        });
    }

    // 3. Current branch_stock
    const { data: branchStock } = await supabase
        .from('branch_stock')
        .select('*, products:product_id(name, category)')
        .eq('branch_id', reem.id);

    console.log('\n=== CURRENT BRANCH STOCK ===');
    if (!branchStock || branchStock.length === 0) {
        console.log('No branch_stock records.');
    } else {
        branchStock.forEach((bs, i) => {
            console.log((i + 1) + '. ' + (bs.products?.name || 'Unknown') + ' - Current: ' + bs.current_stock + ' | Updated: ' + bs.updated_at);
        });
    }
}

scanReemStock().catch(e => console.log('FATAL: ' + e.message));
