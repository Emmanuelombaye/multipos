import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const BRANCH_ID = '092f7071-d8c2-4f4f-baa0-7c4879968374'; // Tamasha

async function testConcurrency() {
    console.log('--- Concurrency Test for Atomic Stock Reduction ---');

    // 1. Login
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice.cashier@example.com', password: 'password123' })
    });
    const { token } = await loginRes.json();

    // 2. Get initial stock
    const prodRes = await fetch(`${API_URL}/products/branch/${BRANCH_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const products = await prodRes.json();
    const product = products[0];
    const initialStock = parseFloat(product.current_stock);

    console.log(`Initial stock for ${product.name}: ${initialStock}kg`);

    // 3. Fire 5 concurrent transactions (0.5kg each)
    console.log('Sending 5 concurrent transactions...');
    const transactions = Array(5).fill(null).map(() =>
        fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                branchId: BRANCH_ID,
                items: [{
                    productId: product.id,
                    quantity: 0.5,
                    pricePerKg: product.price_per_kg,
                    subtotal: 0.5 * product.price_per_kg
                }],
                paymentMethod: 'cash'
            })
        })
    );

    await Promise.all(transactions);
    console.log('All transactions submitted.');

    // 4. Verify final stock
    const verifyRes = await fetch(`${API_URL}/products/branch/${BRANCH_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const updatedProducts = await verifyRes.json();
    const updatedProduct = updatedProducts.find(p => p.id === product.id);
    const finalStock = parseFloat(updatedProduct.current_stock);

    const expectedStock = initialStock - (5 * 0.5);
    console.log(`Final stock: ${finalStock}kg`);
    console.log(`Expected stock: ${expectedStock}kg`);

    if (finalStock === expectedStock) {
        console.log('✅ TEST PASSED: Atomic updates worked.');
    } else {
        console.log('❌ TEST FAILED: Race condition detected!');
    }
}

testConcurrency().catch(console.error);
