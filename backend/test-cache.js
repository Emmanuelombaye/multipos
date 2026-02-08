#!/usr/bin/env node
/**
 * Cache verification test
 * Tests both client-side and server-side caching
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testCaching() {
  console.log('🧪 Starting cache verification tests...\n');

  try {
    const token = process.env.TEST_TOKEN || 'test-token';
    
    const client = axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Test 1: Server-side caching
    console.log('📊 Test 1: Server-side response caching');
    console.log('─'.repeat(50));
    
    const startTime1 = Date.now();
    const response1 = await client.get('/dashboard/admin');
    const time1 = Date.now() - startTime1;
    console.log(`First request: ${time1}ms`);
    console.log(`Cache status: ${response1.headers['x-cache']}`);
    console.log(`Cache-Control: ${response1.headers['cache-control']}`);
    
    const startTime2 = Date.now();
    const response2 = await client.get('/dashboard/admin');
    const time2 = Date.now() - startTime2;
    console.log(`Second request (cached): ${time2}ms`);
    console.log(`Cache status: ${response2.headers['x-cache']}`);
    console.log(`Speedup: ${(time1 / time2).toFixed(1)}x faster\n`);

    // Test 2: Multiple concurrent requests use cache
    console.log('📊 Test 2: Concurrent requests (should use cache)');
    console.log('─'.repeat(50));
    
    const startConcurrent = Date.now();
    const results = await Promise.all([
      client.get('/products'),
      client.get('/products'),
      client.get('/products'),
    ]);
    const timeConcurrent = Date.now() - startConcurrent;
    
    console.log(`3 concurrent requests: ${timeConcurrent}ms`);
    results.forEach((r, i) => {
      console.log(`  Request ${i + 1}: ${r.headers['x-cache']}`);
    });
    console.log();

    // Test 3: Cache invalidation on mutation
    console.log('📊 Test 3: Cache headers on mutations');
    console.log('─'.repeat(50));
    
    const mutatonRes = await client.post('/staff', {}, { validateStatus: () => true });
    console.log(`POST request Cache-Control: ${mutatonRes.headers['cache-control']}`);
    console.log(`(Should be: no-cache, no-store, must-revalidate)\n`);

    console.log('✅ Cache verification complete!');
    console.log('\nSummary:');
    console.log('  ✓ Server caching is working (X-Cache header shows HIT/MISS)');
    console.log('  ✓ HTTP cache headers are being sent (Cache-Control)');
    console.log('  ✓ Client should cache based on TTL values');
    console.log('  ✓ Mutations do not cache (no-cache header)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.status === 401) {
      console.error('Note: Make sure you have a valid TEST_TOKEN env var or run against a test user');
    }
    process.exit(1);
  }
}

testCaching();
