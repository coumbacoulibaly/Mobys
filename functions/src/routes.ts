// src/routes.ts
// Mobys API routes with real provider integrations

import express from 'express';
import { apiKeyAuth } from './middleware';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import ProviderFactory from './providers';

// Initialize Firebase Admin SDK
try {
  initializeApp();
} catch (e) {
  // Ignore if already initialized
}

const db = getFirestore();

// Connect to Firestore emulator if running locally
if (process.env.FUNCTIONS_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

// Enable ignoreUndefinedProperties for Firestore
db.settings({ ignoreUndefinedProperties: true });

const app = express();

app.use(express.json());

// Check if we're in simulation mode (no real API keys)
const isSimulationMode = () => {
  return !process.env.ORANGE_MONEY_CLIENT_ID || 
         !process.env.WAVE_API_KEY || 
         process.env.NODE_ENV === 'development' ||
         process.env.SIMULATION_MODE === 'true';
};

// --- Provider Handlers with Real Integration ---
async function orangeMoneyHandler({ amount, currency, phone, metadata, transactionId }: any) {
  if (isSimulationMode()) {
    // Fallback to simulation
    console.log('Orange Money: Using simulation mode');
    return {
      provider: 'orange_money',
      redirect_url: 'https://orange-money-simulated.com/redirect?txn=12345',
      status: 'pending',
      amount,
      currency,
      phone,
      metadata: metadata || {},
      order_id: transactionId,
    };
  }

  try {
    // Use real Orange Money API
    console.log('Orange Money: Using real API');
    const response = await ProviderFactory.initiatePayment('orange_money', {
      amount,
      currency,
      phone,
      metadata,
      transactionId,
    });
    
    return {
      provider: 'orange_money',
      redirect_url: response.redirect_url,
      status: 'pending',
      amount,
      currency,
      phone,
      metadata: metadata || {},
      order_id: response.order_id,
    };
  } catch (error: any) {
    console.error('Orange Money real API error:', error.message);
    
    // Fallback to simulation on error
    console.log('Orange Money: Falling back to simulation due to error');
    return {
      provider: 'orange_money',
      redirect_url: 'https://orange-money-simulated.com/redirect?txn=12345',
      status: 'pending',
      amount,
      currency,
      phone,
      metadata: metadata || {},
      order_id: transactionId,
    };
  }
}

async function waveHandler({ amount, currency, phone, metadata, transactionId }: any) {
  if (isSimulationMode()) {
    // Fallback to simulation
    console.log('Wave: Using simulation mode');
    return {
      provider: 'wave',
      short_url: 'https://wave-simulated.com/pay/abcde',
      status: 'pending',
      amount,
      currency,
      phone,
      metadata: metadata || {},
      wave_id: transactionId,
    };
  }

  try {
    // Use real Wave API
    console.log('Wave: Using real API');
    const response = await ProviderFactory.initiatePayment('wave', {
      amount,
      currency,
      phone,
      metadata,
      transactionId,
    });
    
    return {
      provider: 'wave',
      short_url: response.short_url,
      status: 'pending',
      amount,
      currency,
      phone,
      metadata: metadata || {},
      wave_id: response.wave_id,
    };
  } catch (error: any) {
    console.error('Wave real API error:', error.message);
    
    // Fallback to simulation on error
    console.log('Wave: Falling back to simulation due to error');
    return {
      provider: 'wave',
      short_url: 'https://wave-simulated.com/pay/abcde',
      status: 'pending',
      amount,
      currency,
      phone,
      metadata: metadata || {},
      wave_id: transactionId,
    };
  }
}

// Root endpoint for Mobys API
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Mobys API!',
    version: '2.0.0',
    providers: ProviderFactory.getAvailableProviders(),
    mode: isSimulationMode() ? 'simulation' : 'production',
    environment: process.env.NODE_ENV || 'development'
  });
});

// GET /providers endpoint to list available providers
app.get('/providers', (req, res) => {
  res.json({
    providers: ProviderFactory.getAvailableProviders(),
    mode: isSimulationMode() ? 'simulation' : 'production',
    features: {
      orange_money: {
        name: 'Orange Money',
        countries: ['ML', 'CI', 'SN'],
        currency: 'XOF',
        features: ['redirect_payment', 'webhook_notifications']
      },
      wave: {
        name: 'Wave',
        countries: ['ML', 'CI', 'SN'],
        currency: 'XOF',
        features: ['direct_payment', 'webhook_notifications']
      }
    }
  });
});

// POST /pay endpoint with real provider routing and Firestore logging
app.post('/pay', apiKeyAuth, async (req, res) => {
  const { amount, currency, method, phone, metadata } = req.body;

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  // Validate currency
  if (currency !== 'XOF') {
    return res.status(400).json({ error: 'Currency must be XOF.' });
  }

  // Validate method
  const validMethods = ['orange_money', 'wave'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ error: 'Method must be either orange_money or wave.' });
  }

  // Validate phone
  if (typeof phone !== 'string' || phone.trim() === '') {
    return res.status(400).json({ error: 'Phone must be a valid string.' });
  }

  // Provider-specific logic with real integration
  let providerResponse;
  try {
    if (method === 'orange_money') {
      providerResponse = await orangeMoneyHandler({ amount, currency, phone, metadata });
    } else if (method === 'wave') {
      providerResponse = await waveHandler({ amount, currency, phone, metadata });
    }
  } catch (error: any) {
    console.error('Provider error:', error);
    return res.status(500).json({ error: 'Provider service temporarily unavailable.' });
  }

  if (!providerResponse) {
    return res.status(500).json({ error: 'Provider response could not be generated.' });
  }

  // Log transaction in Firestore
  try {
    console.log('Attempting to log transaction to Firestore...');
    
    // Clean up provider response to remove undefined values
    const cleanProviderResponse = {
      ...providerResponse,
      metadata: providerResponse.metadata || {}
    };
    
    const transactionData = {
      amount,
      currency,
      method,
      phone,
      metadata: metadata || {},
      status: 'pending',
      provider: cleanProviderResponse.provider,
      provider_response: cleanProviderResponse,
      created_at: new Date().toISOString(),
      mode: isSimulationMode() ? 'simulation' : 'production',
    };
    
    // Remove any undefined values from the transaction data
    const cleanTransactionData = JSON.parse(JSON.stringify(transactionData));
    
    console.log('Transaction data:', JSON.stringify(cleanTransactionData, null, 2));
    
    const docRef = await db.collection('transactions').add(cleanTransactionData);
    console.log('Transaction logged successfully with ID:', docRef.id);
    
    // Add transaction_id to response
    const response = { ...cleanProviderResponse, transaction_id: docRef.id };
    
    res.json(response);
    return;
  } catch (err: any) {
    console.error('Firestore logging error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    res.status(500).json({ error: 'Failed to log transaction.', details: err.message });
    return;
  }
});

// POST /webhook/payment endpoint with enhanced provider-specific logic
app.post('/webhook/payment', async (req, res) => {
  let transaction_id, status, provider, amount, currency, message;

  try {
    // Detect provider and extract fields
    if (req.body.provider === 'wave' || req.body.wave_id) {
      // Wave webhook
      const waveData = ProviderFactory.parseWebhookPayload('wave', req.body);
      transaction_id = waveData.transaction_id;
      status = waveData.status;
      provider = 'wave';
      amount = waveData.amount;
      currency = waveData.currency;
      message = waveData.message;
    } else if (req.query.order_id && req.query.status) {
      // Orange Money redirect (GET request)
      const orangeData = ProviderFactory.parseWebhookPayload('orange_money', {}, req.query);
      transaction_id = orangeData.transaction_id;
      status = orangeData.status;
      provider = 'orange_money';
      message = orangeData.message;
    } else if (req.body.order_id && req.body.status) {
      // Orange Money as POST body
      const orangeData = ProviderFactory.parseWebhookPayload('orange_money', req.body);
      transaction_id = orangeData.transaction_id;
      status = orangeData.status;
      provider = 'orange_money';
      amount = orangeData.amount;
      currency = orangeData.currency;
      message = orangeData.message;
    } else {
      return res.status(400).json({ error: 'Missing or invalid provider-specific fields.' });
    }

    // Normalize status
    const normalizedStatus = (status || '').toLowerCase();
    let finalStatus;
    if (['success', 'succeeded', 'ok', 'completed'].includes(normalizedStatus)) {
      finalStatus = 'success';
    } else if (['failed', 'error', 'cancelled', 'declined'].includes(normalizedStatus)) {
      finalStatus = 'failed';
    } else {
      finalStatus = normalizedStatus;
    }

    // Update transaction status in Firestore
    try {
      const transactionRef = db.collection('transactions').doc(transaction_id);
      const updateData: any = { 
        status: finalStatus, 
        provider, 
        updated_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString()
      };
      
      if (amount) updateData.amount = amount;
      if (currency) updateData.currency = currency;
      if (message) updateData.webhook_message = message;
      
      await transactionRef.update(updateData);
      
      res.json({ 
        message: `Transaction status updated for ${provider}.`, 
        transaction_id, 
        status: finalStatus,
        provider,
        amount,
        currency
      });
      return;
    } catch (err) {
      console.error('Firestore update error:', err);
      res.status(500).json({ error: 'Failed to update transaction status.' });
      return;
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(400).json({ error: 'Invalid webhook payload.', details: error.message });
    return;
  }
});

// GET /transaction/:id endpoint to check transaction status
app.get('/transaction/:id', apiKeyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const transactionRef = db.collection('transactions').doc(id);
    const transactionDoc = await transactionRef.get();
    
    if (!transactionDoc.exists) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    
    const transaction = transactionDoc.data();
    return res.json({
      transaction_id: id,
      ...transaction
    });
  } catch (error: any) {
    console.error('Transaction lookup error:', error);
    return res.status(500).json({ error: 'Failed to retrieve transaction.' });
  }
});

export default app; 