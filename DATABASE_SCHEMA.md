# 🗄️ Mobys API Database Schema

## Overview
This document outlines the Firestore database schema for the Mobys API, including all collections, their structure, and relationships.

---

## 📊 Collections

### 1. `api_keys` Collection
Stores API keys for merchant authentication and access control.

**Document ID**: API key string (e.g., `sk_live_abc123...`)

**Fields**:
```typescript
{
  userId: string;           // Reference to user/merchant
  active: boolean;          // Whether the key is active
  permissions: string[];    // Array of permissions (e.g., ['read', 'write_payments'])
  createdAt: Timestamp;     // When the key was created
  expiresAt?: Timestamp;    // Optional expiration date
  lastUsedAt?: Timestamp;   // Last time the key was used
  lastUsedIp?: string;      // IP address of last usage
  description?: string;     // Optional description
  createdBy: string;        // Who created the key (admin ID)
}
```

**Security**: Only admins can read/write

---

### 2. `users` Collection
Stores merchant/user account information.

**Document ID**: User ID (e.g., `user_123`)

**Fields**:
```typescript
{
  id: string;               // User ID
  email: string;            // User email
  name: string;             // User/company name
  phone?: string;           // Contact phone
  country: string;          // Country code (ML, CI, SN)
  status: 'active' | 'suspended' | 'pending';
  createdAt: Timestamp;     // Account creation date
  updatedAt: Timestamp;     // Last update
  metadata?: object;        // Additional merchant data
  kycStatus?: 'pending' | 'verified' | 'rejected';
  kycDocuments?: string[];  // Array of document URLs
}
```

**Security**: Users can read/write their own data, admins can access all

---

### 3. `transactions` Collection
Stores payment transaction records.

**Document ID**: Transaction ID (e.g., `txn_1703123456789_abc123`)

**Fields**:
```typescript
{
  id: string;               // Transaction ID
  user_id: string;          // Reference to user
  amount: number;           // Amount in XOF
  currency: string;         // Currency (always 'XOF')
  method: 'orange_money' | 'wave';
  phone: string;            // Customer phone number
  metadata?: object;        // Additional transaction data
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  provider: string;         // Payment provider
  provider_response?: object; // Provider's response data
  created_at: Timestamp;    // Transaction creation
  updated_at: Timestamp;    // Last update
  webhook_received_at?: Timestamp; // When webhook was received
  webhook_message?: string; // Webhook message/status
}
```

**Security**: Users can read their own transactions, create new ones, update status

---

### 4. `ledger` Collection
Immutable financial records for audit trail and balance calculation.

**Document ID**: Auto-generated (e.g., `ledger_1703123456789_abc123`)

**Fields**:
```typescript
{
  id: string;               // Ledger entry ID
  user_id: string;          // Reference to user
  type: 'payment' | 'payout' | 'refund' | 'fee';
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;           // Amount in XOF
  currency: string;         // Currency (always 'XOF')
  source_wallet: string;    // Source wallet identifier
  destination_wallet: string; // Destination wallet identifier
  transaction_id?: string;  // Reference to transaction
  payout_id?: string;       // Reference to payout
  description?: string;     // Human-readable description
  created_at: Timestamp;    // Entry creation (immutable)
  metadata?: object;        // Additional data
}
```

**Security**: Users can read their own entries, create new ones, never update/delete

---

### 5. `payouts` Collection
Stores payout requests and their status.

**Document ID**: Payout ID (e.g., `payout_1703123456789_abc123`)

**Fields**:
```typescript
{
  id: string;               // Payout ID
  user_id: string;          // Reference to user
  amount: number;           // Amount in XOF
  currency: string;         // Currency (always 'XOF')
  phone: string;            // Destination phone number
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  provider: 'orange_money' | 'wave';
  provider_response?: object; // Provider's response
  created_at: Timestamp;    // Payout creation
  updated_at: Timestamp;    // Last update
  processed_at?: Timestamp; // When payout was processed
  failure_reason?: string;  // Reason for failure
  metadata?: object;        // Additional data
}
```

**Security**: Users can read their own payouts, create new ones, update status

---

### 6. `webhooks` Collection
Logs webhook events from payment providers.

**Document ID**: Auto-generated (e.g., `webhook_1703123456789_abc123`)

**Fields**:
```typescript
{
  id: string;               // Webhook ID
  provider: 'orange_money' | 'wave';
  event_type: string;       // Type of webhook event
  status: 'received' | 'processed' | 'failed';
  payload: object;          // Raw webhook payload
  processed_payload?: object; // Processed/parsed payload
  transaction_id?: string;  // Related transaction
  created_at: Timestamp;    // When webhook was received
  processed_at?: Timestamp; // When webhook was processed
  error_message?: string;   // Error if processing failed
  ip_address?: string;      // Source IP address
}
```

**Security**: Admins can read all, system can create

---

### 7. `balances` Collection
Cached balance information for quick access.

**Document ID**: User ID (e.g., `user_123`)

**Fields**:
```typescript
{
  user_id: string;          // Reference to user
  available_balance: number; // Available balance in XOF
  pending_balance: number;  // Pending balance in XOF
  total_balance: number;    // Total balance in XOF
  currency: string;         // Currency (always 'XOF')
  last_calculated: Timestamp; // When balance was last calculated
  updated_at: Timestamp;    // Last update
}
```

**Security**: Users can read their own balance, only system can update

---

### 8. `api_logs` Collection (Optional)
Logs API requests for analytics and debugging.

**Document ID**: Auto-generated

**Fields**:
```typescript
{
  method: string;           // HTTP method
  url: string;              // Request URL
  statusCode: number;       // Response status code
  duration: string;         // Request duration
  ip: string;               // Client IP address
  userAgent?: string;       // User agent string
  timestamp: Timestamp;     // Request timestamp
  userId?: string;          // User ID if authenticated
  apiKey?: string;          // API key used (hashed)
}
```

**Security**: Admins can read, system creates

---

### 9. `error_logs` Collection (Optional)
Logs application errors for debugging.

**Document ID**: Auto-generated

**Fields**:
```typescript
{
  error: string;            // Error message
  stack?: string;           // Error stack trace
  url: string;              // Request URL
  method: string;           // HTTP method
  ip: string;               // Client IP address
  userAgent?: string;       // User agent string
  timestamp: Timestamp;     // Error timestamp
  userId?: string;          // User ID if available
}
```

**Security**: Admins can read, system creates

---

## 🔗 Relationships

### Primary Relationships:
1. **User → API Keys**: One-to-many (user has multiple API keys)
2. **User → Transactions**: One-to-many (user has multiple transactions)
3. **User → Payouts**: One-to-many (user has multiple payouts)
4. **User → Ledger**: One-to-many (user has multiple ledger entries)
5. **Transaction → Ledger**: One-to-one (each transaction creates ledger entry)
6. **Payout → Ledger**: One-to-one (each payout creates ledger entry)

### Balance Calculation:
- **Available Balance**: Sum of all successful ledger entries (payments - payouts)
- **Pending Balance**: Sum of all pending ledger entries
- **Total Balance**: Available + Pending

---

## 📈 Indexes

### Required Indexes (defined in `firestore.indexes.json`):

1. **transactions** collection:
   - `user_id` + `created_at` (descending)
   - `status` + `created_at` (descending)
   - `provider` + `created_at` (descending)

2. **ledger** collection:
   - `user_id` + `type` + `created_at` (descending)
   - `user_id` + `status` + `created_at` (descending)

3. **payouts** collection:
   - `user_id` + `status` + `created_at` (descending)

4. **webhooks** collection:
   - `provider` + `created_at` (descending)
   - `status` + `created_at` (descending)

---

## 🔐 Security Rules

### Key Security Principles:
1. **Authentication Required**: All sensitive operations require valid API key
2. **Authorization**: Users can only access their own data
3. **Immutable Records**: Ledger entries cannot be modified or deleted
4. **Data Validation**: All input data is validated at the database level
5. **Audit Trail**: All financial operations are logged in the ledger

### Access Control:
- **Users**: Can read/write their own data
- **Admins**: Can read/write all data
- **System**: Can create logs and update balances
- **Public**: No direct access to sensitive collections

---

## 🚀 Implementation Notes

### Data Consistency:
- Use Firestore transactions for operations that modify multiple documents
- Implement retry logic for failed operations
- Use server timestamps for all date fields

### Performance:
- Cache frequently accessed data (balances, user info)
- Use indexes for efficient queries
- Implement pagination for large result sets

### Monitoring:
- Monitor collection sizes and query performance
- Set up alerts for unusual activity
- Regular backup and recovery testing

---

*This schema is designed to be scalable, secure, and compliant with financial regulations while maintaining high performance for the Mobys API.*
