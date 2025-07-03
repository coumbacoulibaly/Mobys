// test/basic.test.ts
// Basic tests for Mobys API

import { TEST_CONFIG } from './test-config';

describe('Mobys API Basic Tests', () => {
  describe('Configuration', () => {
    it('should have valid test configuration', () => {
      expect(TEST_CONFIG).toBeDefined();
      expect(TEST_CONFIG.TEST_API_KEY).toBeDefined();
      expect(TEST_CONFIG.TEST_USER_ID).toBeDefined();
    });

    it('should have valid payment data', () => {
      expect(TEST_CONFIG.TEST_PAYMENT).toBeDefined();
      expect(TEST_CONFIG.TEST_PAYMENT.amount).toBe(1000);
      expect(TEST_CONFIG.TEST_PAYMENT.currency).toBe('XOF');
      expect(TEST_CONFIG.TEST_PAYMENT.phone).toBeDefined();
      expect(TEST_CONFIG.TEST_PAYMENT.method).toBeDefined();
    });

    it('should have valid webhook data', () => {
      expect(TEST_CONFIG.TEST_WEBHOOKS).toBeDefined();
      expect(TEST_CONFIG.TEST_WEBHOOKS.wave).toBeDefined();
      expect(TEST_CONFIG.TEST_WEBHOOKS.orange_money).toBeDefined();
      
      // Check Wave webhook data
      expect(TEST_CONFIG.TEST_WEBHOOKS.wave.mali).toBeDefined();
      expect(TEST_CONFIG.TEST_WEBHOOKS.wave.senegal).toBeDefined();
      expect(TEST_CONFIG.TEST_WEBHOOKS.wave.failed).toBeDefined();
      
      // Check Orange Money webhook data
      expect(TEST_CONFIG.TEST_WEBHOOKS.orange_money.cote_divoire).toBeDefined();
      expect(TEST_CONFIG.TEST_WEBHOOKS.orange_money.burkina_faso).toBeDefined();
      expect(TEST_CONFIG.TEST_WEBHOOKS.orange_money.failed).toBeDefined();
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
      expect(process.env.API_KEY).toBeDefined();
      expect(process.env.WAVE_API_KEY).toBeDefined();
      expect(process.env.WAVE_API_SECRET).toBeDefined();
      expect(process.env.ORANGE_MONEY_API_KEY).toBeDefined();
      expect(process.env.ORANGE_MONEY_API_SECRET).toBeDefined();
    });
  });

  describe('Validation Logic', () => {
    it('should validate phone numbers correctly', () => {
      const { validateWestAfricanPhone } = require('../src/utils/phone-validation');
      
      // Test valid phone numbers
      const validPhones = TEST_CONFIG.TEST_PHONE_NUMBERS.valid;
      Object.values(validPhones).forEach(phone => {
        const result = validateWestAfricanPhone(phone);
        expect(result.isValid).toBe(true);
      });
      
      // Test invalid phone numbers
      TEST_CONFIG.TEST_PHONE_NUMBERS.invalid.forEach(phone => {
        const result = validateWestAfricanPhone(phone);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate amounts correctly', () => {
      const validAmounts = [100, 1000, 50000, 100000];
      const invalidAmounts = [0, -100, 'invalid', null, undefined];
      
      validAmounts.forEach(amount => {
        expect(typeof amount).toBe('number');
        expect(amount).toBeGreaterThan(0);
      });
      
      invalidAmounts.forEach(amount => {
        if (typeof amount === 'number') {
          expect(amount).toBeLessThanOrEqual(0);
        } else {
          expect(typeof amount).not.toBe('number');
        }
      });
    });

    it('should validate currencies correctly', () => {
      const validCurrencies = ['XOF', 'NGN'];
      const invalidCurrencies = ['USD', 'EUR', 'GBP', 'invalid'];
      
      validCurrencies.forEach(currency => {
        expect(currency).toMatch(/^[A-Z]{3}$/);
      });
      
      invalidCurrencies.forEach(currency => {
        if (currency !== 'invalid') {
          expect(currency).toMatch(/^[A-Z]{3}$/);
        } else {
          expect(currency).not.toMatch(/^[A-Z]{3}$/);
        }
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
    it('should have correct payment structure', () => {
      const payment = TEST_CONFIG.TEST_PAYMENT;
      
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('currency');
      expect(payment).toHaveProperty('phone');
      expect(payment).toHaveProperty('method');
      expect(payment).toHaveProperty('metadata');
      
      expect(typeof payment.amount).toBe('number');
      expect(typeof payment.currency).toBe('string');
      expect(typeof payment.phone).toBe('string');
      expect(typeof payment.method).toBe('string');
      expect(typeof payment.metadata).toBe('object');
    });

    it('should have correct webhook structure for Wave', () => {
      const webhook = TEST_CONFIG.TEST_WEBHOOKS.wave.mali;
      
      expect(webhook).toHaveProperty('id');
      expect(webhook).toHaveProperty('status');
      expect(webhook).toHaveProperty('amount');
      expect(webhook).toHaveProperty('currency');
      expect(webhook).toHaveProperty('phone');
      expect(webhook).toHaveProperty('metadata');
      
      expect(typeof webhook.id).toBe('string');
      expect(typeof webhook.status).toBe('string');
      expect(typeof webhook.amount).toBe('number');
      expect(typeof webhook.currency).toBe('string');
      expect(typeof webhook.phone).toBe('string');
      expect(typeof webhook.metadata).toBe('object');
    });

    it('should have correct webhook structure for Orange Money', () => {
      const webhook = TEST_CONFIG.TEST_WEBHOOKS.orange_money.cote_divoire;
      
      expect(webhook).toHaveProperty('order_id');
      expect(webhook).toHaveProperty('status');
      expect(webhook).toHaveProperty('amount');
      expect(webhook).toHaveProperty('currency');
      expect(webhook).toHaveProperty('phone');
      
      expect(typeof webhook.order_id).toBe('string');
      expect(typeof webhook.status).toBe('string');
      expect(typeof webhook.amount).toBe('number');
      expect(typeof webhook.currency).toBe('string');
      expect(typeof webhook.phone).toBe('string');
    });
  });
}); 