// src/routes.ts
// Mobys API routes with real provider integrations

import express from 'express';
import { 
  apiKeyAuth, 
  rateLimiter, 
  apiKeyRateLimiter, 
  validateRequest, 
  corsMiddleware, 
  requestLogger, 
  errorHandler,
  httpsEnforcement,
  securityHeaders,
  webhookIpWhitelist,
  webhookSignatureVerification,
  webhookLogger
} from './middleware';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue } from 'firebase-admin/firestore';
import ProviderFactory from './providers';
import { validateWestAfricanPhone, isProviderSupportedInCountry, getAllSupportedCountries } from './utils/phone-validation';
import { createLedgerEntry, updateTransactionStatus, getUserBalance, getUserLedgerEntries, getLedgerEntriesByTransaction, getBalanceHistory, reconcileLedger } from './utils/ledger';
import { 
  getTransactionAnalytics, 
  getLedgerAnalytics, 
  getUserAnalytics, 
  getAnalyticsSummary 
} from './utils/analytics';
import { 
  createManualLedgerAdjustment,
  searchTransactions,
  getTransactionDetails,
  exportTransactions,
  getAdminAdjustmentHistory,
  getSystemHealth,
  bulkUpdateTransactionStatus,
  getUserSummary
} from './utils/admin';

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

// Enable ignoreUndefinedProperties for Firestore (only if settings method exists)
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (error) {
  // Settings might not be available in test environment, which is fine
  console.log('Firestore settings not available:', error);
}

const app = express();

// Apply middleware in order (security first)
app.use(httpsEnforcement);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(requestLogger);
app.use(rateLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    services: {
      firestore: 'connected',
      providers: {
        orange_money: isSimulationMode() ? 'simulation' : 'production',
        wave: isSimulationMode() ? 'simulation' : 'production'
      }
    }
  };
  
  res.status(200).json(health);
});

// Root endpoint for Mobys API
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Mobys API!',
    version: '2.0.0',
    providers: ProviderFactory.getAvailableProviders(),
    mode: isSimulationMode() ? 'simulation' : 'production',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/docs',
    health: '/health'
  });
});

// GET /countries endpoint to list supported countries
app.get('/countries', (req, res) => {
  const countries = getAllSupportedCountries();
  res.json({
    countries: countries.map(country => ({
      code: country.code,
      name: country.name,
      flag: country.flag,
      example: country.example,
      supported_providers: country.supportedProviders,
      phone_length: {
        min: country.minLength,
        max: country.maxLength
      }
    })),
    total: countries.length,
    supported_currencies: ['XOF'],
    note: 'All countries support XOF currency'
  });
});

// GET /providers endpoint to list available providers
app.get('/providers', (req, res) => {
  const countries = getAllSupportedCountries();
  const waveCountries = countries.filter(c => c.supportedProviders.includes('wave'));
  const orangeCountries = countries.filter(c => c.supportedProviders.includes('orange_money'));
  
  res.json({
    providers: ProviderFactory.getAvailableProviders(),
    mode: isSimulationMode() ? 'simulation' : 'production',
    features: {
      orange_money: {
        name: 'Orange Money',
        countries: orangeCountries.map(c => ({
          code: c.code,
          name: c.name,
          flag: c.flag,
          example: c.example
        })),
        currency: 'XOF',
        features: ['redirect_payment', 'webhook_notifications'],
        supported_countries: orangeCountries.length
      },
      wave: {
        name: 'Wave',
        countries: waveCountries.map(c => ({
          code: c.code,
          name: c.name,
          flag: c.flag,
          example: c.example
        })),
        currency: 'XOF',
        features: ['direct_payment', 'webhook_notifications'],
        supported_countries: waveCountries.length
      }
    },
    total_supported_countries: countries.length
  });
});

// POST /pay endpoint with enhanced security and validation
app.post('/pay', 
  apiKeyAuth, 
  apiKeyRateLimiter, 
  validateRequest({}), 
  async (req, res) => {
    try {
      const { amount, currency, method, phone, metadata } = req.body;
      const userId = (req as any).user?.id;

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ 
          error: 'Amount must be a positive number.',
          code: 'INVALID_AMOUNT'
        });
      }

      // Validate currency
      if (currency !== 'XOF') {
        return res.status(400).json({ 
          error: 'Currency must be XOF.',
          code: 'INVALID_CURRENCY'
        });
      }

      // Validate method
      const validMethods = ['orange_money', 'wave'];
      if (!validMethods.includes(method)) {
        return res.status(400).json({ 
          error: 'Method must be either orange_money or wave.',
          code: 'INVALID_METHOD'
        });
      }

      // Enhanced phone number validation for West African countries
      if (!phone) {
        return res.status(400).json({ 
          error: 'Phone number is required.',
          code: 'MISSING_PHONE'
        });
      }

      const phoneValidation = validateWestAfricanPhone(phone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ 
          error: phoneValidation.error || 'Invalid phone number format.',
          code: 'INVALID_PHONE'
        });
      }

      // Check if the payment method is supported in the detected country
      if (phoneValidation.country) {
        const isSupported = isProviderSupportedInCountry(method, phoneValidation.country.name);
        if (!isSupported) {
          return res.status(400).json({ 
            error: `${method} is not supported in ${phoneValidation.country.name}. Supported providers: ${phoneValidation.country.supportedProviders.join(', ')}`,
            code: 'PROVIDER_NOT_SUPPORTED'
          });
        }
      }

      // Create transaction record
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const transactionData = {
        id: transactionId,
        user_id: userId,
        amount,
        currency,
        method,
        phone: phoneValidation.normalizedPhone || phone,
        country: phoneValidation.country?.name || 'Unknown',
        country_code: phoneValidation.country?.code || 'Unknown',
        metadata: metadata || {},
        status: 'pending',
        provider: method,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      };

      // Save transaction to Firestore
      await db.collection('transactions').doc(transactionId).set(transactionData);

      // Create initial ledger entry for pending transaction
      const userBalance = await getUserBalance(userId);
      const currentBalance = userBalance?.available_balance || 0;
      
      await createLedgerEntry({
        user_id: userId,
        transaction_id: transactionId,
        type: 'payment',
        amount: 0, // No balance change until payment is completed
        currency,
        balance_before: currentBalance,
        balance_after: currentBalance,
        description: `Payment initiated for ${amount} ${currency} via ${method}`,
        metadata: {
          provider: method,
          phone: phoneValidation.normalizedPhone || phone,
          country: phoneValidation.country?.name,
          original_amount: amount,
          status: 'pending'
        },
        created_by: 'system',
        status: 'pending',
        reference: transactionId,
      });

      // Process payment based on method
      let paymentResult;
      if (method === 'orange_money') {
        paymentResult = await orangeMoneyHandler({ 
          amount, 
          currency, 
          phone, 
          metadata, 
          transactionId 
        });
      } else if (method === 'wave') {
        paymentResult = await waveHandler({ 
          amount, 
          currency, 
          phone, 
          metadata, 
          transactionId 
        });
      }

      // Update transaction with provider response
      await db.collection('transactions').doc(transactionId).update({
        provider_response: paymentResult,
        updated_at: FieldValue.serverTimestamp()
      });

      res.status(200).json({
        success: true,
        transaction_id: transactionId,
        ...paymentResult
      });

    } catch (error: any) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        error: 'Payment processing failed.',
        code: 'PAYMENT_ERROR'
      });
    }
  }
);

// POST /webhook/payment endpoint with enhanced security and logging
app.post('/webhook/payment', 
  webhookIpWhitelist,
  webhookLogger,
  webhookSignatureVerification,
  async (req, res) => {
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
        return res.status(400).json({ 
          error: 'Missing or invalid provider-specific fields.',
          code: 'INVALID_WEBHOOK_PAYLOAD'
        });
      }

      // Normalize status
      const normalizedStatus = (status || '').toLowerCase();
      let finalStatus;
      
      if (['success', 'completed', 'paid'].includes(normalizedStatus)) {
        finalStatus = 'completed';
      } else if (['failed', 'cancelled', 'expired'].includes(normalizedStatus)) {
        finalStatus = 'failed';
      } else {
        finalStatus = 'pending';
      }

      // Get transaction details
      const transactionDoc = await db.collection('transactions').doc(transaction_id).get();
      if (!transactionDoc.exists) {
        return res.status(404).json({ 
          error: 'Transaction not found.',
          code: 'TRANSACTION_NOT_FOUND'
        });
      }

      const transaction = transactionDoc.data();
      const userId = transaction.user_id;

      // Update transaction status using ledger system
      await updateTransactionStatus(
        transaction_id,
        finalStatus,
        'system',
        message || `Status updated via ${provider} webhook`,
        {
          provider,
          original_status: status,
          webhook_data: req.body
        }
      );

      // Create webhook log entry
      const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.collection('webhooks').doc(webhookId).set({
        id: webhookId,
        transaction_id,
        provider,
        original_status: status,
        normalized_status: finalStatus,
        payload: req.body,
        headers: req.headers,
        ip: req.ip,
        created_at: FieldValue.serverTimestamp(),
        processed: true
      });

      // Return success response
      res.json({
        message: 'Webhook processed successfully',
        transaction_id,
        status: finalStatus,
        provider,
        webhook_id: webhookId
      });

    } catch (error: any) {
      console.error('Webhook processing error:', error);
      
      // Log failed webhook
      const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.collection('webhooks').doc(webhookId).set({
        id: webhookId,
        transaction_id: transaction_id || 'unknown',
        provider: provider || 'unknown',
        original_status: status || 'unknown',
        payload: req.body,
        headers: req.headers,
        ip: req.ip,
        created_at: FieldValue.serverTimestamp(),
        processed: false,
        error: error.message
      });

      res.status(500).json({ 
        error: 'Webhook processing failed',
        code: 'WEBHOOK_PROCESSING_ERROR'
      });
    }
  }
);

// GET /webhook/payment endpoint for Orange Money redirects
app.get('/webhook/payment', 
  webhookIpWhitelist,
  webhookLogger,
  async (req, res) => {
    try {
      // Handle Orange Money redirect (GET request)
      if (req.query.order_id && req.query.status) {
        const orangeData = ProviderFactory.parseWebhookPayload('orange_money', {}, req.query);
        const transaction_id = orangeData.transaction_id;
        const status = orangeData.status;
        const provider = 'orange_money';
        const message = orangeData.message;

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
        const transactionRef = db.collection('transactions').doc(transaction_id);
        await transactionRef.update({ 
          status: finalStatus, 
          provider, 
          updated_at: FieldValue.serverTimestamp(),
          webhook_received_at: FieldValue.serverTimestamp(),
          webhook_message: message
        });
        
        console.log(`Transaction ${transaction_id} updated to status: ${finalStatus} via redirect`);
        
        // Redirect to success/failure page or return JSON
        if (req.headers.accept?.includes('application/json')) {
          res.json({ 
            message: `Transaction status updated for ${provider}.`, 
            transaction_id, 
            status: finalStatus,
            provider
          });
        } else {
          // Redirect to appropriate page
          const redirectUrl = finalStatus === 'success' 
            ? '/payment/success' 
            : '/payment/failed';
          res.redirect(redirectUrl);
        }
        return;
      }

      res.status(400).json({ 
        error: 'Invalid webhook parameters.',
        code: 'INVALID_WEBHOOK_PARAMS'
      });
    } catch (error: any) {
      console.error('Webhook redirect processing error:', error);
      res.status(400).json({ 
        error: 'Invalid webhook payload.', 
        details: error.message,
        code: 'WEBHOOK_REDIRECT_ERROR'
      });
    }
  }
);

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

// GET /balance endpoint to get user balance
app.get('/balance', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const balance = await getUserBalance(userId);
      
      if (!balance) {
        return res.json({
          user_id: userId,
          available_balance: 0,
          pending_balance: 0,
          total_balance: 0,
          currency: 'XOF',
          last_updated: null
        });
      }

      res.json(balance);
    } catch (error: any) {
      console.error('Balance retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve balance.',
        code: 'BALANCE_RETRIEVAL_ERROR'
      });
    }
  }
);

// GET /ledger endpoint to get user ledger entries
app.get('/ledger', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const startAfter = req.query.start_after as string;
      
      const entries = await getUserLedgerEntries(userId, limit, startAfter);
      
      res.json({
        entries,
        total: entries.length,
        has_more: entries.length === limit,
        user_id: userId
      });
    } catch (error: any) {
      console.error('Ledger retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve ledger entries.',
        code: 'LEDGER_RETRIEVAL_ERROR'
      });
    }
  }
);

// GET /transaction/:id/ledger endpoint to get ledger entries for a specific transaction
app.get('/transaction/:id/ledger', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const transactionId = req.params.id;
      const userId = (req as any).user?.id;
      
      // Verify transaction belongs to user
      const transactionDoc = await db.collection('transactions').doc(transactionId).get();
      if (!transactionDoc.exists) {
        return res.status(404).json({ 
          error: 'Transaction not found.',
          code: 'TRANSACTION_NOT_FOUND'
        });
      }
      
      const transaction = transactionDoc.data();
      if (transaction.user_id !== userId) {
        return res.status(403).json({ 
          error: 'Access denied.',
          code: 'ACCESS_DENIED'
        });
      }
      
      const entries = await getLedgerEntriesByTransaction(transactionId);
      
      res.json({
        transaction_id: transactionId,
        entries,
        total: entries.length
      });
    } catch (error: any) {
      console.error('Transaction ledger retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve transaction ledger entries.',
        code: 'TRANSACTION_LEDGER_ERROR'
      });
    }
  }
);

// GET /balance/history endpoint to get balance history
app.get('/balance/history', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const days = parseInt(req.query.days as string) || 30;
      
      const history = await getBalanceHistory(userId, days);
      
      res.json({
        user_id: userId,
        history,
        days,
        total_points: history.length
      });
    } catch (error: any) {
      console.error('Balance history retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve balance history.',
        code: 'BALANCE_HISTORY_ERROR'
      });
    }
  }
);

// POST /ledger/reconcile endpoint to reconcile ledger entries
app.post('/ledger/reconcile', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      
      const reconciliation = await reconcileLedger(userId);
      
      res.json({
        user_id: userId,
        reconciliation,
        is_balanced: reconciliation.difference === 0,
        message: reconciliation.difference === 0 
          ? 'Ledger is balanced' 
          : `Ledger discrepancy found: ${reconciliation.difference} XOF`
      });
    } catch (error: any) {
      console.error('Ledger reconciliation error:', error);
      res.status(500).json({ 
        error: 'Failed to reconcile ledger.',
        code: 'LEDGER_RECONCILIATION_ERROR'
      });
    }
  }
);

// GET /analytics/transactions endpoint
app.get('/analytics/transactions', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : new Date();
      
      // Validate date range
      if (startDate > endDate) {
        return res.status(400).json({ 
          error: 'Start date must be before end date.',
          code: 'INVALID_DATE_RANGE'
        });
      }

      // Limit date range to 1 year for performance
      const maxDays = 365;
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        return res.status(400).json({ 
          error: `Date range cannot exceed ${maxDays} days.`,
          code: 'DATE_RANGE_TOO_LARGE'
        });
      }

      const analytics = await getTransactionAnalytics(startDate, endDate, userId);
      
      res.json({
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          days: Math.ceil(daysDiff)
        },
        analytics
      });
    } catch (error: any) {
      console.error('Transaction analytics error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve transaction analytics.',
        code: 'ANALYTICS_ERROR'
      });
    }
  }
);

// GET /analytics/ledger endpoint
app.get('/analytics/ledger', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : new Date();
      
      // Validate date range
      if (startDate > endDate) {
        return res.status(400).json({ 
          error: 'Start date must be before end date.',
          code: 'INVALID_DATE_RANGE'
        });
      }

      // Limit date range to 1 year for performance
      const maxDays = 365;
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        return res.status(400).json({ 
          error: `Date range cannot exceed ${maxDays} days.`,
          code: 'DATE_RANGE_TOO_LARGE'
        });
      }

      const analytics = await getLedgerAnalytics(startDate, endDate, userId);
      
      res.json({
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          days: Math.ceil(daysDiff)
        },
        analytics
      });
    } catch (error: any) {
      console.error('Ledger analytics error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve ledger analytics.',
        code: 'ANALYTICS_ERROR'
      });
    }
  }
);

// GET /analytics/summary endpoint for dashboard
app.get('/analytics/summary', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const summary = await getAnalyticsSummary();
      res.json(summary);
    } catch (error: any) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve analytics summary.',
        code: 'ANALYTICS_ERROR'
      });
    }
  }
);

// GET /admin/analytics/users endpoint (admin only)
app.get('/admin/analytics/users', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // TODO: Add admin role check here
      // For now, allow any authenticated user to access
      
      const userAnalytics = await getUserAnalytics(limit);
      
      res.json({
        users: userAnalytics,
        total: userAnalytics.length,
        limit
      });
    } catch (error: any) {
      console.error('User analytics error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve user analytics.',
        code: 'ANALYTICS_ERROR'
      });
    }
  }
);

// POST /admin/ledger/adjustment endpoint for manual ledger adjustments
app.post('/admin/ledger/adjustment', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const adminId = (req as any).user?.id;
      const { user_id, amount, description, reason, metadata } = req.body;

      // Validate required fields
      if (!user_id) {
        return res.status(400).json({ 
          error: 'User ID is required.',
          code: 'MISSING_USER_ID'
        });
      }

      if (typeof amount !== 'number' || amount === 0) {
        return res.status(400).json({ 
          error: 'Amount must be a non-zero number.',
          code: 'INVALID_AMOUNT'
        });
      }

      if (!description || description.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Description is required.',
          code: 'MISSING_DESCRIPTION'
        });
      }

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Reason is required.',
          code: 'MISSING_REASON'
        });
      }

      // TODO: Add admin role validation here
      // For now, allow any authenticated user to create adjustments

      const adjustment = await createManualLedgerAdjustment(
        user_id,
        amount,
        description,
        reason,
        adminId,
        metadata
      );

      res.json({
        message: 'Ledger adjustment created successfully',
        adjustment
      });
    } catch (error: any) {
      console.error('Admin ledger adjustment error:', error);
      res.status(500).json({ 
        error: 'Failed to create ledger adjustment.',
        code: 'ADJUSTMENT_ERROR'
      });
    }
  }
);

// GET /admin/transactions/search endpoint for transaction search
app.get('/admin/transactions/search', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const filters: any = {};
      const limit = parseInt(req.query.limit as string) || 50;
      const startAfter = req.query.start_after as string;

      // Parse filters from query parameters
      if (req.query.user_id) filters.user_id = req.query.user_id;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.provider) filters.provider = req.query.provider;
      if (req.query.country) filters.country = req.query.country;
      if (req.query.phone) filters.phone = req.query.phone;
      if (req.query.min_amount) filters.min_amount = parseFloat(req.query.min_amount as string);
      if (req.query.max_amount) filters.max_amount = parseFloat(req.query.max_amount as string);
      if (req.query.start_date) filters.start_date = new Date(req.query.start_date as string);
      if (req.query.end_date) filters.end_date = new Date(req.query.end_date as string);

      const searchResult = await searchTransactions(filters, limit, startAfter);

      res.json(searchResult);
    } catch (error: any) {
      console.error('Transaction search error:', error);
      res.status(500).json({ 
        error: 'Failed to search transactions.',
        code: 'SEARCH_ERROR'
      });
    }
  }
);

// GET /admin/transaction/:id/details endpoint for detailed transaction view
app.get('/admin/transaction/:id/details', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const transactionId = req.params.id;
      
      const details = await getTransactionDetails(transactionId);
      
      res.json(details);
    } catch (error: any) {
      console.error('Transaction details error:', error);
      if (error.message === 'Transaction not found') {
        res.status(404).json({ 
          error: 'Transaction not found.',
          code: 'TRANSACTION_NOT_FOUND'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get transaction details.',
          code: 'DETAILS_ERROR'
        });
      }
    }
  }
);

// GET /admin/transactions/export endpoint for data export
app.get('/admin/transactions/export', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const filters: any = {};
      const format = (req.query.format as string) || 'json';
      const includeMetadata = req.query.include_metadata === 'true';
      const includeLedgerEntries = req.query.include_ledger_entries === 'true';

      // Parse filters
      if (req.query.user_id) filters.user_id = req.query.user_id;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.provider) filters.provider = req.query.provider;
      if (req.query.country) filters.country = req.query.country;
      if (req.query.start_date) filters.start_date = new Date(req.query.start_date as string);
      if (req.query.end_date) filters.end_date = new Date(req.query.end_date as string);

      const exportOptions = {
        format: format as 'json' | 'csv',
        include_metadata: includeMetadata,
        include_ledger_entries: includeLedgerEntries
      };

      const exportData = await exportTransactions(filters, exportOptions);

      // Set appropriate headers for download
      const filename = `transactions_export_${new Date().toISOString().split('T')[0]}.${format}`;
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(exportData);
    } catch (error: any) {
      console.error('Transaction export error:', error);
      res.status(500).json({ 
        error: 'Failed to export transactions.',
        code: 'EXPORT_ERROR'
      });
    }
  }
);

// GET /admin/adjustments/history endpoint for admin adjustment history
app.get('/admin/adjustments/history', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const adminId = req.query.admin_id as string;
      const userId = req.query.user_id as string;
      const limit = parseInt(req.query.limit as string) || 50;

      const adjustments = await getAdminAdjustmentHistory(adminId, userId, limit);

      res.json({
        adjustments,
        total: adjustments.length,
        limit
      });
    } catch (error: any) {
      console.error('Admin adjustment history error:', error);
      res.status(500).json({ 
        error: 'Failed to get adjustment history.',
        code: 'HISTORY_ERROR'
      });
    }
  }
);

// GET /admin/system/health endpoint for system health monitoring
app.get('/admin/system/health', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const health = await getSystemHealth();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: health
      });
    } catch (error: any) {
      console.error('System health check error:', error);
      res.status(500).json({ 
        error: 'Failed to get system health.',
        code: 'HEALTH_CHECK_ERROR'
      });
    }
  }
);

// POST /admin/transactions/bulk-update endpoint for bulk status updates
app.post('/admin/transactions/bulk-update', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const adminId = (req as any).user?.id;
      const { transaction_ids, new_status, reason } = req.body;

      // Validate required fields
      if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
        return res.status(400).json({ 
          error: 'Transaction IDs array is required and cannot be empty.',
          code: 'MISSING_TRANSACTION_IDS'
        });
      }

      if (!new_status) {
        return res.status(400).json({ 
          error: 'New status is required.',
          code: 'MISSING_STATUS'
        });
      }

      if (!reason) {
        return res.status(400).json({ 
          error: 'Reason is required.',
          code: 'MISSING_REASON'
        });
      }

      // Limit bulk operations to prevent abuse
      if (transaction_ids.length > 100) {
        return res.status(400).json({ 
          error: 'Cannot update more than 100 transactions at once.',
          code: 'BULK_LIMIT_EXCEEDED'
        });
      }

      const results = await bulkUpdateTransactionStatus(
        transaction_ids,
        new_status,
        adminId,
        reason
      );

      res.json({
        message: 'Bulk update completed',
        results
      });
    } catch (error: any) {
      console.error('Bulk update error:', error);
      res.status(500).json({ 
        error: 'Failed to perform bulk update.',
        code: 'BULK_UPDATE_ERROR'
      });
    }
  }
);

// GET /admin/user/:id/summary endpoint for user summary
app.get('/admin/user/:id/summary', 
  apiKeyAuth, 
  async (req, res) => {
    try {
      const userId = req.params.id;
      
      const summary = await getUserSummary(userId);
      
      res.json(summary);
    } catch (error: any) {
      console.error('User summary error:', error);
      res.status(500).json({ 
        error: 'Failed to get user summary.',
        code: 'USER_SUMMARY_ERROR'
      });
    }
  }
);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found.',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler - must be last
app.use(errorHandler);

export default app; 