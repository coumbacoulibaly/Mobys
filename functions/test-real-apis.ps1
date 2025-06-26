# Test script for real API integrations
# Make sure you have configured your .env file with real API credentials first!

$baseUrl = "http://localhost:5001/mobys-api/us-central1/mobysApi"

Write-Host "=== Testing Real API Integrations ===" -ForegroundColor Green
Write-Host "Make sure you have configured your .env file with real API credentials!" -ForegroundColor Yellow

# Test 1: Check API mode
Write-Host "`n1. Checking API mode..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
    Write-Host "API Mode: $($response.mode)" -ForegroundColor Green
    Write-Host "Version: $($response.version)" -ForegroundColor Green
    Write-Host "Providers: $($response.providers -join ', ')" -ForegroundColor Green
    
    if ($response.mode -eq "simulation") {
        Write-Host "WARNING: API is still in simulation mode!" -ForegroundColor Red
        Write-Host "Please check your .env file configuration." -ForegroundColor Red
        return
    }
} catch {
    Write-Host "Error checking API mode: $($_.Exception.Message)" -ForegroundColor Red
    return
}

# Test 2: Test Orange Money with real API
Write-Host "`n2. Testing Orange Money with real API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/pay" -Method POST -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer test_api_key_123"
    } -Body '{
        "amount": 1000,
        "currency": "XOF",
        "method": "orange_money",
        "phone": "+22377798022",
        "metadata": {
            "order_id": "REAL-OM-001",
            "description": "Real Orange Money Test"
        }
    }'
    
    Write-Host "Orange Money Response:" -ForegroundColor Green
    Write-Host "Transaction ID: $($response.transaction_id)" -ForegroundColor Green
    Write-Host "Redirect URL: $($response.redirect_url)" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    
    $orangeTransactionId = $response.transaction_id
} catch {
    Write-Host "Orange Money Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host "This might be due to invalid API credentials or network issues." -ForegroundColor Yellow
    }
}

# Test 3: Test Wave with real API
Write-Host "`n3. Testing Wave with real API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/pay" -Method POST -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer test_api_key_123"
    } -Body '{
        "amount": 1000,
        "currency": "XOF",
        "method": "wave",
        "phone": "+22377798022",
        "metadata": {
            "order_id": "REAL-WAVE-001",
            "description": "Real Wave Test"
        }
    }'
    
    Write-Host "Wave Response:" -ForegroundColor Green
    Write-Host "Transaction ID: $($response.transaction_id)" -ForegroundColor Green
    Write-Host "Short URL: $($response.short_url)" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    
    $waveTransactionId = $response.transaction_id
} catch {
    Write-Host "Wave Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host "This might be due to invalid API credentials or network issues." -ForegroundColor Yellow
    }
}

# Test 4: Check transaction status
if ($orangeTransactionId) {
    Write-Host "`n4. Checking Orange Money transaction status..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/transaction/$orangeTransactionId" -Method GET -Headers @{
            "Authorization"="Bearer test_api_key_123"
        }
        Write-Host "Transaction Status: $($response.status)" -ForegroundColor Green
        Write-Host "Provider: $($response.provider)" -ForegroundColor Green
    } catch {
        Write-Host "Error checking transaction: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($waveTransactionId) {
    Write-Host "`n5. Checking Wave transaction status..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/transaction/$waveTransactionId" -Method GET -Headers @{
            "Authorization"="Bearer test_api_key_123"
        }
        Write-Host "Transaction Status: $($response.status)" -ForegroundColor Green
        Write-Host "Provider: $($response.provider)" -ForegroundColor Green
    } catch {
        Write-Host "Error checking transaction: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Real API Testing Complete ===" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Check the transaction status in your provider dashboard" -ForegroundColor White
Write-Host "2. Test webhook processing by completing payments" -ForegroundColor White
Write-Host "3. Monitor logs for any API errors" -ForegroundColor White 