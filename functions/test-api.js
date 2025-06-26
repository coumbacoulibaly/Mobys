// test-api.js
// Simple API testing script for Mobys API

const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:5001/mobys-12345/us-central1/api',
  apiKey: 'test_api_key_123',
  testPayment: {
    amount: 1000,
    currency: 'XOF',
    phone: '+22391234567',
    method: 'wave',
    metadata: {
      order_id: 'TEST_ORDER_123',
      description: 'Test payment'
    }
  }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const status = passed ? 'PASS' : 'FAIL';
  const color = passed ? 'green' : 'red';
  log(`[${status}] ${name}`, color);
  if (details) {
    log(`  ${details}`, 'yellow');
  }
}

async function testEndpoint(name, method, path, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${TEST_CONFIG.baseURL}${path}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status || 500, 
      data: error.response?.data || error.message 
    };
  }
}

async function runTests() {
  log('🧪 Starting Mobys API Tests...', 'blue');
  log('================================', 'blue');

  // Test 1: Health Check
  log('\n1. Testing Health Check Endpoint', 'blue');
  const healthResult = await testEndpoint('Health Check', 'GET', '/health');
  logTest('Health Check', healthResult.success, 
    healthResult.success ? `Status: ${healthResult.status}` : `Error: ${healthResult.data}`);

  // Test 2: Root Endpoint
  log('\n2. Testing Root Endpoint', 'blue');
  const rootResult = await testEndpoint('Root', 'GET', '/');
  logTest('Root Endpoint', rootResult.success, 
    rootResult.success ? `Status: ${rootResult.status}` : `Error: ${rootResult.data}`);

  // Test 3: Providers Endpoint
  log('\n3. Testing Providers Endpoint', 'blue');
  const providersResult = await testEndpoint('Providers', 'GET', '/providers');
  logTest('Providers Endpoint', providersResult.success, 
    providersResult.success ? `Status: ${rootResult.status}` : `Error: ${rootResult.data}`);

  // Test 4: Payment without API Key (should fail)
  log('\n4. Testing Payment without API Key', 'blue');
  const noAuthResult = await testEndpoint('Payment without Auth', 'POST', '/pay', TEST_CONFIG.testPayment);
  logTest('Payment without API Key', !noAuthResult.success && noAuthResult.status === 401, 
    `Expected 401, got ${noAuthResult.status}`);

  // Test 5: Payment with API Key
  log('\n5. Testing Payment with API Key', 'blue');
  const authResult = await testEndpoint('Payment with Auth', 'POST', '/pay', TEST_CONFIG.testPayment, {
    'Authorization': `Bearer ${TEST_CONFIG.apiKey}`
  });
  logTest('Payment with API Key', authResult.success, 
    authResult.success ? `Status: ${authResult.status}` : `Error: ${authResult.data}`);

  // Test 6: Invalid Payment Data
  log('\n6. Testing Invalid Payment Data', 'blue');
  const invalidPayment = { ...TEST_CONFIG.testPayment, amount: -100 };
  const invalidResult = await testEndpoint('Invalid Payment', 'POST', '/pay', invalidPayment, {
    'Authorization': `Bearer ${TEST_CONFIG.apiKey}`
  });
  logTest('Invalid Payment Data', !invalidResult.success && invalidResult.status === 400, 
    `Expected 400, got ${invalidResult.status}`);

  // Test 7: Wave Webhook
  log('\n7. Testing Wave Webhook', 'blue');
  const waveWebhook = {
    id: 'wave_test_123',
    status: 'success',
    amount: 1000,
    currency: 'XOF',
    phone: '+22391234567',
    metadata: {
      mobys_transaction_id: 'txn_test_123'
    }
  };
  const waveWebhookResult = await testEndpoint('Wave Webhook', 'POST', '/webhook/payment', waveWebhook);
  logTest('Wave Webhook', waveWebhookResult.success, 
    waveWebhookResult.success ? `Status: ${waveWebhookResult.status}` : `Error: ${waveWebhookResult.data}`);

  // Test 8: Orange Money Webhook
  log('\n8. Testing Orange Money Webhook', 'blue');
  const orangeWebhook = {
    order_id: 'orange_test_123',
    status: 'SUCCESS',
    amount: 1000,
    currency: 'XOF'
  };
  const orangeWebhookResult = await testEndpoint('Orange Money Webhook', 'POST', '/webhook/payment', orangeWebhook);
  logTest('Orange Money Webhook', orangeWebhookResult.success, 
    orangeWebhookResult.success ? `Status: ${orangeWebhookResult.status}` : `Error: ${orangeWebhookResult.data}`);

  // Test 9: Non-existent Endpoint
  log('\n9. Testing Non-existent Endpoint', 'blue');
  const notFoundResult = await testEndpoint('Not Found', 'GET', '/non-existent');
  logTest('Non-existent Endpoint', !notFoundResult.success && notFoundResult.status === 404, 
    `Expected 404, got ${notFoundResult.status}`);

  log('\n================================', 'blue');
  log('✅ API Testing Complete!', 'green');
  log('\nNote: These tests require the Firebase emulator to be running.', 'yellow');
  log('To start the emulator: npm run serve', 'yellow');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log(`❌ Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runTests, testEndpoint }; 