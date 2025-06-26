# 🔧 Admin Tools Documentation

## Overview
The Mobys API includes comprehensive admin tools for managing transactions, ledger entries, and system operations. These tools provide administrative control and oversight capabilities.

---

## 🎯 Admin Endpoints

### 1. **Manual Ledger Adjustments** - `POST /admin/ledger/adjustment`
Create manual ledger adjustments for users with full audit trail.

**Request Body:**
```json
{
  "user_id": "user_123",
  "amount": 1000,
  "description": "Manual adjustment for service credit",
  "reason": "Customer service compensation",
  "metadata": {
    "admin_note": "Customer reported payment issue",
    "ticket_id": "CS-12345"
  }
}
```

**Response:**
```json
{
  "message": "Ledger adjustment created successfully",
  "adjustment": {
    "id": "admin_adj_1704067200000_abc123",
    "user_id": "user_123",
    "amount": 1000,
    "currency": "XOF",
    "type": "adjustment",
    "description": "Manual adjustment for service credit",
    "reason": "Customer service compensation",
    "admin_id": "admin_456",
    "created_at": "2024-01-01T00:00:00.000Z",
    "metadata": {
      "admin_note": "Customer reported payment issue",
      "ticket_id": "CS-12345"
    }
  }
}
```

### 2. **Transaction Search** - `GET /admin/transactions/search`
Advanced transaction search with multiple filters.

**Query Parameters:**
- `user_id` (optional): Filter by specific user
- `status` (optional): Filter by transaction status
- `provider` (optional): Filter by payment provider
- `country` (optional): Filter by country
- `phone` (optional): Filter by phone number
- `min_amount` (optional): Minimum transaction amount
- `max_amount` (optional): Maximum transaction amount
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `limit` (optional): Number of results (default: 50, max: 100)
- `start_after` (optional): Pagination cursor

**Response:**
```json
{
  "transactions": [
    {
      "id": "txn_123",
      "user_id": "user_456",
      "amount": 5000,
      "currency": "XOF",
      "status": "completed",
      "provider": "wave",
      "phone": "+221123456789",
      "country": "Senegal",
      "created_at": "2024-01-01T10:30:00.000Z"
    }
  ],
  "total": 1,
  "has_more": false,
  "filters_applied": {
    "status": "completed",
    "provider": "wave"
  }
}
```

### 3. **Transaction Details** - `GET /admin/transaction/:id/details`
Get comprehensive details for a specific transaction.

**Response:**
```json
{
  "transaction": {
    "id": "txn_123",
    "user_id": "user_456",
    "amount": 5000,
    "status": "completed",
    "provider": "wave",
    "created_at": "2024-01-01T10:30:00.000Z"
  },
  "ledger_entries": [
    {
      "id": "ledger_123",
      "transaction_id": "txn_123",
      "type": "payment",
      "amount": 5000,
      "balance_before": 0,
      "balance_after": 5000,
      "created_at": "2024-01-01T10:30:00.000Z"
    }
  ],
  "status_history": [
    {
      "id": "status_123",
      "status": "completed",
      "previous_status": "pending",
      "updated_at": "2024-01-01T10:35:00.000Z",
      "updated_by": "system",
      "reason": "Payment confirmed"
    }
  ]
}
```

### 4. **Data Export** - `GET /admin/transactions/export`
Export transaction data in JSON or CSV format.

**Query Parameters:**
- `format` (optional): Export format - `json` or `csv` (default: json)
- `include_metadata` (optional): Include metadata in export (default: false)
- `include_ledger_entries` (optional): Include ledger entries (default: false)
- All transaction search filters are supported

**Response Headers:**
```
Content-Type: application/json
Content-Disposition: attachment; filename="transactions_export_2024-01-01.json"
```

### 5. **Admin Adjustment History** - `GET /admin/adjustments/history`
View history of manual ledger adjustments.

**Query Parameters:**
- `admin_id` (optional): Filter by admin who made the adjustment
- `user_id` (optional): Filter by user who received the adjustment
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "adjustments": [
    {
      "id": "admin_adj_123",
      "user_id": "user_456",
      "amount": 1000,
      "description": "Service credit",
      "reason": "Customer compensation",
      "admin_id": "admin_789",
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50
}
```

### 6. **System Health** - `GET /admin/system/health`
Monitor system health and key metrics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "metrics": {
    "total_users": 150,
    "total_transactions": 1250,
    "total_ledger_entries": 2500,
    "active_transactions": 25,
    "failed_transactions": 15,
    "system_uptime": 86400000,
    "last_webhook_received": "2024-01-01T11:45:00.000Z",
    "database_size": "Unknown"
  }
}
```

### 7. **Bulk Transaction Update** - `POST /admin/transactions/bulk-update`
Update status of multiple transactions at once.

**Request Body:**
```json
{
  "transaction_ids": ["txn_1", "txn_2", "txn_3"],
  "new_status": "completed",
  "reason": "Bulk status update for reconciliation"
}
```

**Response:**
```json
{
  "message": "Bulk update completed",
  "results": {
    "success_count": 3,
    "failed_count": 0,
    "errors": []
  }
}
```

### 8. **User Summary** - `GET /admin/user/:id/summary`
Get comprehensive summary for a specific user.

**Response:**
```json
{
  "user_id": "user_123",
  "balance": {
    "available_balance": 5000,
    "pending_balance": 0,
    "total_balance": 5000,
    "currency": "XOF"
  },
  "transaction_summary": {
    "total": 25,
    "successful": 23,
    "failed": 2,
    "total_volume": 125000,
    "last_transaction": {
      "id": "txn_123",
      "amount": 5000,
      "status": "completed",
      "created_at": "2024-01-01T10:30:00.000Z"
    }
  },
  "ledger_summary": {
    "total_entries": 50,
    "total_volume": 150000,
    "last_entry": {
      "id": "ledger_123",
      "type": "payment",
      "amount": 5000,
      "created_at": "2024-01-01T10:30:00.000Z"
    }
  },
  "activity_summary": {
    "first_activity": "2023-12-01T09:00:00.000Z",
    "last_activity": "2024-01-01T10:30:00.000Z",
    "active_days": 15,
    "preferred_provider": "wave"
  }
}
```

---

## 🔧 Features

### **Manual Ledger Adjustments**
- Create positive or negative balance adjustments
- Full audit trail with admin identification
- Required reason and description for transparency
- Metadata support for additional context
- Automatic balance recalculation

### **Advanced Transaction Search**
- Multiple filter combinations
- Date range filtering
- Amount range filtering
- Provider and country filtering
- Pagination support
- Real-time results

### **Data Export**
- JSON and CSV formats
- Configurable data inclusion
- Filtered exports
- Downloadable files
- Metadata preservation

### **Bulk Operations**
- Update multiple transactions simultaneously
- Batch size limits (max 100)
- Detailed success/failure reporting
- Audit trail for bulk operations
- Error handling for individual items

### **System Monitoring**
- Real-time health metrics
- Transaction volume tracking
- User activity monitoring
- System uptime tracking
- Webhook activity monitoring

### **User Management**
- Comprehensive user summaries
- Transaction history analysis
- Balance tracking
- Activity pattern analysis
- Provider preference insights

---

## 🚀 Usage Examples

### **Customer Service Scenario**
```javascript
// Customer reports missing payment - create adjustment
const adjustment = await fetch('/admin/ledger/adjustment', {
  method: 'POST',
  headers: { 'X-API-Key': 'admin-key' },
  body: JSON.stringify({
    user_id: 'customer_123',
    amount: 2500,
    description: 'Compensation for failed payment',
    reason: 'Customer service ticket CS-12345',
    metadata: {
      ticket_id: 'CS-12345',
      agent_id: 'agent_456',
      issue_type: 'payment_failure'
    }
  })
});

// Search for customer's recent transactions
const transactions = await fetch('/admin/transactions/search?user_id=customer_123&limit=10', {
  headers: { 'X-API-Key': 'admin-key' }
});
```

### **Financial Reconciliation**
```javascript
// Export all completed transactions for reconciliation
const exportData = await fetch('/admin/transactions/export?status=completed&format=csv&start_date=2024-01-01&end_date=2024-01-31', {
  headers: { 'X-API-Key': 'admin-key' }
});

// Bulk update pending transactions
const bulkUpdate = await fetch('/admin/transactions/bulk-update', {
  method: 'POST',
  headers: { 'X-API-Key': 'admin-key' },
  body: JSON.stringify({
    transaction_ids: ['txn_1', 'txn_2', 'txn_3'],
    new_status: 'completed',
    reason: 'Reconciliation completed'
  })
});
```

### **System Monitoring**
```javascript
// Check system health
const health = await fetch('/admin/system/health', {
  headers: { 'X-API-Key': 'admin-key' }
});

// Monitor failed transactions
const failedTransactions = await fetch('/admin/transactions/search?status=failed&limit=50', {
  headers: { 'X-API-Key': 'admin-key' }
});
```

---

## 📈 Performance Considerations

### **Search Optimization**
- Indexed queries for common filters
- Pagination to handle large datasets
- Efficient date range queries
- Composite indexes for multiple filters

### **Export Limitations**
- Maximum 10,000 records per export
- CSV format for large datasets
- Streaming responses for large files
- Background processing for very large exports

### **Bulk Operations**
- Maximum 100 items per bulk operation
- Transaction batching for consistency
- Error isolation (one failure doesn't stop others)
- Progress tracking for large operations

---

## 🔒 Security

### **Authentication**
- All endpoints require API key authentication
- Admin role validation (planned)
- IP whitelisting for admin endpoints (planned)
- Session management for admin users (planned)

### **Audit Trail**
- All admin actions are logged
- Admin identification in all operations
- Reason tracking for all changes
- Metadata preservation for context

### **Data Protection**
- User data isolation
- No PII exposure in exports
- Secure file downloads
- Access logging for all operations

---

## 🧪 Testing

### **Test Coverage**
- Unit tests for all admin functions
- Integration tests for endpoints
- Validation error testing
- Performance testing for bulk operations

### **Test Scripts**
- `test-admin.js` for manual endpoint testing
- Automated test suite with Jest
- Mock data for consistent testing
- Error scenario testing

---

## 🎯 Future Enhancements

### **Planned Features**
- Admin role management system
- Advanced filtering and search
- Real-time notifications
- Custom report generation
- API rate limiting for admin endpoints
- Two-factor authentication for admin operations

### **Integration Opportunities**
- Admin dashboard interface
- Email notifications for system alerts
- Slack/Teams integration for monitoring
- Third-party admin tools integration
- Mobile admin app 