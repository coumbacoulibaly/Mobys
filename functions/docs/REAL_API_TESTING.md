# Real API Testing Guide

This guide will help you test the Mobys API with real Orange Money and Wave credentials.

## 🔑 Prerequisites

### 1. Orange Money API Credentials
Register at: https://developer.orange.com/apis/om-webpay

**Required credentials:**
- `ORANGE_MONEY_CLIENT_ID` - Your Orange Money client ID
- `ORANGE_MONEY_CLIENT_SECRET` - Your Orange Money client secret
- `ORANGE_MONEY_MERCHANT_ID` - Your Orange Money merchant ID
- `ORANGE_MONEY_WEBHOOK_SECRET` - Your webhook secret (optional for testing)

### 2. Wave API Credentials
Register at: https://docs.wave.com/business#requests

**Required credentials:**
- `WAVE_API_KEY` - Your Wave API key
- `WAVE_BUSINESS_ID` - Your Wave business ID
- `WAVE_WEBHOOK_SECRET` - Your webhook secret (optional for testing)

## ⚙️ Configuration Setup

### Step 1: Create Environment File
```bash
# Copy the template
cp env.production.template .env

# Edit the .env file with your real credentials
notepad .env  # or use your preferred editor
```

### Step 2: Fill in Your Credentials
Update the `.env` file with your real API credentials:

```env
# Orange Money Configuration
ORANGE_MONEY_CLIENT_ID=your_actual_client_id
ORANGE_MONEY_CLIENT_SECRET=your_actual_client_secret
ORANGE_MONEY_MERCHANT_ID=your_actual_merchant_id
ORANGE_MONEY_ENVIRONMENT=sandbox  # Use sandbox for testing

# Wave Configuration
WAVE_API_KEY=your_actual_api_key
WAVE_BUSINESS_ID=your_actual_business_id
WAVE_ENVIRONMENT=sandbox  # Use sandbox for testing

# Environment
NODE_ENV=development
SIMULATION_MODE=false  # Set to false to use real APIs
```

## 🧪 Testing Process

### Step 1: Validate Configuration
```powershell
# Run the validation script
.\validate-config.ps1
```

This script will:
- ✅ Check if `.env` file exists
- ✅ Validate all required credentials are set
- ✅ Check environment settings (sandbox vs production)
- ✅ Verify API is running

### Step 2: Test Real API Integrations
```powershell
# Run the real API test script
.\test-real-apis.ps1
```

This script will:
- 🔍 Check API mode (should show "production" instead of "simulation")
- 🧡 Test Orange Money payment initiation
- 🌊 Test Wave payment initiation
- 📊 Check transaction status
- 📝 Provide detailed error messages if issues occur

## 🔍 Expected Results

### Successful Configuration
```
=== Configuration Validation ===
✅ .env file found
✅ Orange Money is set to SANDBOX mode
✅ Wave is set to SANDBOX mode
✅ All required configuration variables are set!

=== API Status Check ===
✅ API is running
   Mode: production
   Version: 2.0.0
   Environment: development
```

### Successful API Test
```
=== Testing Real API Integrations ===
1. Checking API mode...
API Mode: production
Version: 2.0.0
Providers: orange_money, wave

2. Testing Orange Money with real API...
Orange Money Response:
Transaction ID: abc123def456
Redirect URL: https://api.orange.com/pay/xyz789
Status: pending

3. Testing Wave with real API...
Wave Response:
Transaction ID: wave_abc123
Short URL: https://wave.com/pay/def456
Status: pending
```

## 🚨 Common Issues & Solutions

### Issue 1: API Still in Simulation Mode
**Symptoms:** API mode shows "simulation" instead of "production"

**Solutions:**
- Check that `SIMULATION_MODE=false` in `.env`
- Verify all API credentials are properly set
- Restart the Firebase emulator after changing `.env`

### Issue 2: Authentication Errors
**Symptoms:** 401 or 403 errors from provider APIs

**Solutions:**
- Verify API credentials are correct
- Check if credentials are for the right environment (sandbox vs production)
- Ensure API keys haven't expired

### Issue 3: Network/Timeout Errors
**Symptoms:** Connection timeouts or network errors

**Solutions:**
- Check internet connection
- Verify API endpoints are accessible
- Increase timeout values in `.env` if needed

### Issue 4: Invalid Request Errors
**Symptoms:** 400 errors with validation messages

**Solutions:**
- Check phone number format (should be +223XXXXXXXX)
- Verify amount is positive and in XOF
- Ensure all required fields are provided

## 📊 Monitoring & Debugging

### Check Logs
Monitor the Firebase Functions logs for detailed error information:

```bash
firebase functions:log
```

### Transaction Status
Check transaction status using the API:

```bash
# Check a specific transaction
curl -X GET "http://localhost:5001/mobys-api/us-central1/mobysApi/transaction/TRANSACTION_ID" \
  -H "Authorization: Bearer test_api_key_123"
```

### Provider Dashboard
- **Orange Money**: Check your Orange Money merchant dashboard
- **Wave**: Check your Wave business dashboard

## 🔄 Testing Webhooks

### 1. Complete a Payment
- Use the redirect URL or short URL from the payment response
- Complete the payment in the provider's interface

### 2. Monitor Webhook Processing
- Check the API logs for webhook processing
- Verify transaction status is updated in Firestore

### 3. Test Webhook Manually
```bash
# Test Orange Money webhook
curl -X POST "http://localhost:5001/mobys-api/us-central1/mobysApi/webhook/payment" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "TRANSACTION_ID", "status": "SUCCESS"}'

# Test Wave webhook
curl -X POST "http://localhost:5001/mobys-api/us-central1/mobysApi/webhook/payment" \
  -H "Content-Type: application/json" \
  -d '{"provider": "wave", "transaction_id": "TRANSACTION_ID", "status": "success"}'
```

## 🎯 Next Steps

After successful testing:

1. **Production Deployment**: Deploy to Firebase production
2. **Webhook Configuration**: Set up webhook URLs in provider dashboards
3. **Monitoring**: Set up logging and monitoring
4. **Security**: Implement webhook signature verification
5. **Rate Limiting**: Configure appropriate rate limits

## 📞 Support

If you encounter issues:

1. Check the logs: `firebase functions:log`
2. Verify credentials with provider support
3. Test with provider's official SDK first
4. Check provider documentation for API changes 