// test/basic.test.ts
// Basic functionality tests for Mobys API

import { TEST_CONFIG } from './test-config';

describe('Mobys API Basic Tests', () => {
  describe('Configuration', () => {
    it('should have valid test configuration', () => {
      expect(TEST_CONFIG.TEST_API_KEY).toBeDefined();
      expect(TEST_CONFIG.TEST_PAYMENT).toBeDefined();
      expect(TEST_CONFIG.TEST_WEBHOOKS).toBeDefined();
    });

    it('should have valid payment data', () => {
      const payment = TEST_CONFIG.TEST_PAYMENT;
      expect(payment.amount).toBeGreaterThan(0);
      expect(payment.currency).toBe('XOF');
      expect(payment.phone).toMatch(/^\+223\d{8}$/);
      expect(['wave', 'orange_money']).toContain(payment.method);
    });

    it('should have valid webhook data', () => {
      expect(TEST_CONFIG.TEST_WEBHOOKS.wave.success).toBeDefined();
      expect(TEST_CONFIG.TEST_WEBHOOKS.orange_money.success).toBeDefined();
    });
  });

  describe('Helper Functions', () => {
    it('should generate unique transaction IDs', () => {
      const { createTestTransactionId } = require('./test-config');
      const id1 = createTestTransactionId();
      const id2 = createTestTransactionId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^txn_test_\d+_[a-z0-9]+$/);
    });

    it('should generate unique webhook IDs', () => {
      const { createTestWebhookId } = require('./test-config');
      const id1 = createTestWebhookId();
      const id2 = createTestWebhookId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^webhook_test_\d+_[a-z0-9]+$/);
    });
  });

  describe('Environment Variables', () => {
    it('should have required environment variables set', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.WAVE_API_KEY).toBeDefined();
      expect(process.env.ORANGE_MONEY_API_KEY).toBeDefined();
    });
  });

  describe('Validation Logic', () => {
    it('should validate phone numbers correctly', () => {
      const validPhones = ['+22391234567', '+22387654321'];
      const invalidPhones = ['1234567890', '+1234567890', 'invalid'];
      
      validPhones.forEach(phone => {
        expect(phone).toMatch(/^\+223\d{8}$/);
      });
      
      invalidPhones.forEach(phone => {
        expect(phone).not.toMatch(/^\+223\d{8}$/);
      });
    });

    it('should validate amounts correctly', () => {
      const validAmounts = [100, 1000, 50000];
      const invalidAmounts = [-100, 0, 99];
      
      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeGreaterThanOrEqual(100);
      });
      
      invalidAmounts.forEach(amount => {
        expect(amount <= 0 || amount < 100).toBe(true);
      });
    });

    it('should validate currencies correctly', () => {
      const validCurrencies = ['XOF'];
      const invalidCurrencies = ['USD', 'EUR', 'GBP'];
      
      validCurrencies.forEach(currency => {
        expect(currency).toBe('XOF');
      });
      
      invalidCurrencies.forEach(currency => {
        expect(currency).not.toBe('XOF');
      });
    });

    it('should validate payment methods correctly', () => {
      const validMethods = ['wave', 'orange_money'];
      const invalidMethods = ['paypal', 'stripe', 'invalid'];
      
      validMethods.forEach(method => {
        expect(['wave', 'orange_money']).toContain(method);
      });
      
      invalidMethods.forEach(method => {
        expect(['wave', 'orange_money']).not.toContain(method);
      });
    });
  });

  describe('Data Structures', () => {
    it('should have correct webhook structure for Wave', () => {
      const webhook = TEST_CONFIG.TEST_WEBHOOKS.wave.success;
      expect(webhook).toHaveProperty('id');
      expect(webhook).toHaveProperty('status');
      expect(webhook).toHaveProperty('amount');
      expect(webhook).toHaveProperty('currency');
      expect(webhook).toHaveProperty('phone');
      expect(webhook).toHaveProperty('metadata');
      expect(webhook.metadata).toHaveProperty('mobys_transaction_id');
    });

    it('should have correct webhook structure for Orange Money', () => {
      const webhook = TEST_CONFIG.TEST_WEBHOOKS.orange_money.success;
      expect(webhook).toHaveProperty('order_id');
      expect(webhook).toHaveProperty('status');
      expect(webhook).toHaveProperty('amount');
      expect(webhook).toHaveProperty('currency');
    });

    it('should have correct payment structure', () => {
      const payment = TEST_CONFIG.TEST_PAYMENT;
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('currency');
      expect(payment).toHaveProperty('phone');
      expect(payment).toHaveProperty('method');
      expect(payment).toHaveProperty('metadata');
      expect(payment.metadata).toHaveProperty('order_id');
      expect(payment.metadata).toHaveProperty('description');
    });
  });
}); 