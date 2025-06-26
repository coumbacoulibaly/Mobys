// src/utils/analytics.ts
// Analytics system for ledger and transaction data

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

export interface AnalyticsPeriod {
  start_date: string;
  end_date: string;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface TransactionAnalytics {
  total_transactions: number;
  total_volume: number;
  successful_transactions: number;
  failed_transactions: number;
  success_rate: number;
  average_transaction_value: number;
  provider_breakdown: {
    wave: { count: number; volume: number };
    orange_money: { count: number; volume: number };
  };
  country_breakdown: Record<string, { count: number; volume: number }>;
  daily_breakdown: Array<{
    date: string;
    transactions: number;
    volume: number;
    success_rate: number;
  }>;
}

export interface LedgerAnalytics {
  total_entries: number;
  total_volume: number;
  entry_type_breakdown: {
    payment: { count: number; volume: number };
    payout: { count: number; volume: number };
    fee: { count: number; volume: number };
    refund: { count: number; volume: number };
    adjustment: { count: number; volume: number };
  };
  balance_changes: {
    total_inflows: number;
    total_outflows: number;
    net_change: number;
  };
  daily_breakdown: Array<{
    date: string;
    entries: number;
    volume: number;
    net_change: number;
  }>;
}

export interface UserAnalytics {
  user_id: string;
  total_transactions: number;
  total_volume: number;
  current_balance: number;
  success_rate: number;
  preferred_provider: string;
  active_days: number;
  last_activity: string;
  country: string;
}

/**
 * Get transaction analytics for a date range
 */
export async function getTransactionAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<TransactionAnalytics> {
  let query = db.collection('transactions')
    .where('created_at', '>=', startDate)
    .where('created_at', '<=', endDate);

  if (userId) {
    query = query.where('user_id', '==', userId);
  }

  const snapshot = await query.get();
  const transactions = snapshot.docs.map(doc => doc.data());

  // Calculate basic metrics
  const totalTransactions = transactions.length;
  const totalVolume = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const successfulTransactions = transactions.filter(tx => tx.status === 'completed').length;
  const failedTransactions = transactions.filter(tx => tx.status === 'failed').length;
  const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
  const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

  // Provider breakdown
  const providerBreakdown = {
    wave: { count: 0, volume: 0 },
    orange_money: { count: 0, volume: 0 }
  };

  transactions.forEach(tx => {
    const provider = tx.provider || tx.method;
    if (provider === 'wave') {
      providerBreakdown.wave.count++;
      providerBreakdown.wave.volume += tx.amount || 0;
    } else if (provider === 'orange_money') {
      providerBreakdown.orange_money.count++;
      providerBreakdown.orange_money.volume += tx.amount || 0;
    }
  });

  // Country breakdown
  const countryBreakdown: Record<string, { count: number; volume: number }> = {};
  transactions.forEach(tx => {
    const country = tx.country || 'Unknown';
    if (!countryBreakdown[country]) {
      countryBreakdown[country] = { count: 0, volume: 0 };
    }
    countryBreakdown[country].count++;
    countryBreakdown[country].volume += tx.amount || 0;
  });

  // Daily breakdown
  const dailyBreakdown = getDailyBreakdown(transactions, startDate, endDate);

  return {
    total_transactions: totalTransactions,
    total_volume: totalVolume,
    successful_transactions: successfulTransactions,
    failed_transactions: failedTransactions,
    success_rate: successRate,
    average_transaction_value: averageTransactionValue,
    provider_breakdown: providerBreakdown,
    country_breakdown: countryBreakdown,
    daily_breakdown: dailyBreakdown
  };
}

/**
 * Get ledger analytics for a date range
 */
export async function getLedgerAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<LedgerAnalytics> {
  let query = db.collection('ledger')
    .where('created_at', '>=', startDate)
    .where('created_at', '<=', endDate);

  if (userId) {
    query = query.where('user_id', '==', userId);
  }

  const snapshot = await query.get();
  const entries = snapshot.docs.map(doc => doc.data());

  // Calculate basic metrics
  const totalEntries = entries.length;
  const totalVolume = entries.reduce((sum, entry) => sum + Math.abs(entry.amount || 0), 0);

  // Entry type breakdown
  const entryTypeBreakdown = {
    payment: { count: 0, volume: 0 },
    payout: { count: 0, volume: 0 },
    fee: { count: 0, volume: 0 },
    refund: { count: 0, volume: 0 },
    adjustment: { count: 0, volume: 0 }
  };

  entries.forEach(entry => {
    const type = entry.type;
    if (entryTypeBreakdown[type]) {
      entryTypeBreakdown[type].count++;
      entryTypeBreakdown[type].volume += Math.abs(entry.amount || 0);
    }
  });

  // Balance changes
  const totalInflows = entries
    .filter(entry => ['payment', 'refund', 'adjustment'].includes(entry.type) && entry.amount > 0)
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalOutflows = entries
    .filter(entry => ['payout', 'fee', 'adjustment'].includes(entry.type) && entry.amount < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  const netChange = totalInflows - totalOutflows;

  // Daily breakdown
  const dailyBreakdown = getLedgerDailyBreakdown(entries, startDate, endDate);

  return {
    total_entries: totalEntries,
    total_volume: totalVolume,
    entry_type_breakdown: entryTypeBreakdown,
    balance_changes: {
      total_inflows: totalInflows,
      total_outflows: totalOutflows,
      net_change: netChange
    },
    daily_breakdown: dailyBreakdown
  };
}

/**
 * Get user analytics (top users by volume/activity)
 */
export async function getUserAnalytics(limit: number = 10): Promise<UserAnalytics[]> {
  // Get all users with transactions
  const transactionsSnapshot = await db.collection('transactions').get();
  const transactions = transactionsSnapshot.docs.map(doc => doc.data());

  // Group by user
  const userStats: Record<string, any> = {};
  
  transactions.forEach(tx => {
    const userId = tx.user_id;
    if (!userStats[userId]) {
      userStats[userId] = {
        user_id: userId,
        transactions: [],
        total_volume: 0,
        successful_count: 0,
        provider_counts: { wave: 0, orange_money: 0 },
        countries: new Set(),
        activity_dates: new Set()
      };
    }

    userStats[userId].transactions.push(tx);
    userStats[userId].total_volume += tx.amount || 0;
    if (tx.status === 'completed') {
      userStats[userId].successful_count++;
    }

    const provider = tx.provider || tx.method;
    if (provider === 'wave') {
      userStats[userId].provider_counts.wave++;
    } else if (provider === 'orange_money') {
      userStats[userId].provider_counts.orange_money++;
    }

    if (tx.country) {
      userStats[userId].countries.add(tx.country);
    }

    if (tx.created_at) {
      const date = tx.created_at.toDate ? tx.created_at.toDate().toISOString().split('T')[0] : new Date(tx.created_at).toISOString().split('T')[0];
      userStats[userId].activity_dates.add(date);
    }
  });

  // Get current balances
  const balancesSnapshot = await db.collection('balances').get();
  const balances = balancesSnapshot.docs.map(doc => doc.data());

  // Combine and format user analytics
  const userAnalytics: UserAnalytics[] = Object.values(userStats).map((stats: any) => {
    const totalTransactions = stats.transactions.length;
    const successRate = totalTransactions > 0 ? (stats.successful_count / totalTransactions) * 100 : 0;
    const preferredProvider = stats.provider_counts.wave > stats.provider_counts.orange_money ? 'wave' : 'orange_money';
    const country = Array.from(stats.countries)[0] || 'Unknown';
    const activeDays = stats.activity_dates.size;
    const lastActivity = stats.transactions.length > 0 
      ? stats.transactions[stats.transactions.length - 1].created_at 
      : null;

    const balance = balances.find(b => b.user_id === stats.user_id);
    const currentBalance = balance ? balance.available_balance : 0;

    return {
      user_id: stats.user_id,
      total_transactions: totalTransactions,
      total_volume: stats.total_volume,
      current_balance: currentBalance,
      success_rate: successRate,
      preferred_provider: preferredProvider,
      active_days: activeDays,
      last_activity: lastActivity ? (lastActivity.toDate ? lastActivity.toDate().toISOString() : new Date(lastActivity).toISOString()) : null,
      country
    };
  });

  // Sort by total volume and return top users
  return userAnalytics
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, limit);
}

/**
 * Get daily breakdown for transactions
 */
function getDailyBreakdown(
  transactions: any[],
  startDate: Date,
  endDate: Date
): Array<{ date: string; transactions: number; volume: number; success_rate: number }> {
  const dailyStats: Record<string, { transactions: any[]; volume: number; successful: number }> = {};

  // Initialize all dates in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dailyStats[dateStr] = { transactions: [], volume: 0, successful: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group transactions by date
  transactions.forEach(tx => {
    const date = tx.created_at.toDate ? tx.created_at.toDate().toISOString().split('T')[0] : new Date(tx.created_at).toISOString().split('T')[0];
    if (dailyStats[date]) {
      dailyStats[date].transactions.push(tx);
      dailyStats[date].volume += tx.amount || 0;
      if (tx.status === 'completed') {
        dailyStats[date].successful++;
      }
    }
  });

  // Format results
  return Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    transactions: stats.transactions.length,
    volume: stats.volume,
    success_rate: stats.transactions.length > 0 ? (stats.successful / stats.transactions.length) * 100 : 0
  }));
}

/**
 * Get daily breakdown for ledger entries
 */
function getLedgerDailyBreakdown(
  entries: any[],
  startDate: Date,
  endDate: Date
): Array<{ date: string; entries: number; volume: number; net_change: number }> {
  const dailyStats: Record<string, { entries: any[]; volume: number; net_change: number }> = {};

  // Initialize all dates in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dailyStats[dateStr] = { entries: [], volume: 0, net_change: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group entries by date
  entries.forEach(entry => {
    const date = entry.created_at.toDate ? entry.created_at.toDate().toISOString().split('T')[0] : new Date(entry.created_at).toISOString().split('T')[0];
    if (dailyStats[date]) {
      dailyStats[date].entries.push(entry);
      dailyStats[date].volume += Math.abs(entry.amount || 0);
      dailyStats[date].net_change += entry.amount || 0;
    }
  });

  // Format results
  return Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    entries: stats.entries.length,
    volume: stats.volume,
    net_change: stats.net_change
  }));
}

/**
 * Get analytics summary for dashboard
 */
export async function getAnalyticsSummary(): Promise<{
  total_users: number;
  total_transactions: number;
  total_volume: number;
  today_transactions: number;
  today_volume: number;
  success_rate: number;
  top_provider: string;
  top_country: string;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Get today's analytics
  const todayAnalytics = await getTransactionAnalytics(today, new Date());
  
  // Get yesterday's analytics for comparison
  const yesterdayAnalytics = await getTransactionAnalytics(yesterday, today);

  // Get unique users
  const usersSnapshot = await db.collection('balances').get();
  const totalUsers = usersSnapshot.size;

  // Determine top provider and country
  const topProvider = todayAnalytics.provider_breakdown.wave.volume > todayAnalytics.provider_breakdown.orange_money.volume ? 'Wave' : 'Orange Money';
  const topCountry = Object.entries(todayAnalytics.country_breakdown)
    .sort(([,a], [,b]) => b.volume - a.volume)[0]?.[0] || 'Unknown';

  return {
    total_users: totalUsers,
    total_transactions: todayAnalytics.total_transactions + yesterdayAnalytics.total_transactions,
    total_volume: todayAnalytics.total_volume + yesterdayAnalytics.total_volume,
    today_transactions: todayAnalytics.total_transactions,
    today_volume: todayAnalytics.total_volume,
    success_rate: todayAnalytics.success_rate,
    top_provider: topProvider,
    top_country: topCountry
  };
} 