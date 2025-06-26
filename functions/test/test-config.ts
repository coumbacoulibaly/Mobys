// test/test-config.ts
// Test configuration for Mobys API

export const TEST_CONFIG = {
  // Test API keys
  TEST_API_KEY: 'test_api_key_123',
  TEST_USER_ID: 'test_user_123',
  
  // Test payment data for different countries
  TEST_PAYMENTS: {
    mali: {
      amount: 1000,
      currency: 'XOF',
      phone: '+22391234567',
      method: 'wave',
      metadata: {
        order_id: 'TEST_ORDER_ML_123',
        description: 'Test payment - Mali'
      }
    },
    cote_divoire: {
      amount: 1000,
      currency: 'XOF',
      phone: '+2250701234567',
      method: 'orange_money',
      metadata: {
        order_id: 'TEST_ORDER_CI_123',
        description: 'Test payment - Côte d\'Ivoire'
      }
    },
    senegal: {
      amount: 1000,
      currency: 'XOF',
      phone: '+221701234567',
      method: 'wave',
      metadata: {
        order_id: 'TEST_ORDER_SN_123',
        description: 'Test payment - Senegal'
      }
    },
    burkina_faso: {
      amount: 1000,
      currency: 'XOF',
      phone: '+22670123456',
      method: 'orange_money',
      metadata: {
        order_id: 'TEST_ORDER_BF_123',
        description: 'Test payment - Burkina Faso'
      }
    },
    nigeria: {
      amount: 1000,
      currency: 'XOF',
      phone: '+2348012345678',
      method: 'orange_money',
      metadata: {
        order_id: 'TEST_ORDER_NG_123',
        description: 'Test payment - Nigeria'
      }
    }
  },
  
  // Default test payment (Mali)
  TEST_PAYMENT: {
    amount: 1000,
    currency: 'XOF',
    phone: '+22391234567',
    method: 'wave',
    metadata: {
      order_id: 'TEST_ORDER_123',
      description: 'Test payment'
    }
  },
  
  // Test webhook data for different countries
  TEST_WEBHOOKS: {
    wave: {
      mali: {
        id: 'wave_test_ml_123',
        status: 'success',
        amount: 1000,
        currency: 'XOF',
        phone: '+22391234567',
        metadata: {
          mobys_transaction_id: 'txn_test_ml_123'
        }
      },
      senegal: {
        id: 'wave_test_sn_123',
        status: 'success',
        amount: 1000,
        currency: 'XOF',
        phone: '+221701234567',
        metadata: {
          mobys_transaction_id: 'txn_test_sn_123'
        }
      },
      failed: {
        id: 'wave_test_456',
        status: 'failed',
        amount: 1000,
        currency: 'XOF',
        phone: '+22391234567',
        metadata: {
          mobys_transaction_id: 'txn_test_456'
        }
      }
    },
    orange_money: {
      cote_divoire: {
        order_id: 'orange_test_ci_123',
        status: 'SUCCESS',
        amount: 1000,
        currency: 'XOF',
        phone: '+2250701234567'
      },
      burkina_faso: {
        order_id: 'orange_test_bf_123',
        status: 'SUCCESS',
        amount: 1000,
        currency: 'XOF',
        phone: '+22670123456'
      },
      failed: {
        order_id: 'orange_test_456',
        status: 'FAILED',
        amount: 1000,
        currency: 'XOF'
      }
    }
  },
  
  // Test signatures (for webhook testing)
  TEST_SIGNATURES: {
    wave: 'test_wave_signature_123',
    orange_money: 'test_orange_signature_123'
  },
  
  // Test IPs
  TEST_IPS: {
    allowed: '127.0.0.1',
    blocked: '192.168.1.1'
  },
  
  // Test phone numbers for validation
  TEST_PHONE_NUMBERS: {
    valid: {
      mali: '+22391234567',
      cote_divoire: '+2250701234567',
      senegal: '+221701234567',
      burkina_faso: '+22670123456',
      niger: '+22790123456',
      togo: '+22890123456',
      benin: '+22990123456',
      guinea: '+224601234567',
      guinea_bissau: '+2455012345',
      sierra_leone: '+23230123456',
      liberia: '+23170123456',
      ghana: '+233201234567',
      nigeria: '+2348012345678',
      cameroon: '+23760123456',
      chad: '+23560123456',
      central_african_republic: '+23670123456'
    },
    invalid: [
      '1234567890',
      '+1234567890',
      '+223123', // Too short
      '+223123456789012345', // Too long
      '+99912345678', // Invalid country code
      'invalid_phone',
      '+223abcdefg', // Non-numeric
      '+223 123 4567', // With spaces
      '+223-123-4567' // With dashes
    ]
  },
  
  // Environment
  ENVIRONMENT: process.env.NODE_ENV || 'test'
};

// Helper function to create test transaction ID
export function createTestTransactionId(): string {
  return `txn_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to create test webhook ID
export function createTestWebhookId(): string {
  return `webhook_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to get test payment for a specific country
export function getTestPayment(country: keyof typeof TEST_CONFIG.TEST_PAYMENTS) {
  return TEST_CONFIG.TEST_PAYMENTS[country];
}

// Helper function to get all valid phone numbers
export function getAllValidPhoneNumbers() {
  return Object.values(TEST_CONFIG.TEST_PHONE_NUMBERS.valid);
} 