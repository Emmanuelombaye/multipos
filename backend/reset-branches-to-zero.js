import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function resetToZero() {
  const { data: tamasha } = await supabase
    .from('branches')
    .select('*')
    .eq('name', 'Edendrop Tamasha')
    .single();

  const { data: msambweni } = await supabase
    .from('branches')
    .select('*')
    .eq('name', 'Edendrop Msambweni')
    .single();

  const branchIds = [tamasha.id, msambweni.id];
  const branchNames = ['Tamasha', 'Msambweni'];

  console.log('Resetting stock to zero for Tamasha and Msambweni...\n');

  for (let i = 0; i < branchIds.length; i++) {
    const branchId = branchIds[i];
    const branchName = branchNames[i];

    // Reset branch_stock to zero
    const { error: stockError } = await supabase
      .from('branch_stock')
      .update({ current_stock: 0, updated_at: new Date().toISOString() })
      .eq('branch_id', branchId);

    if (stockError) {
      console.error(`Error resetting ${branchName} stock:`, stockError);
      continue;
    }

    // Clear today's stock_history
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const { error: historyError } = await supabase
      .from('stock_history')
      .delete()
      .eq('branch_id', branchId)
      .eq('date', today);

    if (historyError) {
      console.error(`Error clearing ${branchName} history:`, historyError);
    }

    console.log(`✅ ${branchName}: All stock reset to 0`);
  }

  console.log('\n✅ Reset complete! Both branches now have zero stock.');
  console.log('You can now start fresh with new stock entries.');
  
  process.exit(0);
}

resetToZero();
