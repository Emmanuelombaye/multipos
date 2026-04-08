import https from 'https';

const BACKEND_URL = 'https://multipos.onrender.com';

console.log('🔄 Waking up backend...\n');

function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Origin': 'https://edendrop001pos.vercel.app'
      }
    };

    https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    }).on('error', reject).end();
  });
}

async function testBackend() {
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing /health endpoint...');
    const health = await makeRequest(`${BACKEND_URL}/health`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${health.data}\n`);

    // Test 2: CORS check
    console.log('2️⃣ Testing CORS headers...');
    const cors = await makeRequest(`${BACKEND_URL}/api/branches`);
    console.log(`   Status: ${cors.status}`);
    console.log(`   CORS Header: ${cors.headers['access-control-allow-origin'] || 'MISSING ❌'}\n`);

    if (cors.headers['access-control-allow-origin']) {
      console.log('✅ Backend is UP and CORS is configured!');
    } else {
      console.log('⚠️ Backend is UP but CORS is NOT configured!');
      console.log('\n📝 Fix: Update FRONTEND_URL on Render to:');
      console.log('   https://edendrop001pos.vercel.app,https://edendrop001.vercel.app');
    }

  } catch (error) {
    console.error('❌ Backend is DOWN:', error.message);
    console.log('\n🔧 Solutions:');
    console.log('1. Go to https://dashboard.render.com');
    console.log('2. Find service: multipos');
    console.log('3. Click "Manual Deploy" → "Deploy latest commit"');
    console.log('4. Update FRONTEND_URL environment variable');
  }
}

testBackend();
