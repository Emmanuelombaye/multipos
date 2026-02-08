// Simple Node script to record closing stock
const tamashaBranchId = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const date = '2026-02-08';
const closingStock = 20;

async function recordClosingStock() {
  try {
    // Login
    console.log('Logging in...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cashier1@butchery.com', password: 'password123' })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      process.exit(1);
    }
    
    const auth = await loginRes.json();
    const token = auth.token;
    console.log(`Logged in as: ${auth.user.name}`);
    
    // Get products
    console.log('Fetching products...');
    const prodRes = await fetch('http://localhost:5000/api/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const products = await prodRes.json();
    console.log(`Found ${products.length} products\n`);
    
    // Record closing stock
    console.log('Recording closing stock (20kg)...');
    let success = 0, failed = 0;
    
    for (const prod of products) {
    const stockRes = await fetch('http://localhost:5000/api/inventory/entry/closing', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: prod.id,
          branchId: tamashaBranchId,
          closingStock: closingStock,
          date: date
        })
      });
      
      if (stockRes.ok) {
        console.log(`  ✓ ${prod.name}`);
        success++;
      } else {
        console.log(`  ✗ ${prod.name}: ${await stockRes.text()}`);
        failed++;
      }
    }
    
    console.log(`\nDone: ${success} success, ${failed} failed`);
    console.log('\nNow login as Admin and check Financials > Tamasha > Date: 2026-02-08');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

recordClosingStock();
