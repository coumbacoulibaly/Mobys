// test/analytics.test.ts
// Tests for the analytics system

import { 
  getTransactionAnalytics, 
  getLedgerAnalytics, 
  getUserAnalytics, 
  getAnalyticsSummary 
} from '../src/utils/analytics';

describe('Analytics System Tests', () => {
  describe('Transaction Analytics', () => {
    it('should calculate transaction analytics correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      // Mock transaction data
      const mockTransactions = [
        {
          amount: 1000,
          status: 'completed',
          provider: 'wave',
          country: 'Senegal',
          created_at: { toDate: () => new Date('2024-01-15') }
        },
        {
          amount: 500,
          status: 'completed',
          provider: 'orange_money',
          country: 'Ivory Coast',
          created_at: { toDate: () => new Date('2024-01-16') }
        },
        {
          amount: 750,
          status: 'failed',
          provider: 'wave',
          country: 'Senegal',
          created_at: { toDate: () => new Date('2024-01-17') }
        }
      ];

      // Mock Firestore query
      const mockGet = jest.fn().mockResolvedValue({
        docs: mockTransactions.map(tx => ({ data: () => tx }))
      });

      const mockWhere = jest.fn().mockReturnValue({
        where: mockWhere,
        get: mockGet
      });

      const mockCollection = jest.fn().mockReturnValue({
        where: mockWhere
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const analytics = await getTransactionAnalytics(startDate, endDate);

      expect(analytics.total_transactions).toBe(3);
      expect(analytics.total_volume).toBe(2250);
      expect(analytics.successful_transactions).toBe(2);
      expect(analytics.failed_transactions).toBe(1);
      expect(analytics.success_rate).toBeCloseTo(66.67, 1);
      expect(analytics.average_transaction_value).toBe(750);
      expect(analytics.provider_breakdown.wave.count).toBe(2);
      expect(analytics.provider_breakdown.wave.volume).toBe(1750);
      expect(analytics.provider_breakdown.orange_money.count).toBe(1);
      expect(analytics.provider_breakdown.orange_money.volume).toBe(500);
      expect(analytics.country_breakdown.Senegal.count).toBe(2);
      expect(analytics.country_breakdown['Ivory Coast'].count).toBe(1);

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });

    it('should handle empty transaction data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      // Mock empty transaction data
      const mockGet = jest.fn().mockResolvedValue({
        docs: []
      });

      const mockWhere = jest.fn().mockReturnValue({
        where: mockWhere,
        get: mockGet
      });

      const mockCollection = jest.fn().mockReturnValue({
        where: mockWhere
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const analytics = await getTransactionAnalytics(startDate, endDate);

      expect(analytics.total_transactions).toBe(0);
      expect(analytics.total_volume).toBe(0);
      expect(analytics.successful_transactions).toBe(0);
      expect(analytics.failed_transactions).toBe(0);
      expect(analytics.success_rate).toBe(0);
      expect(analytics.average_transaction_value).toBe(0);

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });
  });

  describe('Ledger Analytics', () => {
    it('should calculate ledger analytics correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      // Mock ledger data
      const mockEntries = [
        {
          type: 'payment',
          amount: 1000,
          created_at: { toDate: () => new Date('2024-01-15') }
        },
        {
          type: 'payout',
          amount: -300,
          created_at: { toDate: () => new Date('2024-01-16') }
        },
        {
          type: 'fee',
          amount: -50,
          created_at: { toDate: () => new Date('2024-01-17') }
        },
        {
          type: 'refund',
          amount: 200,
          created_at: { toDate: () => new Date('2024-01-18') }
        }
      ];

      // Mock Firestore query
      const mockGet = jest.fn().mockResolvedValue({
        docs: mockEntries.map(entry => ({ data: () => entry }))
      });

      const mockWhere = jest.fn().mockReturnValue({
        where: mockWhere,
        get: mockGet
      });

      const mockCollection = jest.fn().mockReturnValue({
        where: mockWhere
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const analytics = await getLedgerAnalytics(startDate, endDate);

      expect(analytics.total_entries).toBe(4);
      expect(analytics.total_volume).toBe(1550); // Sum of absolute values
      expect(analytics.entry_type_breakdown.payment.count).toBe(1);
      expect(analytics.entry_type_breakdown.payment.volume).toBe(1000);
      expect(analytics.entry_type_breakdown.payout.count).toBe(1);
      expect(analytics.entry_type_breakdown.payout.volume).toBe(300);
      expect(analytics.balance_changes.total_inflows).toBe(1200); // 1000 + 200
      expect(analytics.balance_changes.total_outflows).toBe(350); // 300 + 50
      expect(analytics.balance_changes.net_change).toBe(850); // 1200 - 350

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });
  });

  describe('User Analytics', () => {
    it('should calculate user analytics correctly', async () => {
      // Mock transaction data
      const mockTransactions = [
        {
          user_id: 'user1',
          amount: 1000,
          status: 'completed',
          provider: 'wave',
          country: 'Senegal',
          created_at: { toDate: () => new Date('2024-01-15') }
        },
        {
          user_id: 'user1',
          amount: 500,
          status: 'completed',
          provider: 'wave',
          country: 'Senegal',
          created_at: { toDate: () => new Date('2024-01-16') }
        },
        {
          user_id: 'user2',
          amount: 750,
          status: 'failed',
          provider: 'orange_money',
          country: 'Ivory Coast',
          created_at: { toDate: () => new Date('2024-01-17') }
        }
      ];

      // Mock balance data
      const mockBalances = [
        {
          user_id: 'user1',
          available_balance: 1500
        },
        {
          user_id: 'user2',
          available_balance: 0
        }
      ];

      // Mock Firestore queries
      const mockTransactionsGet = jest.fn().mockResolvedValue({
        docs: mockTransactions.map(tx => ({ data: () => tx }))
      });

      const mockBalancesGet = jest.fn().mockResolvedValue({
        size: 2,
        docs: mockBalances.map(balance => ({ data: () => balance }))
      });

      const mockCollection = jest.fn().mockImplementation((collectionName) => {
        if (collectionName === 'transactions') {
          return {
            get: mockTransactionsGet
          };
        } else if (collectionName === 'balances') {
          return {
            get: mockBalancesGet
          };
        }
        return { get: jest.fn() };
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      const userAnalytics = await getUserAnalytics(10);

      expect(userAnalytics).toHaveLength(2);
      
      const user1 = userAnalytics.find(u => u.user_id === 'user1');
      expect(user1).toBeDefined();
      expect(user1.total_transactions).toBe(2);
      expect(user1.total_volume).toBe(1500);
      expect(user1.current_balance).toBe(1500);
      expect(user1.success_rate).toBe(100);
      expect(user1.preferred_provider).toBe('wave');
      expect(user1.country).toBe('Senegal');
      expect(user1.active_days).toBe(2);

      const user2 = userAnalytics.find(u => u.user_id === 'user2');
      expect(user2).toBeDefined();
      expect(user2.total_transactions).toBe(1);
      expect(user2.total_volume).toBe(750);
      expect(user2.current_balance).toBe(0);
      expect(user2.success_rate).toBe(0);
      expect(user2.preferred_provider).toBe('orange_money');
      expect(user2.country).toBe('Ivory Coast');
      expect(user2.active_days).toBe(1);

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });
  });

  describe('Analytics Summary', () => {
    it('should generate analytics summary correctly', async () => {
      // Mock the analytics functions
      const mockTransactionAnalytics = {
        total_transactions: 10,
        total_volume: 5000,
        success_rate: 80,
        provider_breakdown: {
          wave: { volume: 3000 },
          orange_money: { volume: 2000 }
        },
        country_breakdown: {
          Senegal: { volume: 3000 },
          'Ivory Coast': { volume: 2000 }
        }
      };

      const mockBalancesGet = jest.fn().mockResolvedValue({
        size: 5
      });

      const mockCollection = jest.fn().mockReturnValue({
        get: mockBalancesGet
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      // Mock the getTransactionAnalytics function
      const originalGetTransactionAnalytics = require('../src/utils/analytics').getTransactionAnalytics;
      require('../src/utils/analytics').getTransactionAnalytics = jest.fn()
        .mockResolvedValueOnce(mockTransactionAnalytics) // Today
        .mockResolvedValueOnce(mockTransactionAnalytics); // Yesterday

      const summary = await getAnalyticsSummary();

      expect(summary.total_users).toBe(5);
      expect(summary.total_transactions).toBe(20);
      expect(summary.total_volume).toBe(10000);
      expect(summary.today_transactions).toBe(10);
      expect(summary.today_volume).toBe(5000);
      expect(summary.success_rate).toBe(80);
      expect(summary.top_provider).toBe('Wave');
      expect(summary.top_country).toBe('Senegal');

      // Restore original functions
      require('firebase-admin/firestore').getFirestore = originalDb;
      require('../src/utils/analytics').getTransactionAnalytics = originalGetTransactionAnalytics;
    });
  });

  describe('Date Range Validation', () => {
    it('should handle invalid date ranges', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01'); // Invalid: end before start
      
      // Mock empty data for the test
      const mockGet = jest.fn().mockResolvedValue({
        docs: []
      });

      const mockWhere = jest.fn().mockReturnValue({
        where: mockWhere,
        get: mockGet
      });

      const mockCollection = jest.fn().mockReturnValue({
        where: mockWhere
      });

      // Mock the db object
      const originalDb = require('firebase-admin/firestore').getFirestore;
      require('firebase-admin/firestore').getFirestore = jest.fn().mockReturnValue({
        collection: mockCollection
      });

      // This should not throw an error but return empty analytics
      const analytics = await getTransactionAnalytics(startDate, endDate);

      expect(analytics.total_transactions).toBe(0);
      expect(analytics.total_volume).toBe(0);

      // Restore original db
      require('firebase-admin/firestore').getFirestore = originalDb;
    });
  });
}); 