// src/utils/admin.ts
// Admin tools for manual operations and data management

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createLedgerEntry, getUserBalance } from './ledger';

const db = getFirestore();

export interface AdminLedgerAdjustment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: 'adjustment';
  description: string;
  reason: string;
  admin_id: string;
  created_at: FirebaseFirestore.Timestamp;
  metadata?: Record<string, any>;
}

export interface TransactionSearchFilters {
  user_id?: string;
  status?: string;
  provider?: string;
  country?: string;
  start_date?: Date;
  end_date?: Date;
  min_amount?: number;
  max_amount?: number;
  phone?: string;
}

export interface TransactionSearchResult {
  transactions: any[];
  total: number;
  has_more: boolean;
  filters_applied: TransactionSearchFilters;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  include_metadata?: boolean;
  include_ledger_entries?: boolean;
  date_range?: {
    start_date: Date;
    end_date: Date;
  };
}

/**
 * Create manual ledger adjustment (admin only)
 */
export async function createManualLedgerAdjustment(
  userId: string,
  amount: number,
  description: string,
  reason: string,
  adminId: string,
  metadata?: Record<string, any>
): Promise<AdminLedgerAdjustment> {
  // Validate amount
  if (typeof amount !== 'number' || amount === 0) {
    throw new Error('Amount must be a non-zero number');
  }

  // Validate description and reason
  if (!description || description.trim().length === 0) {
    throw new Error('Description is required');
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is required');
  }

  // Get current user balance
  const currentBalance = await getUserBalance(userId);
  const balanceBefore = currentBalance?.available_balance || 0;
  const balanceAfter = balanceBefore + amount;

  // Create adjustment ID
  const adjustmentId = `admin_adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create ledger entry for the adjustment
  await createLedgerEntry({
    user_id: userId,
    type: 'adjustment',
    amount: amount,
    currency: 'XOF',
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    description: `Admin Adjustment: ${description}`,
    metadata: {
      ...metadata,
      admin_id: adminId,
      reason: reason,
      adjustment_id: adjustmentId,
      is_manual_adjustment: true
    },
    created_by: adminId,
    status: 'completed',
    reference: adjustmentId,
  });

  // Create admin adjustment record
  const adjustment: AdminLedgerAdjustment = {
    id: adjustmentId,
    user_id: userId,
    amount: amount,
    currency: 'XOF',
    type: 'adjustment',
    description: description,
    reason: reason,
    admin_id: adminId,
    created_at: FieldValue.serverTimestamp() as any,
    metadata: metadata
  };

  await db.collection('admin_adjustments').doc(adjustmentId).set(adjustment);

  // Log the admin action
  await logAdminAction(adminId, 'ledger_adjustment', {
    user_id: userId,
    amount: amount,
    description: description,
    reason: reason,
    adjustment_id: adjustmentId
  });

  console.log(`Admin ${adminId} created ledger adjustment for user ${userId}: ${amount} XOF - ${description}`);

  return adjustment;
}

/**
 * Search transactions with filters
 */
export async function searchTransactions(
  filters: TransactionSearchFilters,
  limit: number = 50,
  startAfter?: string
): Promise<TransactionSearchResult> {
  let query = db.collection('transactions');

  // Apply filters
  if (filters.user_id) {
    query = query.where('user_id', '==', filters.user_id);
  }

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters.provider) {
    query = query.where('provider', '==', filters.provider);
  }

  if (filters.country) {
    query = query.where('country', '==', filters.country);
  }

  if (filters.start_date) {
    query = query.where('created_at', '>=', filters.start_date);
  }

  if (filters.end_date) {
    query = query.where('created_at', '<=', filters.end_date);
  }

  if (filters.min_amount !== undefined) {
    query = query.where('amount', '>=', filters.min_amount);
  }

  if (filters.max_amount !== undefined) {
    query = query.where('amount', '<=', filters.max_amount);
  }

  if (filters.phone) {
    query = query.where('phone', '==', filters.phone);
  }

  // Order by creation date (newest first)
  query = query.orderBy('created_at', 'desc');

  // Apply pagination
  if (startAfter) {
    const startDoc = await db.collection('transactions').doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  query = query.limit(limit + 1); // Get one extra to check if there are more

  const snapshot = await query.get();
  const transactions = snapshot.docs.slice(0, limit).map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const hasMore = snapshot.docs.length > limit;

  return {
    transactions,
    total: transactions.length,
    has_more: hasMore,
    filters_applied: filters
  };
}

/**
 * Get transaction details with ledger entries
 */
export async function getTransactionDetails(transactionId: string): Promise<{
  transaction: any;
  ledger_entries: any[];
  status_history: any[];
}> {
  // Get transaction
  const transactionDoc = await db.collection('transactions').doc(transactionId).get();
  if (!transactionDoc.exists) {
    throw new Error('Transaction not found');
  }

  const transaction = {
    id: transactionDoc.id,
    ...transactionDoc.data()
  };

  // Get ledger entries for this transaction
  const ledgerSnapshot = await db.collection('ledger')
    .where('transaction_id', '==', transactionId)
    .orderBy('created_at', 'desc')
    .get();

  const ledgerEntries = ledgerSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Get status history
  const statusSnapshot = await db.collection('transaction_status_history')
    .where('id', '==', transactionId)
    .orderBy('updated_at', 'desc')
    .get();

  const statusHistory = statusSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    transaction,
    ledger_entries: ledgerEntries,
    status_history: statusHistory
  };
}

/**
 * Export transaction data
 */
export async function exportTransactions(
  filters: TransactionSearchFilters,
  options: ExportOptions
): Promise<string> {
  // Get all transactions matching filters (no pagination for export)
  const searchResult = await searchTransactions(filters, 10000); // Large limit for export

  if (options.format === 'json') {
    return JSON.stringify({
      export_date: new Date().toISOString(),
      filters_applied: filters,
      total_transactions: searchResult.total,
      transactions: searchResult.transactions
    }, null, 2);
  } else if (options.format === 'csv') {
    return generateCSV(searchResult.transactions, options);
  }

  throw new Error('Unsupported export format');
}

/**
 * Generate CSV from transaction data
 */
function generateCSV(transactions: any[], options: ExportOptions): string {
  const headers = [
    'Transaction ID',
    'User ID',
    'Amount',
    'Currency',
    'Status',
    'Provider',
    'Phone',
    'Country',
    'Created At',
    'Updated At'
  ];

  if (options.include_metadata) {
    headers.push('Metadata');
  }

  const rows = transactions.map(tx => {
    const row = [
      tx.id,
      tx.user_id,
      tx.amount,
      tx.currency,
      tx.status,
      tx.provider || tx.method,
      tx.phone,
      tx.country,
      tx.created_at?.toDate?.() || tx.created_at,
      tx.updated_at?.toDate?.() || tx.updated_at
    ];

    if (options.include_metadata) {
      row.push(JSON.stringify(tx.metadata || {}));
    }

    return row.map(field => `"${field}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Get admin adjustment history
 */
export async function getAdminAdjustmentHistory(
  adminId?: string,
  userId?: string,
  limit: number = 50
): Promise<AdminLedgerAdjustment[]> {
  let query = db.collection('admin_adjustments');

  if (adminId) {
    query = query.where('admin_id', '==', adminId);
  }

  if (userId) {
    query = query.where('user_id', '==', userId);
  }

  query = query.orderBy('created_at', 'desc').limit(limit);

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as AdminLedgerAdjustment));
}

/**
 * Log admin actions for audit trail
 */
async function logAdminAction(
  adminId: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  const logId = `admin_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.collection('admin_audit_log').doc(logId).set({
    id: logId,
    admin_id: adminId,
    action: action,
    details: details,
    created_at: FieldValue.serverTimestamp(),
    ip_address: 'admin-api', // TODO: Get actual IP
    user_agent: 'admin-tool'
  });
}

/**
 * Get system health metrics
 */
export async function getSystemHealth(): Promise<{
  total_users: number;
  total_transactions: number;
  total_ledger_entries: number;
  active_transactions: number;
  failed_transactions: number;
  system_uptime: number;
  last_webhook_received: string | null;
  database_size: string;
}> {
  // Get counts
  const usersSnapshot = await db.collection('balances').get();
  const transactionsSnapshot = await db.collection('transactions').get();
  const ledgerSnapshot = await db.collection('ledger').get();
  
  // Get active transactions (pending/processing)
  const activeSnapshot = await db.collection('transactions')
    .where('status', 'in', ['pending', 'processing'])
    .get();

  // Get failed transactions
  const failedSnapshot = await db.collection('transactions')
    .where('status', '==', 'failed')
    .get();

  // Get last webhook
  const webhookSnapshot = await db.collection('webhooks')
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  const lastWebhook = webhookSnapshot.docs[0]?.data()?.created_at || null;

  return {
    total_users: usersSnapshot.size,
    total_transactions: transactionsSnapshot.size,
    total_ledger_entries: ledgerSnapshot.size,
    active_transactions: activeSnapshot.size,
    failed_transactions: failedSnapshot.size,
    system_uptime: Date.now() - (process.uptime() * 1000),
    last_webhook_received: lastWebhook,
    database_size: 'Unknown' // Firestore doesn't provide size info
  };
}

/**
 * Bulk operations on transactions
 */
export async function bulkUpdateTransactionStatus(
  transactionIds: string[],
  newStatus: string,
  adminId: string,
  reason: string
): Promise<{
  success_count: number;
  failed_count: number;
  errors: string[];
}> {
  const results = {
    success_count: 0,
    failed_count: 0,
    errors: [] as string[]
  };

  for (const transactionId of transactionIds) {
    try {
      // Import the function dynamically to avoid circular dependency
      const { updateTransactionStatus } = await import('./ledger');
      
      await updateTransactionStatus(
        transactionId,
        newStatus,
        adminId,
        reason,
        { bulk_operation: true, admin_id: adminId }
      );

      results.success_count++;
    } catch (error: any) {
      results.failed_count++;
      results.errors.push(`Transaction ${transactionId}: ${error.message}`);
    }
  }

  // Log bulk operation
  await logAdminAction(adminId, 'bulk_status_update', {
    transaction_count: transactionIds.length,
    new_status: newStatus,
    reason: reason,
    success_count: results.success_count,
    failed_count: results.failed_count,
    errors: results.errors
  });

  return results;
}

/**
 * Get user summary for admin view
 */
export async function getUserSummary(userId: string): Promise<{
  user_id: string;
  balance: any;
  transaction_summary: {
    total: number;
    successful: number;
    failed: number;
    total_volume: number;
    last_transaction: any;
  };
  ledger_summary: {
    total_entries: number;
    total_volume: number;
    last_entry: any;
  };
  activity_summary: {
    first_activity: string;
    last_activity: string;
    active_days: number;
    preferred_provider: string;
  };
}> {
  // Get balance
  const balance = await getUserBalance(userId);

  // Get transaction summary
  const transactionsSnapshot = await db.collection('transactions')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .get();

  const transactions = transactionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const transactionSummary = {
    total: transactions.length,
    successful: transactions.filter(tx => tx.status === 'completed').length,
    failed: transactions.filter(tx => tx.status === 'failed').length,
    total_volume: transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    last_transaction: transactions[0] || null
  };

  // Get ledger summary
  const ledgerSnapshot = await db.collection('ledger')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .get();

  const ledgerEntries = ledgerSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const ledgerSummary = {
    total_entries: ledgerEntries.length,
    total_volume: ledgerEntries.reduce((sum, entry) => sum + Math.abs(entry.amount || 0), 0),
    last_entry: ledgerEntries[0] || null
  };

  // Get activity summary
  const activityDates = new Set();
  const providerCounts: Record<string, number> = {};

  transactions.forEach(tx => {
    if (tx.created_at) {
      const date = tx.created_at.toDate ? tx.created_at.toDate().toISOString().split('T')[0] : new Date(tx.created_at).toISOString().split('T')[0];
      activityDates.add(date);
    }

    const provider = tx.provider || tx.method;
    if (provider) {
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    }
  });

  const preferredProvider = Object.entries(providerCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

  const activitySummary = {
    first_activity: transactions[transactions.length - 1]?.created_at || null,
    last_activity: transactions[0]?.created_at || null,
    active_days: activityDates.size,
    preferred_provider: preferredProvider
  };

  return {
    user_id: userId,
    balance,
    transaction_summary: transactionSummary,
    ledger_summary: ledgerSummary,
    activity_summary: activitySummary
  };
} 