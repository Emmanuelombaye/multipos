import https from 'https';

const BACKEND_URL = 'https://multipos.onrender.com';
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

function pingServer() {
  const url = `${BACKEND_URL}/health`;
  
  https.get(url, (res) => {
    console.log(`[${new Date().toISOString()}] Ping: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Ping failed:`, err.message);
  });
}

// Ping immediately on start
console.log('🚀 Keep-alive service started');
console.log(`📡 Pinging ${BACKEND_URL} every 10 minutes`);
pingServer();

// Then ping every 10 minutes
setInterval(pingServer, PING_INTERVAL);
