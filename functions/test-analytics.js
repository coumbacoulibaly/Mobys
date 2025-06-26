// test-analytics.js
// Simple test script for analytics endpoints

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/mobys-api/us-central1/api';
const API_KEY = 'test-api-key-123';

async function testAnalyticsEndpoints() {
  console.log('🧪 Testing Analytics Endpoints...\n');

  try {
    // Test analytics summary
    console.log('1. Testing /analytics/summary...');
    const summaryResponse = await axios.get(`${BASE_URL}/analytics/summary`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ Analytics Summary:', summaryResponse.data);
    console.log('');

    // Test transaction analytics (last 7 days)
    console.log('2. Testing /analytics/transactions...');
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const transactionResponse = await axios.get(`${BASE_URL}/analytics/transactions`, {
      headers: { 'X-API-Key': API_KEY },
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
    console.log('✅ Transaction Analytics:', {
      period: transactionResponse.data.period,
      total_transactions: transactionResponse.data.analytics.total_transactions,
      total_volume: transactionResponse.data.analytics.total_volume,
      success_rate: transactionResponse.data.analytics.success_rate
    });
    console.log('');

    // Test ledger analytics (last 7 days)
    console.log('3. Testing /analytics/ledger...');
    const ledgerResponse = await axios.get(`${BASE_URL}/analytics/ledger`, {
      headers: { 'X-API-Key': API_KEY },
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
    console.log('✅ Ledger Analytics:', {
      period: ledgerResponse.data.period,
      total_entries: ledgerResponse.data.analytics.total_entries,
      total_volume: ledgerResponse.data.analytics.total_volume,
      net_change: ledgerResponse.data.analytics.balance_changes.net_change
    });
    console.log('');

    // Test user analytics (admin endpoint)
    console.log('4. Testing /admin/analytics/users...');
    const userResponse = await axios.get(`${BASE_URL}/admin/analytics/users`, {
      headers: { 'X-API-Key': API_KEY },
      params: { limit: 5 }
    });
    console.log('✅ User Analytics:', {
      total_users: userResponse.data.total,
      users: userResponse.data.users.map(u => ({
        user_id: u.user_id,
        total_transactions: u.total_transactions,
        total_volume: u.total_volume,
        success_rate: u.success_rate
      }))
    });
    console.log('');

    console.log('🎉 All analytics endpoints working correctly!');

  } catch (error) {
    console.error('❌ Error testing analytics endpoints:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the Firebase Functions are running:');
      console.log('   npm run serve');
    }
  }
}

// Test date range validation
async function testDateRangeValidation() {
  console.log('\n🧪 Testing Date Range Validation...\n');

  try {
    // Test invalid date range (end before start)
    console.log('1. Testing invalid date range...');
    await axios.get(`${BASE_URL}/analytics/transactions`, {
      headers: { 'X-API-Key': API_KEY },
      params: {
        start_date: '2024-01-31',
        end_date: '2024-01-01'
      }
    });
    console.log('❌ Should have failed with invalid date range');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected invalid date range');
    } else {
      console.log('❌ Unexpected error:', error.response?.data);
    }
  }

  try {
    // Test date range too large
    console.log('2. Testing date range too large...');
    await axios.get(`${BASE_URL}/analytics/transactions`, {
      headers: { 'X-API-Key': API_KEY },
      params: {
        start_date: '2020-01-01',
        end_date: '2024-12-31'
      }
    });
    console.log('❌ Should have failed with date range too large');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected date range too large');
    } else {
      console.log('❌ Unexpected error:', error.response?.data);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Analytics Endpoint Tests\n');
  
  await testAnalyticsEndpoints();
  await testDateRangeValidation();
  
  console.log('\n✨ Analytics testing complete!');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAnalyticsEndpoints, testDateRangeValidation }; 