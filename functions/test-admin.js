// test-admin.js
// Test script for admin endpoints

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/mobys-api/us-central1/api';
const API_KEY = 'test-api-key-123';

async function testAdminEndpoints() {
  console.log('🔧 Testing Admin Endpoints...\n');

  try {
    // Test system health
    console.log('1. Testing /admin/system/health...');
    const healthResponse = await axios.get(`${BASE_URL}/admin/system/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ System Health:', {
      status: healthResponse.data.status,
      total_users: healthResponse.data.metrics.total_users,
      total_transactions: healthResponse.data.metrics.total_transactions,
      active_transactions: healthResponse.data.metrics.active_transactions
    });
    console.log('');

    // Test transaction search
    console.log('2. Testing /admin/transactions/search...');
    const searchResponse = await axios.get(`${BASE_URL}/admin/transactions/search`, {
      headers: { 'X-API-Key': API_KEY },
      params: {
        limit: 5,
        status: 'completed'
      }
    });
    console.log('✅ Transaction Search:', {
      total: searchResponse.data.total,
      has_more: searchResponse.data.has_more,
      filters_applied: searchResponse.data.filters_applied
    });
    console.log('');

    // Test admin adjustment history
    console.log('3. Testing /admin/adjustments/history...');
    const historyResponse = await axios.get(`${BASE_URL}/admin/adjustments/history`, {
      headers: { 'X-API-Key': API_KEY },
      params: { limit: 5 }
    });
    console.log('✅ Adjustment History:', {
      total: historyResponse.data.total,
      adjustments: historyResponse.data.adjustments.length
    });
    console.log('');

    // Test transaction export (JSON)
    console.log('4. Testing /admin/transactions/export (JSON)...');
    const exportResponse = await axios.get(`${BASE_URL}/admin/transactions/export`, {
      headers: { 'X-API-Key': API_KEY },
      params: {
        format: 'json',
        include_metadata: 'true'
      }
    });
    console.log('✅ Transaction Export (JSON):', {
      content_type: exportResponse.headers['content-type'],
      content_length: exportResponse.headers['content-length'],
      filename: exportResponse.headers['content-disposition']
    });
    console.log('');

    // Test transaction export (CSV)
    console.log('5. Testing /admin/transactions/export (CSV)...');
    const csvExportResponse = await axios.get(`${BASE_URL}/admin/transactions/export`, {
      headers: { 'X-API-Key': API_KEY },
      params: {
        format: 'csv'
      }
    });
    console.log('✅ Transaction Export (CSV):', {
      content_type: csvExportResponse.headers['content-type'],
      content_length: csvExportResponse.headers['content-length'],
      filename: csvExportResponse.headers['content-disposition']
    });
    console.log('');

    console.log('🎉 All admin endpoints working correctly!');

  } catch (error) {
    console.error('❌ Error testing admin endpoints:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the Firebase Functions are running:');
      console.log('   npm run serve');
    }
  }
}

async function testManualAdjustment() {
  console.log('\n🔧 Testing Manual Ledger Adjustment...\n');

  try {
    // Test manual ledger adjustment
    console.log('1. Creating manual ledger adjustment...');
    const adjustmentResponse = await axios.post(`${BASE_URL}/admin/ledger/adjustment`, {
      user_id: 'test_user_123',
      amount: 500,
      description: 'Test adjustment from admin tools',
      reason: 'Testing admin functionality',
      metadata: {
        test: true,
        source: 'admin_test'
      }
    }, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ Manual Adjustment Created:', {
      adjustment_id: adjustmentResponse.data.adjustment.id,
      amount: adjustmentResponse.data.adjustment.amount,
      description: adjustmentResponse.data.adjustment.description
    });
    console.log('');

    // Test bulk update (if we have transactions)
    console.log('2. Testing bulk transaction update...');
    const bulkUpdateResponse = await axios.post(`${BASE_URL}/admin/transactions/bulk-update`, {
      transaction_ids: ['test_transaction_1', 'test_transaction_2'],
      new_status: 'completed',
      reason: 'Bulk update test'
    }, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ Bulk Update Results:', {
      success_count: bulkUpdateResponse.data.results.success_count,
      failed_count: bulkUpdateResponse.data.results.failed_count,
      errors: bulkUpdateResponse.data.results.errors.length
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error testing manual operations:', error.response?.data || error.message);
  }
}

async function testValidationErrors() {
  console.log('\n🔧 Testing Validation Errors...\n');

  try {
    // Test invalid adjustment (missing fields)
    console.log('1. Testing invalid adjustment (missing user_id)...');
    await axios.post(`${BASE_URL}/admin/ledger/adjustment`, {
      amount: 500,
      description: 'Test',
      reason: 'Test'
    }, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('❌ Should have failed with missing user_id');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected missing user_id');
    } else {
      console.log('❌ Unexpected error:', error.response?.data);
    }
  }

  try {
    // Test invalid adjustment (zero amount)
    console.log('2. Testing invalid adjustment (zero amount)...');
    await axios.post(`${BASE_URL}/admin/ledger/adjustment`, {
      user_id: 'test_user',
      amount: 0,
      description: 'Test',
      reason: 'Test'
    }, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('❌ Should have failed with zero amount');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected zero amount');
    } else {
      console.log('❌ Unexpected error:', error.response?.data);
    }
  }

  try {
    // Test bulk update with too many transactions
    console.log('3. Testing bulk update limit...');
    const largeTransactionIds = Array.from({ length: 101 }, (_, i) => `txn_${i}`);
    await axios.post(`${BASE_URL}/admin/transactions/bulk-update`, {
      transaction_ids: largeTransactionIds,
      new_status: 'completed',
      reason: 'Test'
    }, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('❌ Should have failed with too many transactions');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected too many transactions');
    } else {
      console.log('❌ Unexpected error:', error.response?.data);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Admin Tools Tests\n');
  
  await testAdminEndpoints();
  await testManualAdjustment();
  await testValidationErrors();
  
  console.log('\n✨ Admin tools testing complete!');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAdminEndpoints, testManualAdjustment, testValidationErrors }; 