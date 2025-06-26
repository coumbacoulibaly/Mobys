# Configuration validation script
# This script checks if your .env file is properly configured for real API testing

Write-Host "=== Configuration Validation ===" -ForegroundColor Green

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please copy env.production.template to .env and fill in your credentials." -ForegroundColor Yellow
    exit 1
}

# Load environment variables (simplified check)
$envContent = Get-Content ".env" -Raw
$missingVars = @()

# Check Orange Money configuration
if ($envContent -notmatch "ORANGE_MONEY_CLIENT_ID=" -or $envContent -match "ORANGE_MONEY_CLIENT_ID=your_") {
    $missingVars += "ORANGE_MONEY_CLIENT_ID"
}
if ($envContent -notmatch "ORANGE_MONEY_CLIENT_SECRET=" -or $envContent -match "ORANGE_MONEY_CLIENT_SECRET=your_") {
    $missingVars += "ORANGE_MONEY_CLIENT_SECRET"
}
if ($envContent -notmatch "ORANGE_MONEY_MERCHANT_ID=" -or $envContent -match "ORANGE_MONEY_MERCHANT_ID=your_") {
    $missingVars += "ORANGE_MONEY_MERCHANT_ID"
}

# Check Wave configuration
if ($envContent -notmatch "WAVE_API_KEY=" -or $envContent -match "WAVE_API_KEY=your_") {
    $missingVars += "WAVE_API_KEY"
}
if ($envContent -notmatch "WAVE_BUSINESS_ID=" -or $envContent -match "WAVE_BUSINESS_ID=your_") {
    $missingVars += "WAVE_BUSINESS_ID"
}

# Check environment settings
if ($envContent -match "ORANGE_MONEY_ENVIRONMENT=sandbox") {
    Write-Host "⚠️  Orange Money is set to SANDBOX mode" -ForegroundColor Yellow
} elseif ($envContent -match "ORANGE_MONEY_ENVIRONMENT=production") {
    Write-Host "✅ Orange Money is set to PRODUCTION mode" -ForegroundColor Green
} else {
    Write-Host "⚠️  Orange Money environment not specified (defaulting to sandbox)" -ForegroundColor Yellow
}

if ($envContent -match "WAVE_ENVIRONMENT=sandbox") {
    Write-Host "⚠️  Wave is set to SANDBOX mode" -ForegroundColor Yellow
} elseif ($envContent -match "WAVE_ENVIRONMENT=production") {
    Write-Host "✅ Wave is set to PRODUCTION mode" -ForegroundColor Green
} else {
    Write-Host "⚠️  Wave environment not specified (defaulting to sandbox)" -ForegroundColor Yellow
}

# Check for simulation mode override
if ($envContent -match "SIMULATION_MODE=true") {
    Write-Host "⚠️  SIMULATION_MODE is set to true - APIs will use simulation!" -ForegroundColor Red
}

# Report missing variables
if ($missingVars.Count -gt 0) {
    Write-Host "`n❌ Missing or invalid configuration variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Red
    }
    Write-Host "`nPlease update your .env file with real credentials." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n✅ All required configuration variables are set!" -ForegroundColor Green
}

# Check if API is running
Write-Host "`n=== API Status Check ===" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/mobys-api/us-central1/mobysApi/" -Method GET
    Write-Host "✅ API is running" -ForegroundColor Green
    Write-Host "   Mode: $($response.mode)" -ForegroundColor White
    Write-Host "   Version: $($response.version)" -ForegroundColor White
    Write-Host "   Environment: $($response.environment)" -ForegroundColor White
} catch {
    Write-Host "❌ API is not running or not accessible" -ForegroundColor Red
    Write-Host "Please start the Firebase emulator: firebase emulators:start" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Configuration Validation Complete ===" -ForegroundColor Green
Write-Host "You can now run: .\test-real-apis.ps1" -ForegroundColor Cyan 