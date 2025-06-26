// test/admin.test.ts
// Tests for admin tools and operations

import { 
  createManualLedgerAdjustment,
  searchTransactions,
  getTransactionDetails,
  exportTransactions,
  getAdminAdjustmentHistory,
  getSystemHealth,
  bulkUpdateTransactionStatus,
  getUserSummary
} from '../src/utils/admin';

describe('Admin Tools Tests', () => {
  describe('Manual Ledger Adjustments', () => {
    it('should create manual ledger adjustment successfully', async () => {
      const userId = 'test_user_123';
      const amount = 1000;
      const description = 'Test adjustment';
      const reason = 'Testing admin tools';
      const adminId = 'admin_123';
      const metadata = { test: true };

      // Mock the createLedgerEntry function
      const mockCreateLedgerEntry = jest.fn().mockResolvedValue({
        id: 'ledger_123',
        user_id: userId,
        amount: amount,
        type: 'adjustment'
      });

      // Mock Firestore operations
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      // Mock getUserBalance
      const originalGetUserBalance = require('../src/utils/ledger').getUserBalance;
      require('../src/utils/ledger').getUserBalance = jest.fn().mockResolvedValue({
        available_balance: 5000
      });

      // Mock createLedgerEntry
      const originalCreateLedgerEntry = require('../src/utils/ledger').createLedgerEntry;
      require('../src/utils/ledger').createLedgerEntry = mockCreateLedgerEntry;

      const adjustment = await createManualLedgerAdjustment(
        userId,
        amount,
        description,
        reason,
        adminId,
        metadata
      );

      expect(adjustment.user_id).toBe(userId);
      expect(adjustment.amount).toBe(amount);
      expect(adjustment.description).toBe(description);
      expect(adjustment.reason).toBe(reason);
      expect(adjustment.admin_id).toBe(adminId);
      expect(adjustment.type).toBe('adjustment');

      // Verify ledger entry was created
      expect(mockCreateLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          amount: amount,
          type: 'adjustment',
          description: expect.stringContaining('Admin Adjustment'),
          metadata: expect.objectContaining({
            admin_id: adminId,
            reason: reason,
            is_manual_adjustment: true
          })
        })
      );

      // Restore original functions
      require('firebase-admin/firestore').getFirestore = originalDb;
      require('../src/utils/ledger').getUserBalance = originalGetUserBalance;
      require('../src/utils/ledger').createLedgerEntry = originalCreateLedgerEntry;
    });

    it('should reject adjustment with invalid amount', async () => {
      await expect(
        createManualLedgerAdjustment(
          'user_123',
          0,
          'Test',
          'Reason',
          'admin_123'
        )
      ).rejects.toThrow('Amount must be a non-zero number');
    });

    it('should reject adjustment with missing description', async () => {
      await expect(
        createManualLedgerAdjustment(
          'user_123',
          1000,
          '',
          'Reason',
          'admin_123'
        )
      ).rejects.toThrow('Description is required');
    });

    it('should reject adjustment with missing reason', async () => {
      await expect(
        createManualLedgerAdjustment(
          'user_123',
          1000,
          'Test',
          '',
          'admin_123'
        )
      ).rejects.toThrow('Reason is required');
    });
  });

  describe('Transaction Search', () => {
    it('should search transactions with filters', async () => {
      const filters = {
        user_id: 'test_user',
        status: 'completed',
        provider: 'wave',
        min_amount: 1000
      };

      const mockTransactions = [
        {
          id: 'txn_1',
          user_id: 'test_user',
          status: 'completed',
          provider: 'wave',
          amount: 1500
        }
      ];

      // Mock Firestore query
      const mockGet = jest.fn().mockResolvedValue({
        docs: mockTransactions.map(tx => ({ data: () => tx }))
      });

      const mockWhere = jest.fn().mockReturnValue({
        where: mockWhere,
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet
          })
        })
      });

      const mockCollection = jest.fn().mockReturnValue({
        where: mockWhere
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const searchResult = await searchTransactions(filters, 50);

      expect(searchResult.transactions).toHaveLength(1);
      expect(searchResult.total).toBe(1);
      expect(searchResult.has_more).toBe(false);
      expect(searchResult.filters_applied).toEqual(filters);

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });

    it('should handle empty search results', async () => {
      const filters = { user_id: 'nonexistent_user' };

      // Mock empty results
      const mockGet = jest.fn().mockResolvedValue({
        docs: []
      });

      const mockWhere = jest.fn().mockReturnValue({
        where: mockWhere,
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet
          })
        })
      });

      const mockCollection = jest.fn().mockReturnValue({
        where: mockWhere
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const searchResult = await searchTransactions(filters, 50);

      expect(searchResult.transactions).toHaveLength(0);
      expect(searchResult.total).toBe(0);
      expect(searchResult.has_more).toBe(false);

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });
  });

  describe('Transaction Details', () => {
    it('should get transaction details with ledger entries and status history', async () => {
      const transactionId = 'txn_123';

      const mockTransaction = {
        id: transactionId,
        user_id: 'test_user',
        amount: 1000,
        status: 'completed'
      };

      const mockLedgerEntries = [
        {
          id: 'ledger_1',
          transaction_id: transactionId,
          type: 'payment',
          amount: 1000
        }
      ];

      const mockStatusHistory = [
        {
          id: 'status_1',
          status: 'completed',
          updated_at: new Date()
        }
      ];

      // Mock Firestore operations
      const mockGet = jest.fn().mockImplementation((collectionName) => {
        if (collectionName === 'transactions') {
          return Promise.resolve({
            exists: true,
            data: () => mockTransaction
          });
        }
        return Promise.resolve({ exists: false });
      });

      const mockWhere = jest.fn().mockReturnValue({
        where: mockWhere,
        orderBy: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: mockLedgerEntries.map(entry => ({ data: () => entry }))
          })
        })
      });

      const mockCollection = jest.fn().mockImplementation((collectionName) => {
        if (collectionName === 'transactions') {
          return {
            doc: jest.fn().mockReturnValue({ get: mockGet })
          };
        } else if (collectionName === 'ledger') {
          return { where: mockWhere };
        } else if (collectionName === 'transaction_status_history') {
          return {
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  docs: mockStatusHistory.map(status => ({ data: () => status }))
                })
              })
            })
          };
        }
        return { where: mockWhere };
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const details = await getTransactionDetails(transactionId);

      expect(details.transaction.id).toBe(transactionId);
      expect(details.ledger_entries).toHaveLength(1);
      expect(details.status_history).toHaveLength(1);

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });

    it('should throw error for non-existent transaction', async () => {
      // Mock non-existent transaction
      const mockGet = jest.fn().mockResolvedValue({
        exists: false
      });

      const mockCollection = jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet })
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      await expect(getTransactionDetails('nonexistent')).rejects.toThrow('Transaction not found');

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });
  });

  describe('Data Export', () => {
    it('should export transactions as JSON', async () => {
      const filters = { status: 'completed' };
      const options = { format: 'json' as const };

      // Mock searchTransactions
      const originalSearchTransactions = require('../src/utils/admin').searchTransactions;
      require('../src/utils/admin').searchTransactions = jest.fn().mockResolvedValue({
        transactions: [
          {
            id: 'txn_1',
            user_id: 'user_1',
            amount: 1000,
            status: 'completed'
          }
        ],
        total: 1,
        has_more: false,
        filters_applied: filters
      });

      const exportData = await exportTransactions(filters, options);

      const parsed = JSON.parse(exportData);
      expect(parsed.total_transactions).toBe(1);
      expect(parsed.transactions).toHaveLength(1);
      expect(parsed.filters_applied).toEqual(filters);

      // Restore original function
      require('../src/utils/admin').searchTransactions = originalSearchTransactions;
    });

    it('should export transactions as CSV', async () => {
      const filters = { status: 'completed' };
      const options = { format: 'csv' as const };

      // Mock searchTransactions
      const originalSearchTransactions = require('../src/utils/admin').searchTransactions;
      require('../src/utils/admin').searchTransactions = jest.fn().mockResolvedValue({
        transactions: [
          {
            id: 'txn_1',
            user_id: 'user_1',
            amount: 1000,
            status: 'completed',
            currency: 'XOF',
            provider: 'wave',
            phone: '+221123456789',
            country: 'Senegal',
            created_at: new Date('2024-01-01'),
            updated_at: new Date('2024-01-01')
          }
        ],
        total: 1,
        has_more: false,
        filters_applied: filters
      });

      const exportData = await exportTransactions(filters, options);

      expect(exportData).toContain('Transaction ID,User ID,Amount,Currency,Status,Provider,Phone,Country');
      expect(exportData).toContain('txn_1,user_1,1000,XOF,completed,wave,+221123456789,Senegal');

      // Restore original function
      require('../src/utils/admin').searchTransactions = originalSearchTransactions;
    });
  });

  describe('System Health', () => {
    it('should get system health metrics', async () => {
      // Mock Firestore collections
      const mockSize = jest.fn().mockReturnValue(10);
      const mockGet = jest.fn().mockResolvedValue({
        size: mockSize,
        docs: []
      });

      const mockWhere = jest.fn().mockReturnValue({
        where: mockWhere,
        get: mockGet
      });

      const mockOrderBy = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: mockGet
        })
      });

      const mockCollection = jest.fn().mockImplementation((collectionName) => {
        if (collectionName === 'balances') {
          return { get: mockGet };
        } else if (collectionName === 'transactions') {
          return { 
            get: mockGet,
            where: mockWhere
          };
        } else if (collectionName === 'ledger') {
          return { get: mockGet };
        } else if (collectionName === 'webhooks') {
          return { orderBy: mockOrderBy };
        }
        return { get: mockGet };
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const health = await getSystemHealth();

      expect(health.total_users).toBe(10);
      expect(health.total_transactions).toBe(10);
      expect(health.total_ledger_entries).toBe(10);
      expect(typeof health.system_uptime).toBe('number');

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });
  });

  describe('Bulk Operations', () => {
    it('should perform bulk status updates', async () => {
      const transactionIds = ['txn_1', 'txn_2'];
      const newStatus = 'completed';
      const adminId = 'admin_123';
      const reason = 'Bulk update test';

      // Mock updateTransactionStatus
      const mockUpdateTransactionStatus = jest.fn().mockResolvedValue({
        id: 'status_1',
        status: newStatus
      });

      // Mock the updateTransactionStatus function
      const originalUpdateTransactionStatus = require('../src/utils/ledger').updateTransactionStatus;
      require('../src/utils/ledger').updateTransactionStatus = mockUpdateTransactionStatus;

      // Mock Firestore operations
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const results = await bulkUpdateTransactionStatus(
        transactionIds,
        newStatus,
        adminId,
        reason
      );

      expect(results.success_count).toBe(2);
      expect(results.failed_count).toBe(0);
      expect(results.errors).toHaveLength(0);
      expect(mockUpdateTransactionStatus).toHaveBeenCalledTimes(2);

      // Restore original functions
      require('firebase-admin/firestore').getFirestore = originalDb;
      require('../src/utils/ledger').updateTransactionStatus = originalUpdateTransactionStatus;
    });

    it('should handle bulk update failures', async () => {
      const transactionIds = ['txn_1', 'txn_2'];
      const newStatus = 'completed';
      const adminId = 'admin_123';
      const reason = 'Bulk update test';

      // Mock updateTransactionStatus to fail for one transaction
      const mockUpdateTransactionStatus = jest.fn()
        .mockResolvedValueOnce({ id: 'status_1', status: newStatus })
        .mockRejectedValueOnce(new Error('Transaction not found'));

      // Mock the updateTransactionStatus function
      const originalUpdateTransactionStatus = require('../src/utils/ledger').updateTransactionStatus;
      require('../src/utils/ledger').updateTransactionStatus = mockUpdateTransactionStatus;

      // Mock Firestore operations
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const results = await bulkUpdateTransactionStatus(
        transactionIds,
        newStatus,
        adminId,
        reason
      );

      expect(results.success_count).toBe(1);
      expect(results.failed_count).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain('Transaction txn_2: Transaction not found');

      // Restore original functions
      require('firebase-admin/firestore').getFirestore = originalDb;
      require('../src/utils/ledger').updateTransactionStatus = originalUpdateTransactionStatus;
    });
  });
}); 