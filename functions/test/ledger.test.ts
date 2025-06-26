// test/ledger.test.ts
// Tests for the ledger system and financial operations

import { 
  createLedgerEntry, 
  validateLedgerEntry, 
  updateBalance, 
  getUserBalance,
  updateTransactionStatus,
  reconcileLedger,
  getBalanceHistory
} from '../src/utils/ledger';

describe('Ledger System Tests', () => {
  describe('Ledger Entry Validation', () => {
    it('should validate correct ledger entry', () => {
      const entry = {
        id: 'test_id',
        user_id: 'test_user',
        type: 'payment' as const,
        amount: 1000,
        currency: 'XOF',
        balance_before: 0,
        balance_after: 1000,
        description: 'Test payment',
        created_by: 'system',
        status: 'completed' as const,
        created_at: new Date() as any
      };

      const validation = validateLedgerEntry(entry);
      expect(validation.isValid).toBe(true);
    });

    it('should reject ledger entry with missing user ID', () => {
      const entry = {
        id: 'test_id',
        user_id: '',
        type: 'payment' as const,
        amount: 1000,
        currency: 'XOF',
        balance_before: 0,
        balance_after: 1000,
        description: 'Test payment',
        created_by: 'system',
        status: 'completed' as const,
        created_at: new Date() as any
      };

      const validation = validateLedgerEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('User ID is required');
    });

    it('should reject ledger entry with invalid amount', () => {
      const entry = {
        id: 'test_id',
        user_id: 'test_user',
        type: 'payment' as const,
        amount: 0,
        currency: 'XOF',
        balance_before: 0,
        balance_after: 0,
        description: 'Test payment',
        created_by: 'system',
        status: 'completed' as const,
        created_at: new Date() as any
      };

      const validation = validateLedgerEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Amount must be a non-zero number');
    });

    it('should reject ledger entry with invalid currency', () => {
      const entry = {
        id: 'test_id',
        user_id: 'test_user',
        type: 'payment' as const,
        amount: 1000,
        currency: 'USD',
        balance_before: 0,
        balance_after: 1000,
        description: 'Test payment',
        created_by: 'system',
        status: 'completed' as const,
        created_at: new Date() as any
      };

      const validation = validateLedgerEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Only XOF currency is supported');
    });

    it('should reject ledger entry with invalid type', () => {
      const entry = {
        id: 'test_id',
        user_id: 'test_user',
        type: 'invalid' as any,
        amount: 1000,
        currency: 'XOF',
        balance_before: 0,
        balance_after: 1000,
        description: 'Test payment',
        created_by: 'system',
        status: 'completed' as const,
        created_at: new Date() as any
      };

      const validation = validateLedgerEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid entry type');
    });

    it('should reject ledger entry with missing description', () => {
      const entry = {
        id: 'test_id',
        user_id: 'test_user',
        type: 'payment' as const,
        amount: 1000,
        currency: 'XOF',
        balance_before: 0,
        balance_after: 1000,
        description: '',
        created_by: 'system',
        status: 'completed' as const,
        created_at: new Date() as any
      };

      const validation = validateLedgerEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Description is required');
    });

    it('should reject ledger entry with balance calculation mismatch', () => {
      const entry = {
        id: 'test_id',
        user_id: 'test_user',
        type: 'payment' as const,
        amount: 1000,
        currency: 'XOF',
        balance_before: 0,
        balance_after: 500, // Should be 1000
        description: 'Test payment',
        created_by: 'system',
        status: 'completed' as const,
        created_at: new Date() as any
      };

      const validation = validateLedgerEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Balance calculation mismatch');
    });
  });

  describe('Balance Management', () => {
    it('should initialize balance for new user', async () => {
      const userId = 'new_user_123';
      const balance = await getUserBalance(userId);
      
      // Should return null for non-existent user
      expect(balance).toBeNull();
    });

    it('should handle payment balance updates', async () => {
      const userId = 'test_user_payment';
      
      // Simulate payment received
      const balance = await updateBalance(userId, 1000, 'payment', 'XOF');
      
      expect(balance.available_balance).toBe(1000);
      expect(balance.total_balance).toBe(1000);
      expect(balance.currency).toBe('XOF');
    });

    it('should handle payout balance updates', async () => {
      const userId = 'test_user_payout';
      
      // First add some balance
      await updateBalance(userId, 2000, 'payment', 'XOF');
      
      // Then simulate payout
      const balance = await updateBalance(userId, 500, 'payout', 'XOF');
      
      expect(balance.available_balance).toBe(1500);
      expect(balance.total_balance).toBe(1500);
    });

    it('should reject payout with insufficient balance', async () => {
      const userId = 'test_user_insufficient';
      
      // Try to payout more than available balance
      await expect(
        updateBalance(userId, 1000, 'payout', 'XOF')
      ).rejects.toThrow('Insufficient balance for payout');
    });

    it('should handle fee deductions', async () => {
      const userId = 'test_user_fee';
      
      // First add some balance
      await updateBalance(userId, 1000, 'payment', 'XOF');
      
      // Then deduct fee
      const balance = await updateBalance(userId, 50, 'fee', 'XOF');
      
      expect(balance.available_balance).toBe(950);
      expect(balance.total_balance).toBe(950);
    });

    it('should handle refunds', async () => {
      const userId = 'test_user_refund';
      
      // First add some balance
      await updateBalance(userId, 1000, 'payment', 'XOF');
      
      // Then add refund
      const balance = await updateBalance(userId, 200, 'refund', 'XOF');
      
      expect(balance.available_balance).toBe(1200);
      expect(balance.total_balance).toBe(1200);
    });

    it('should handle adjustments', async () => {
      const userId = 'test_user_adjustment';
      
      // Positive adjustment
      let balance = await updateBalance(userId, 500, 'adjustment', 'XOF');
      expect(balance.available_balance).toBe(500);
      
      // Negative adjustment
      balance = await updateBalance(userId, -100, 'adjustment', 'XOF');
      expect(balance.available_balance).toBe(400);
    });
  });

  describe('Transaction Status Management', () => {
    it('should update transaction status successfully', async () => {
      const transactionId = 'test_transaction_123';
      const userId = 'test_user_status';
      
      // Mock transaction document
      const mockTransaction = {
        user_id: userId,
        amount: 1000,
        currency: 'XOF',
        status: 'pending'
      };

      // Mock Firestore operations
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockTransaction
      });

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockResolvedValue(undefined);

      // Mock the Firestore collection
      const mockCollection = jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: mockGet,
          update: mockUpdate
        })
      });

      const mockStatusCollection = jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          set: mockSet
        })
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: (name: string) => {
          if (name === 'transactions') return mockCollection();
          if (name === 'transaction_status_history') return mockStatusCollection();
          return mockCollection();
        }
      });

      const statusUpdate = await updateTransactionStatus(
        transactionId,
        'completed',
        userId,
        'Payment successful'
      );

      expect(statusUpdate.status).toBe('completed');
      expect(statusUpdate.updated_by).toBe(userId);
      expect(statusUpdate.reason).toBe('Payment successful');

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });
  });

  describe('Ledger Reconciliation', () => {
    it('should reconcile ledger entries correctly', async () => {
      const userId = 'test_user_reconcile';
      
      // Mock ledger entries
      const mockEntries = [
        {
          type: 'payment',
          amount: 1000,
          status: 'completed'
        },
        {
          type: 'payout',
          amount: 300,
          status: 'completed'
        },
        {
          type: 'fee',
          amount: 50,
          status: 'completed'
        }
      ];

      // Mock the getUserLedgerEntries function
      const originalGetUserLedgerEntries = require('../src/utils/ledger').getUserLedgerEntries;
      require('../src/utils/ledger').getUserLedgerEntries = jest.fn().mockResolvedValue(mockEntries);

      // Mock getUserBalance
      const originalGetUserBalance = require('../src/utils/ledger').getUserBalance;
      require('../src/utils/ledger').getUserBalance = jest.fn().mockResolvedValue({
        available_balance: 650,
        currency: 'XOF'
      });

      const reconciliation = await reconcileLedger(userId);

      expect(reconciliation.expectedBalance).toBe(650); // 1000 - 300 - 50
      expect(reconciliation.actualBalance).toBe(650);
      expect(reconciliation.difference).toBe(0);
      expect(reconciliation.is_balanced).toBe(true);

      // Restore original functions
      require('../src/utils/ledger').getUserLedgerEntries = originalGetUserLedgerEntries;
      require('../src/utils/ledger').getUserBalance = originalGetUserBalance;
    });

    it('should detect ledger discrepancies', async () => {
      const userId = 'test_user_discrepancy';
      
      // Mock ledger entries
      const mockEntries = [
        {
          type: 'payment',
          amount: 1000,
          status: 'completed'
        }
      ];

      // Mock the getUserLedgerEntries function
      const originalGetUserLedgerEntries = require('../src/utils/ledger').getUserLedgerEntries;
      require('../src/utils/ledger').getUserLedgerEntries = jest.fn().mockResolvedValue(mockEntries);

      // Mock getUserBalance with different amount
      const originalGetUserBalance = require('../src/utils/ledger').getUserBalance;
      require('../src/utils/ledger').getUserBalance = jest.fn().mockResolvedValue({
        available_balance: 900, // Should be 1000
        currency: 'XOF'
      });

      const reconciliation = await reconcileLedger(userId);

      expect(reconciliation.expectedBalance).toBe(1000);
      expect(reconciliation.actualBalance).toBe(900);
      expect(reconciliation.difference).toBe(100);
      expect(reconciliation.is_balanced).toBe(false);

      // Restore original functions
      require('../src/utils/ledger').getUserLedgerEntries = originalGetUserLedgerEntries;
      require('../src/utils/ledger').getUserBalance = originalGetUserBalance;
    });
  });

  describe('Balance History', () => {
    it('should generate balance history correctly', async () => {
      const userId = 'test_user_history';
      const days = 7;
      
      // Mock ledger entries
      const mockEntries = [
        {
          type: 'payment',
          amount: 1000,
          status: 'completed',
          created_at: { toDate: () => new Date('2024-01-01') }
        },
        {
          type: 'payout',
          amount: 300,
          status: 'completed',
          created_at: { toDate: () => new Date('2024-01-02') }
        }
      ];

      // Mock the getUserLedgerEntries function
      const originalGetUserLedgerEntries = require('../src/utils/ledger').getUserLedgerEntries;
      require('../src/utils/ledger').getUserLedgerEntries = jest.fn().mockResolvedValue(mockEntries);

      const history = await getBalanceHistory(userId, days);

      expect(history).toHaveLength(2);
      expect(history[0].balance).toBe(1000);
      expect(history[1].balance).toBe(700);

      // Restore original function
      require('../src/utils/ledger').getUserLedgerEntries = originalGetUserLedgerEntries;
    });
  });
}); 