import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');
  
  // Check stock_additions table
  console.log('📋 STOCK_ADDITIONS TABLE:');
  const { data: additions, error: addError } = await supabase
    .from('stock_additions')
    .select('*')
    .limit(1);
  
  if (addError) {
    console.log('❌ Error:', addError.message);
  } else if (additions && additions.length > 0) {
    console.log('Columns:', Object.keys(additions[0]).join(', '));
  } else {
    console.log('Table exists but is empty');
  }
  
  // Check external_dispatches table
  console.log('\n📋 EXTERNAL_DISPATCHES TABLE:');
  const { data: dispatches, error: dispatchError } = await supabase
    .from('external_dispatches')
    .select('*')
    .limit(1);
  
  if (dispatchError) {
    console.log('❌ Error:', dispatchError.message);
  } else if (dispatches && dispatches.length > 0) {
    console.log('Columns:', Object.keys(dispatches[0]).join(', '));
  } else {
    console.log('Table exists but is empty');
  }
}

checkSchema();
