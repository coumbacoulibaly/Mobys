// test/api.test.ts
// Comprehensive test suite for Mobys API

import request from 'supertest';
import { Express } from 'express';
import { TEST_CONFIG, createTestTransactionId } from './test-config';

// Import the app (we'll need to modify the main app to export it for testing)
let app: Express;

// Mock Firestore for testing
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          exists: true,
          data: () => ({
            userId: TEST_CONFIG.TEST_USER_ID,
            active: true,
            permissions: ['read', 'write_payments'],
            createdAt: new Date(),
            expiresAt: null
          })
        })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve())
      })),
      add: jest.fn(() => Promise.resolve({ id: 'test_doc_id' }))
    }))
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date())
  }
}));

// Mock Firebase Admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn()
}));

describe('Mobys API Tests', () => {
  beforeAll(async () => {
    // Import the app after mocking
    const { default: expressApp } = await import('../src/routes');
    app = expressApp;
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Welcome to the Mobys API!');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('providers');
    });
  });

  describe('Providers Endpoint', () => {
    it('should return available providers', async () => {
      const response = await request(app)
        .get('/providers')
        .expect(200);

      expect(response.body).toHaveProperty('providers');
      expect(response.body.providers).toContain('wave');
      expect(response.body.providers).toContain('orange_money');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app)
        .post('/pay')
        .send(TEST_CONFIG.TEST_PAYMENT)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'MISSING_AUTH_HEADER');
    });

    it('should reject requests with invalid API key format', async () => {
      const response = await request(app)
        .post('/pay')
        .set('Authorization', 'Bearer invalid')
        .send(TEST_CONFIG.TEST_PAYMENT)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'INVALID_API_KEY_FORMAT');
    });

    it('should accept requests with valid API key', async () => {
      const response = await request(app)
        .post('/pay')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .send(TEST_CONFIG.TEST_PAYMENT)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transaction_id');
    });
  });

  describe('Payment Validation', () => {
    it('should reject invalid amount', async () => {
      const invalidPayment = { ...TEST_CONFIG.TEST_PAYMENT, amount: -100 };
      
      const response = await request(app)
        .post('/pay')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .send(invalidPayment)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'INVALID_AMOUNT');
    });

    it('should reject invalid currency', async () => {
      const invalidPayment = { ...TEST_CONFIG.TEST_PAYMENT, currency: 'USD' };
      
      const response = await request(app)
        .post('/pay')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .send(invalidPayment)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'INVALID_CURRENCY');
    });

    it('should reject invalid payment method', async () => {
      const invalidPayment = { ...TEST_CONFIG.TEST_PAYMENT, method: 'invalid_method' };
      
      const response = await request(app)
        .post('/pay')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .send(invalidPayment)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'INVALID_METHOD');
    });

    it('should reject invalid phone number', async () => {
      const invalidPayment = { ...TEST_CONFIG.TEST_PAYMENT, phone: 'invalid_phone' };
      
      const response = await request(app)
        .post('/pay')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .send(invalidPayment)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'INVALID_PHONE');
    });
  });

  describe('Payment Processing', () => {
    it('should process Wave payment successfully', async () => {
      const wavePayment = { ...TEST_CONFIG.TEST_PAYMENT, method: 'wave' };
      
      const response = await request(app)
        .post('/pay')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .send(wavePayment)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transaction_id');
      expect(response.body).toHaveProperty('provider', 'wave');
      expect(response.body).toHaveProperty('short_url');
    });

    it('should process Orange Money payment successfully', async () => {
      const orangePayment = { ...TEST_CONFIG.TEST_PAYMENT, method: 'orange_money' };
      
      const response = await request(app)
        .post('/pay')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .send(orangePayment)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transaction_id');
      expect(response.body).toHaveProperty('provider', 'orange_money');
      expect(response.body).toHaveProperty('redirect_url');
    });
  });

  describe('Webhook Security', () => {
    it('should reject webhook without signature in production', async () => {
      // Temporarily set environment to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/webhook/payment')
        .send(TEST_CONFIG.TEST_WEBHOOKS.wave.success)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'MISSING_SIGNATURE');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should accept webhook with signature in production', async () => {
      // Temporarily set environment to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-wave-signature', TEST_CONFIG.TEST_SIGNATURES.wave)
        .send(TEST_CONFIG.TEST_WEBHOOKS.wave.success)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('transaction_id');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should process Wave webhook successfully', async () => {
      const response = await request(app)
        .post('/webhook/payment')
        .send(TEST_CONFIG.TEST_WEBHOOKS.wave.success)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('transaction_id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('provider', 'wave');
    });

    it('should process Orange Money webhook successfully', async () => {
      const response = await request(app)
        .post('/webhook/payment')
        .send(TEST_CONFIG.TEST_WEBHOOKS.orange_money.success)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('transaction_id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('provider', 'orange_money');
    });

    it('should handle Orange Money redirect (GET)', async () => {
      const response = await request(app)
        .get('/webhook/payment')
        .query({
          order_id: TEST_CONFIG.TEST_WEBHOOKS.orange_money.success.order_id,
          status: TEST_CONFIG.TEST_WEBHOOKS.orange_money.success.status
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('transaction_id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('provider', 'orange_money');
    });
  });

  describe('Transaction Status', () => {
    it('should return transaction status', async () => {
      const transactionId = createTestTransactionId();
      
      const response = await request(app)
        .get(`/transaction/${transactionId}`)
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .expect(200);

      expect(response.body).toHaveProperty('transaction_id', transactionId);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/transaction/non_existent_id')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Transaction not found.');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(150).fill(null).map(() => 
        request(app)
          .post('/pay')
          .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
          .send(TEST_CONFIG.TEST_PAYMENT)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/undefined-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found.');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/pay')
        .set('Authorization', `Bearer ${TEST_CONFIG.TEST_API_KEY}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
}); 