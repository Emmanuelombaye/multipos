import { supabase } from './src/db/supabase.js';

async function resetStock() {
    const branchName = 'Edendrop Reem';
    const getKenyaDate = () => {
        const date = new Date();
        const kenyaOffset = 3 * 60 * 60 * 1000;
        const kenyaDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + kenyaOffset);
        return kenyaDate.toISOString().split('T')[0];
    };
    const today = getKenyaDate();

    console.log(`Starting stock reset for ${branchName} for date: ${today}...`);

    try {
        const { data: branch, error: branchError } = await supabase
            .from('branches')
            .select('id')
            .eq('name', branchName)
            .single();

        if (branchError || !branch) {
            console.error('Error: Branch not found.', branchError);
            return;
        }

        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name');

        if (prodError || !products) {
            console.error('Error fetching products:', prodError);
            return;
        }

        console.log(`Found ${products.length} products. Resetting...`);

        for (const product of products) {
            await supabase
                .from('branch_stock')
                .upsert({
                    branch_id: branch.id,
                    product_id: product.id,
                    current_stock: 0,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'branch_id,product_id' });

            const { data: existing } = await supabase
                .from('stock_history')
                .select('id')
                .eq('branch_id', branch.id)
                .eq('product_id', product.id)
                .eq('date', today)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('stock_history')
                    .update({
                        opening_stock: 0,
                        closing_stock: null,
                        added_by: 'Admin (Manual Reset)'
                    })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('stock_history')
                    .insert({
                        branch_id: branch.id,
                        product_id: product.id,
                        date: today,
                        opening_stock: 0,
                        added_by: 'Admin (Manual Reset)'
                    });
            }
        }

        console.log(`\n✅ Successfully reset all products in ${branchName} to 0 stock for ${today}.`);
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

resetStock();
