import { supabase } from './src/db/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function getTestData() {
  const { data: branches } = await supabase.from('branches').select('id, name').limit(1);
  const { data: products } = await supabase.from('products').select('id, name, price_per_kg, discount_price_per_kg').limit(1);
  const { data: users } = await supabase.from('users').select('id, email, role').eq('role', 'cashier').limit(1);

  console.log(JSON.stringify({
    branchId: branches?.[0]?.id,
    productId: products?.[0]?.id,
    cashierId: users?.[0]?.id,
    normalPrice: products?.[0]?.price_per_kg,
    discountPrice: products?.[0]?.discount_price_per_kg
  }, null, 2));
}

getTestData();
