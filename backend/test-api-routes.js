import 'dotenv/config';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const branchId = 'b2f1c741-b8e6-4bd9-8b8a-ebd48be05b13'; // Msabweni
const date = '2026-02-07';

async function testAPI() {
  console.log('Testing API Endpoints (Date: 2026-02-07)\n');

  try {
    // Test transactions endpoint
    console.log('1. GET /transactions/branch/:branchId/range');
console.log(`   URL: ${API_URL}/transactions/branch/${branchId}/range?startDate=${date}&endDate=${date}`);
    const txResponse = await fetch(
      `${API_URL}/transactions/branch/${branchId}/range?startDate=${date}&endDate=${date}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const txData = await txResponse.json();
    console.log(`   Status: ${txResponse.status}`);
    console.log(`   Result: ${Array.isArray(txData) ? txData.length + ' transactions' : 'Error: not an array'}`);
    if (Array.isArray(txData) && txData.length > 0) {
      const total = txData.reduce((sum, t) => sum + (t.total || 0), 0);
      console.log(`   Total Sales: KES ${total}`);
    }

    // Test expenses endpoint
    console.log('\n2. GET /expenses/branch/:branchId/range');
    const expResponse = await fetch(
      `${API_URL}/expenses/branch/${branchId}/range?startDate=${date}&endDate=${date}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const expData = await expResponse.json();
    console.log(`   Status: ${expResponse.status}`);
    console.log(`   Result: ${Array.isArray(expData) ? expData.length + ' expenses' : 'Error: not an array'}`);
    if (Array.isArray(expData) && expData.length > 0) {
      const total = expData.reduce((sum, e) => sum + (e.amount || 0), 0);
      console.log(`   Total Expenses: KES ${total}`);
    }

    // Test expenses by category endpoint
    console.log('\n3. GET /expenses/branch/:branchId/by-category');
    const catResponse = await fetch(
      `${API_URL}/expenses/branch/${branchId}/by-category?startDate=${date}&endDate=${date}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const catData = await catResponse.json();
    console.log(`   Status: ${catResponse.status}`);
    console.log(`   Result:`, catData);

    // Test stock history endpoint
    console.log('\n4. GET /inventory/history/:branchId/:date');
    const stockResponse = await fetch(
      `${API_URL}/inventory/history/${branchId}/${date}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const stockData = await stockResponse.json();
    console.log(`   Status: ${stockResponse.status}`);
    console.log(`   Result: ${Array.isArray(stockData) ? stockData.length + ' records' : 'Error: not an array'}`);
    if (Array.isArray(stockData) && stockData.length > 0) {
      const opening = stockData.reduce((sum, s) => sum + parseFloat(s.opening_stock || 0), 0);
      const closing = stockData.reduce((sum, s) => sum + parseFloat(s.closing_stock || 0), 0);
      console.log(`   Opening: ${opening} kg, Closing: ${closing} kg`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

testAPI();
