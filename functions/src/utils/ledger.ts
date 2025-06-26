// src/utils/ledger.ts
// Ledger system for immutable financial records and balance management

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validateWestAfricanPhone } from './phone-validation';

const db = getFirestore();

export interface LedgerEntry {
  id: string;
  user_id: string;
  transaction_id?: string;
  type: 'payment' | 'payout' | 'fee' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  balance_before: number;
  balance_after: number;
  description: string;
  metadata?: Record<string, any>;
  created_at: FirebaseFirestore.Timestamp;
  created_by: string; // user_id or 'system'
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference?: string; // external reference (provider transaction ID)
}

export interface Balance {
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_balance: number;
  currency: string;
  last_updated: FirebaseFirestore.Timestamp;
  last_transaction_id?: string;
}

export interface TransactionStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  previous_status?: string;
  updated_at: FirebaseFirestore.Timestamp;
  updated_by: string;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new ledger entry (immutable)
 */
export async function createLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'created_at'>): Promise<LedgerEntry> {
  const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const ledgerEntry: LedgerEntry = {
    ...entry,
    id: ledgerId,
    created_at: FieldValue.serverTimestamp() as any,
  };

  // Validate entry
  const validation = validateLedgerEntry(ledgerEntry);
  if (!validation.isValid) {
    throw new Error(`Invalid ledger entry: ${validation.error}`);
  }

  // Create the ledger entry (immutable)
  await db.collection('ledger').doc(ledgerId).set(ledgerEntry);

  // Update balance
  await updateBalance(entry.user_id, entry.amount, entry.type, entry.currency);

  // Log the ledger creation
  console.log(`Ledger entry created: ${ledgerId} for user ${entry.user_id}, amount: ${entry.amount} ${entry.currency}`);

  return ledgerEntry;
}

/**
 * Validate ledger entry
 */
export function validateLedgerEntry(entry: LedgerEntry): { isValid: boolean; error?: string } {
  if (!entry.user_id) {
    return { isValid: false, error: 'User ID is required' };
  }

  if (typeof entry.amount !== 'number' || entry.amount === 0) {
    return { isValid: false, error: 'Amount must be a non-zero number' };
  }

  if (entry.currency !== 'XOF') {
    return { isValid: false, error: 'Only XOF currency is supported' };
  }

  if (!['payment', 'payout', 'fee', 'refund', 'adjustment'].includes(entry.type)) {
    return { isValid: false, error: 'Invalid entry type' };
  }

  if (!entry.description || entry.description.trim().length === 0) {
    return { isValid: false, error: 'Description is required' };
  }

  if (entry.balance_after !== entry.balance_before + entry.amount) {
    return { isValid: false, error: 'Balance calculation mismatch' };
  }

  return { isValid: true };
}

/**
 * Update user balance
 */
export async function updateBalance(
  userId: string, 
  amount: number, 
  type: string, 
  currency: string
): Promise<Balance> {
  const balanceRef = db.collection('balances').doc(userId);
  
  return await db.runTransaction(async (transaction) => {
    const balanceDoc = await transaction.get(balanceRef);
    
    let currentBalance: Balance;
    if (balanceDoc.exists) {
      currentBalance = balanceDoc.data() as Balance;
    } else {
      // Initialize balance for new user
      currentBalance = {
        user_id: userId,
        available_balance: 0,
        pending_balance: 0,
        total_balance: 0,
        currency: 'XOF',
        last_updated: FieldValue.serverTimestamp() as any,
      };
    }

    // Calculate new balance based on entry type
    let newAvailableBalance = currentBalance.available_balance;
    let newPendingBalance = currentBalance.pending_balance;

    switch (type) {
      case 'payment':
        // Payment received - add to available balance
        newAvailableBalance += amount;
        break;
      case 'payout':
        // Payout sent - subtract from available balance
        if (newAvailableBalance < amount) {
          throw new Error(`Insufficient balance for payout. Available: ${newAvailableBalance}, Required: ${amount}`);
        }
        newAvailableBalance -= amount;
        break;
      case 'fee':
        // Fee charged - subtract from available balance
        if (newAvailableBalance < amount) {
          throw new Error(`Insufficient balance for fee. Available: ${newAvailableBalance}, Required: ${amount}`);
        }
        newAvailableBalance -= amount;
        break;
      case 'refund':
        // Refund received - add to available balance
        newAvailableBalance += amount;
        break;
      case 'adjustment':
        // Manual adjustment - can be positive or negative
        newAvailableBalance += amount;
        break;
      default:
        throw new Error(`Unknown entry type: ${type}`);
    }

    const updatedBalance: Balance = {
      ...currentBalance,
      available_balance: newAvailableBalance,
      pending_balance: newPendingBalance,
      total_balance: newAvailableBalance + newPendingBalance,
      last_updated: FieldValue.serverTimestamp() as any,
    };

    transaction.set(balanceRef, updatedBalance);
    return updatedBalance;
  });
}

/**
 * Get user balance
 */
export async function getUserBalance(userId: string): Promise<Balance | null> {
  const balanceDoc = await db.collection('balances').doc(userId).get();
  
  if (!balanceDoc.exists) {
    return null;
  }

  return balanceDoc.data() as Balance;
}

/**
 * Get ledger entries for a user
 */
export async function getUserLedgerEntries(
  userId: string,
  limit: number = 50,
  startAfter?: string
): Promise<LedgerEntry[]> {
  let query = db.collection('ledger')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(limit);

  if (startAfter) {
    const startDoc = await db.collection('ledger').doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as LedgerEntry);
}

/**
 * Get ledger entries by transaction ID
 */
export async function getLedgerEntriesByTransaction(transactionId: string): Promise<LedgerEntry[]> {
  const snapshot = await db.collection('ledger')
    .where('transaction_id', '==', transactionId)
    .orderBy('created_at', 'desc')
    .get();

  return snapshot.docs.map(doc => doc.data() as LedgerEntry);
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionId: string,
  newStatus: string,
  userId: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<TransactionStatus> {
  const statusId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Get current transaction
  const transactionDoc = await db.collection('transactions').doc(transactionId).get();
  if (!transactionDoc.exists) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  const transaction = transactionDoc.data();
  const previousStatus = transaction?.status || 'unknown';

  const statusUpdate: TransactionStatus = {
    id: statusId,
    status: newStatus as any,
    previous_status: previousStatus,
    updated_at: FieldValue.serverTimestamp() as any,
    updated_by: userId,
    reason,
    metadata,
  };

  // Update transaction status
  await db.collection('transactions').doc(transactionId).update({
    status: newStatus,
    updated_at: FieldValue.serverTimestamp(),
  });

  // Create status history entry
  await db.collection('transaction_status_history').doc(statusId).set(statusUpdate);

  // Create ledger entry for status change if it affects balance
  if (shouldCreateLedgerEntryForStatusChange(previousStatus, newStatus, transaction)) {
    await createLedgerEntryForStatusChange(transactionId, previousStatus, newStatus, userId, reason);
  }

  console.log(`Transaction ${transactionId} status updated: ${previousStatus} -> ${newStatus}`);

  return statusUpdate;
}

/**
 * Check if status change should create a ledger entry
 */
function shouldCreateLedgerEntryForStatusChange(
  previousStatus: string,
  newStatus: string,
  transaction: any
): boolean {
  // Create ledger entry when payment is completed
  if (previousStatus === 'pending' && newStatus === 'completed' && transaction?.amount) {
    return true;
  }

  // Create ledger entry when payment fails (refund if needed)
  if (previousStatus === 'pending' && newStatus === 'failed' && transaction?.amount) {
    return true;
  }

  return false;
}

/**
 * Create ledger entry for status change
 */
async function createLedgerEntryForStatusChange(
  transactionId: string,
  previousStatus: string,
  newStatus: string,
  userId: string,
  reason?: string
): Promise<void> {
  const transactionDoc = await db.collection('transactions').doc(transactionId).get();
  if (!transactionDoc.exists) return;

  const transaction = transactionDoc.data();
  const userBalance = await getUserBalance(transaction.user_id);

  if (newStatus === 'completed' && previousStatus === 'pending') {
    // Payment completed - add to user's balance
    await createLedgerEntry({
      user_id: transaction.user_id,
      transaction_id: transactionId,
      type: 'payment',
      amount: transaction.amount,
      currency: transaction.currency,
      balance_before: userBalance?.available_balance || 0,
      balance_after: (userBalance?.available_balance || 0) + transaction.amount,
      description: `Payment completed for transaction ${transactionId}`,
      metadata: {
        provider: transaction.provider,
        phone: transaction.phone,
        reason,
      },
      created_by: 'system',
      status: 'completed',
      reference: transactionId,
    });
  } else if (newStatus === 'failed' && previousStatus === 'pending') {
    // Payment failed - no balance change, but log the failure
    await createLedgerEntry({
      user_id: transaction.user_id,
      transaction_id: transactionId,
      type: 'adjustment',
      amount: 0,
      currency: transaction.currency,
      balance_before: userBalance?.available_balance || 0,
      balance_after: userBalance?.available_balance || 0,
      description: `Payment failed for transaction ${transactionId}`,
      metadata: {
        provider: transaction.provider,
        phone: transaction.phone,
        reason,
        failed_amount: transaction.amount,
      },
      created_by: 'system',
      status: 'failed',
      reference: transactionId,
    });
  }
}

/**
 * Reconcile ledger entries
 */
export async function reconcileLedger(userId: string): Promise<{
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  entries: LedgerEntry[];
}> {
  // Get all ledger entries for the user
  const entries = await getUserLedgerEntries(userId, 1000);
  
  // Calculate expected balance from ledger entries
  const expectedBalance = entries
    .filter(entry => entry.status === 'completed')
    .reduce((total, entry) => {
      switch (entry.type) {
        case 'payment':
        case 'refund':
        case 'adjustment':
          return total + entry.amount;
        case 'payout':
        case 'fee':
          return total - entry.amount;
        default:
          return total;
      }
    }, 0);

  // Get actual balance from balance document
  const actualBalanceDoc = await getUserBalance(userId);
  const actualBalance = actualBalanceDoc?.available_balance || 0;

  const difference = expectedBalance - actualBalance;

  return {
    expectedBalance,
    actualBalance,
    difference,
    entries,
  };
}

/**
 * Get balance history for a user
 */
export async function getBalanceHistory(
  userId: string,
  days: number = 30
): Promise<Array<{ date: string; balance: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const snapshot = await db.collection('ledger')
    .where('user_id', '==', userId)
    .where('created_at', '>=', startDate)
    .orderBy('created_at', 'asc')
    .get();

  const entries = snapshot.docs.map(doc => doc.data() as LedgerEntry);
  
  // Group by date and calculate daily balances
  const balanceHistory: Record<string, number> = {};
  let runningBalance = 0;

  entries.forEach(entry => {
    const date = entry.created_at.toDate().toISOString().split('T')[0];
    
    switch (entry.type) {
      case 'payment':
      case 'refund':
      case 'adjustment':
        runningBalance += entry.amount;
        break;
      case 'payout':
      case 'fee':
        runningBalance -= entry.amount;
        break;
    }

    balanceHistory[date] = runningBalance;
  });

  return Object.entries(balanceHistory).map(([date, balance]) => ({
    date,
    balance,
  }));
} 