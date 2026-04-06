import axios from 'axios';

const API_BASE = 'https://edendrop001pos.vercel.app/api';

console.log('🔍 Checking if backend server is running...\n');

try {
  const response = await axios.get(`${API_BASE}/branches`, { timeout: 3000 });
  console.log('✅ Backend server is running!');
  console.log(`✅ Found ${response.data.length} branches\n`);
  console.log('👉 Now run: node test-mobile-e2e.js');
  process.exit(0);
} catch (error) {
  console.log('❌ Backend server is NOT running!\n');
  console.log('👉 Please start the server first:');
  console.log('   cd backend');
  console.log('   npm run dev\n');
  console.log('👉 Then run the test in a new terminal:');
  console.log('   node test-mobile-e2e.js\n');
  process.exit(1);
}
