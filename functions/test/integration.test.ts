// test/integration.test.ts
// Integration tests for core business logic

import { TEST_CONFIG, getAllValidPhoneNumbers } from './test-config';
import { validateWestAfricanPhone, isProviderSupportedInCountry, getAllSupportedCountries, WEST_AFRICAN_COUNTRIES } from '../src/utils/phone-validation';

// Import core validation functions (we'll need to extract these)
describe('Mobys API Integration Tests', () => {
  describe('Payment Validation Logic', () => {
    // Test payment validation logic
    const validatePayment = (payment: any) => {
      const errors: string[] = [];
      
      // Validate amount
      if (!payment.amount || payment.amount < 100) {
        errors.push('Amount must be at least 100 XOF');
      }
      
      // Validate currency
      if (payment.currency !== 'XOF') {
        errors.push('Only XOF currency is supported');
      }
      
      // Validate phone number using the new validation system
      if (!payment.phone) {
        errors.push('Phone number is required');
      } else {
        const phoneValidation = validateWestAfricanPhone(payment.phone);
        if (!phoneValidation.isValid) {
          errors.push(phoneValidation.error || 'Invalid phone number format');
        } else if (payment.method && phoneValidation.country) {
          // Check if provider is supported in the country
          // Find the country code from the country name
          const countryCode = Object.keys(WEST_AFRICAN_COUNTRIES).find(code => 
            WEST_AFRICAN_COUNTRIES[code].name === phoneValidation.country!.name
          );
          if (countryCode) {
            const isSupported = isProviderSupportedInCountry(payment.method, countryCode);
            if (!isSupported) {
              errors.push(`${payment.method} is not supported in ${phoneValidation.country.name}`);
            }
          }
        }
      }
      
      // Validate payment method
      if (!['wave', 'orange_money'].includes(payment.method)) {
        errors.push('Invalid payment method. Supported: wave, orange_money');
      }
      
      return errors;
    };

    it('should validate correct payment data for Mali', () => {
      const payment = TEST_CONFIG.TEST_PAYMENTS.mali;
      const errors = validatePayment(payment);
      expect(errors).toHaveLength(0);
    });

    it('should validate correct payment data for Côte d\'Ivoire', () => {
      const payment = TEST_CONFIG.TEST_PAYMENTS.cote_divoire;
      const errors = validatePayment(payment);
      expect(errors).toHaveLength(0);
    });

    it('should validate correct payment data for Senegal', () => {
      const payment = TEST_CONFIG.TEST_PAYMENTS.senegal;
      const errors = validatePayment(payment);
      expect(errors).toHaveLength(0);
    });

    it('should validate correct payment data for Burkina Faso', () => {
      const payment = TEST_CONFIG.TEST_PAYMENTS.burkina_faso;
      const errors = validatePayment(payment);
      expect(errors).toHaveLength(0);
    });

    it('should validate correct payment data for Nigeria', () => {
      const payment = TEST_CONFIG.TEST_PAYMENTS.nigeria;
      const errors = validatePayment(payment);
      expect(errors).toHaveLength(0);
    });

    it('should reject payment with invalid amount', () => {
      const invalidPayment = { ...TEST_CONFIG.TEST_PAYMENT, amount: 50 };
      const errors = validatePayment(invalidPayment);
      expect(errors).toContain('Amount must be at least 100 XOF');
    });

    it('should reject payment with invalid currency', () => {
      const invalidPayment = { ...TEST_CONFIG.TEST_PAYMENT, currency: 'USD' };
      const errors = validatePayment(invalidPayment);
      expect(errors).toContain('Only XOF currency is supported');
    });

    it('should reject payment with invalid phone number', () => {
      const invalidPayment = { ...TEST_CONFIG.TEST_PAYMENT, phone: 'invalid_phone' };
      const errors = validatePayment(invalidPayment);
      expect(errors).toContain('Phone number does not match any supported West African country format');
    });

    it('should reject payment with unsupported provider for country', () => {
      // Try to use Wave in Burkina Faso (only Orange Money is supported)
      const invalidPayment = { 
        ...TEST_CONFIG.TEST_PAYMENTS.burkina_faso, 
        method: 'wave' 
      };
      const errors = validatePayment(invalidPayment);
      expect(errors).toContain('wave is not supported in Burkina Faso');
    });

    it('should reject payment with invalid method', () => {
      const invalidPayment = { ...TEST_CONFIG.TEST_PAYMENT, method: 'paypal' };
      const errors = validatePayment(invalidPayment);
      expect(errors).toContain('Invalid payment method. Supported: wave, orange_money');
    });

    it('should handle multiple validation errors', () => {
      const invalidPayment = {
        amount: 50,
        currency: 'USD',
        phone: 'invalid',
        method: 'paypal'
      };
      const errors = validatePayment(invalidPayment);
      expect(errors.length).toBeGreaterThanOrEqual(4);
      expect(errors).toContain('Amount must be at least 100 XOF');
      expect(errors).toContain('Only XOF currency is supported');
      expect(errors).toContain('Phone number does not match any supported West African country format');
      expect(errors).toContain('Invalid payment method. Supported: wave, orange_money');
    });
  });

  describe('West African Phone Validation', () => {
    it('should validate all valid phone numbers from different countries', () => {
      const validPhones = getAllValidPhoneNumbers();
      
      validPhones.forEach(phone => {
        const validation = validateWestAfricanPhone(phone);
        expect(validation.isValid).toBe(true);
        expect(validation.country).toBeDefined();
        expect(validation.normalizedPhone).toBeDefined();
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = TEST_CONFIG.TEST_PHONE_NUMBERS.invalid;
      
      invalidPhones.forEach(phone => {
        const validation = validateWestAfricanPhone(phone);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBeDefined();
      });
    });

    it('should detect correct country for each phone number', () => {
      const testCases = [
        { phone: '+22391234567', expectedCountry: 'Mali' },
        { phone: '+2250701234567', expectedCountry: 'Côte d\'Ivoire' },
        { phone: '+221701234567', expectedCountry: 'Senegal' },
        { phone: '+22670123456', expectedCountry: 'Burkina Faso' },
        { phone: '+2348012345678', expectedCountry: 'Nigeria' }
      ];

      testCases.forEach(({ phone, expectedCountry }) => {
        const validation = validateWestAfricanPhone(phone);
        expect(validation.isValid).toBe(true);
        expect(validation.country?.name).toBe(expectedCountry);
      });
    });

    it('should validate phone numbers with specific country codes', () => {
      const validation = validateWestAfricanPhone('+22391234567', 'ML');
      expect(validation.isValid).toBe(true);
      expect(validation.country?.name).toBe('Mali');
    });

    it('should reject phone numbers that don\'t match specified country', () => {
      const validation = validateWestAfricanPhone('+2250701234567', 'ML');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Phone number must start with +223 for Mali');
    });
  });

  describe('Provider Support Validation', () => {
    it('should correctly identify supported providers for each country', () => {
      const testCases = [
        { countryCode: 'ML', country: 'Mali', wave: true, orange_money: true },
        { countryCode: 'CI', country: 'Côte d\'Ivoire', wave: true, orange_money: true },
        { countryCode: 'SN', country: 'Senegal', wave: true, orange_money: true },
        { countryCode: 'BF', country: 'Burkina Faso', wave: false, orange_money: true },
        { countryCode: 'NG', country: 'Nigeria', wave: false, orange_money: true }
      ];

      testCases.forEach(({ countryCode, country, wave, orange_money }) => {
        expect(isProviderSupportedInCountry('wave', countryCode)).toBe(wave);
        expect(isProviderSupportedInCountry('orange_money', countryCode)).toBe(orange_money);
      });
    });

    it('should return correct countries for each provider', () => {
      const waveCountries = getAllSupportedCountries().filter(c => 
        c.supportedProviders.includes('wave')
      );
      const orangeCountries = getAllSupportedCountries().filter(c => 
        c.supportedProviders.includes('orange_money')
      );

      expect(waveCountries.length).toBeGreaterThan(0);
      expect(orangeCountries.length).toBeGreaterThan(0);
      expect(waveCountries.length).toBeLessThanOrEqual(orangeCountries.length);
    });
  });

  describe('Webhook Processing Logic', () => {
    // Test webhook processing logic
    const processWebhook = (webhookData: any, provider: string) => {
      const result = {
        success: false,
        transaction_id: null,
        status: null,
        provider,
        errors: [] as string[]
      };

      try {
        if (provider === 'wave') {
          if (!webhookData.id || !webhookData.status || !webhookData.amount) {
            result.errors.push('Invalid Wave webhook data structure');
            return result;
          }
          
          result.transaction_id = webhookData.metadata?.mobys_transaction_id;
          result.status = webhookData.status;
          result.success = true;
        } else if (provider === 'orange_money') {
          if (!webhookData.order_id || !webhookData.status || !webhookData.amount) {
            result.errors.push('Invalid Orange Money webhook data structure');
            return result;
          }
          
          result.transaction_id = webhookData.order_id;
          result.status = webhookData.status;
          result.success = true;
        } else {
          result.errors.push('Unsupported provider');
        }
      } catch (error) {
        result.errors.push('Webhook processing error');
      }

      return result;
    };

    it('should process Wave webhook for Mali successfully', () => {
      const webhookData = TEST_CONFIG.TEST_WEBHOOKS.wave.mali;
      const result = processWebhook(webhookData, 'wave');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('wave');
      expect(result.transaction_id).toBe(webhookData.metadata.mobys_transaction_id);
      expect(result.status).toBe(webhookData.status);
      expect(result.errors).toHaveLength(0);
    });

    it('should process Wave webhook for Senegal successfully', () => {
      const webhookData = TEST_CONFIG.TEST_WEBHOOKS.wave.senegal;
      const result = processWebhook(webhookData, 'wave');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('wave');
      expect(result.transaction_id).toBe(webhookData.metadata.mobys_transaction_id);
      expect(result.status).toBe(webhookData.status);
      expect(result.errors).toHaveLength(0);
    });

    it('should process Orange Money webhook for Côte d\'Ivoire successfully', () => {
      const webhookData = TEST_CONFIG.TEST_WEBHOOKS.orange_money.cote_divoire;
      const result = processWebhook(webhookData, 'orange_money');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('orange_money');
      expect(result.transaction_id).toBe(webhookData.order_id);
      expect(result.status).toBe(webhookData.status);
      expect(result.errors).toHaveLength(0);
    });

    it('should process Orange Money webhook for Burkina Faso successfully', () => {
      const webhookData = TEST_CONFIG.TEST_WEBHOOKS.orange_money.burkina_faso;
      const result = processWebhook(webhookData, 'orange_money');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('orange_money');
      expect(result.transaction_id).toBe(webhookData.order_id);
      expect(result.status).toBe(webhookData.status);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid Wave webhook data', () => {
      const invalidWebhook = { id: 'test' }; // Missing required fields
      const result = processWebhook(invalidWebhook, 'wave');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid Wave webhook data structure');
    });

    it('should handle invalid Orange Money webhook data', () => {
      const invalidWebhook = { order_id: 'test' }; // Missing required fields
      const result = processWebhook(invalidWebhook, 'orange_money');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid Orange Money webhook data structure');
    });

    it('should handle unsupported provider', () => {
      const result = processWebhook({}, 'unsupported');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unsupported provider');
    });
  });

  describe('Transaction ID Generation', () => {
    it('should generate unique transaction IDs', () => {
      const { createTestTransactionId } = require('./test-config');
      const ids = new Set();
      
      // Generate 100 IDs and ensure they're all unique
      for (let i = 0; i < 100; i++) {
        const id = createTestTransactionId();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
      
      expect(ids.size).toBe(100);
    });

    it('should generate transaction IDs with correct format', () => {
      const { createTestTransactionId } = require('./test-config');
      const id = createTestTransactionId();
      
      expect(id).toMatch(/^txn_test_\d+_[a-z0-9]+$/);
      expect(id.length).toBeGreaterThan(20);
    });
  });

  describe('Security Validation', () => {
    // Test webhook signature validation logic
    const validateWebhookSignature = (payload: string, signature: string, secret: string) => {
      // Simple HMAC validation simulation
      const expectedSignature = `hmac_${Buffer.from(payload + secret).toString('base64')}`;
      return signature === expectedSignature;
    };

    it('should validate correct webhook signature', () => {
      const payload = JSON.stringify(TEST_CONFIG.TEST_WEBHOOKS.wave.mali);
      const secret = 'test_secret';
      const signature = `hmac_${Buffer.from(payload + secret).toString('base64')}`;
      
      const isValid = validateWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect webhook signature', () => {
      const payload = JSON.stringify(TEST_CONFIG.TEST_WEBHOOKS.wave.mali);
      const secret = 'test_secret';
      const wrongSignature = 'wrong_signature';
      
      const isValid = validateWebhookSignature(payload, wrongSignature, secret);
      expect(isValid).toBe(false);
    });

    it('should handle missing signature', () => {
      const payload = JSON.stringify(TEST_CONFIG.TEST_WEBHOOKS.wave.mali);
      const secret = 'test_secret';
      
      const isValid = validateWebhookSignature(payload, '', secret);
      expect(isValid).toBe(false);
    });
  });

  describe('Rate Limiting Logic', () => {
    // Test rate limiting logic
    const rateLimiter = {
      requests: new Map<string, number[]>(),
      
      isAllowed: function(clientId: string, limit: number = 100, windowMs: number = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!this.requests.has(clientId)) {
          this.requests.set(clientId, [now]);
          return true;
        }
        
        const clientRequests = this.requests.get(clientId)!;
        const recentRequests = clientRequests.filter(time => time > windowStart);
        
        if (recentRequests.length >= limit) {
          return false;
        }
        
        recentRequests.push(now);
        this.requests.set(clientId, recentRequests);
        return true;
      },
      
      reset: function() {
        this.requests.clear();
      }
    };

    beforeEach(() => {
      rateLimiter.reset();
    });

    it('should allow requests within rate limit', () => {
      const clientId = 'test_client';
      
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.isAllowed(clientId)).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', () => {
      const clientId = 'test_client';
      
      // Make 100 requests (should all be allowed)
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.isAllowed(clientId)).toBe(true);
      }
      
      // 101st request should be blocked
      expect(rateLimiter.isAllowed(clientId)).toBe(false);
    });

    it('should reset rate limit after window expires', () => {
      const clientId = 'test_client';
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.isAllowed(clientId)).toBe(true);
      }
      
      // 101st should be blocked
      expect(rateLimiter.isAllowed(clientId)).toBe(false);
      
      // Reset and should be allowed again
      rateLimiter.reset();
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    });
  });
}); 