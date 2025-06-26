# 📊 Analytics System Features

## Overview
The Mobys API now includes a comprehensive analytics system that provides detailed insights into transaction patterns, ledger activity, and user behavior.

---

## 🎯 Analytics Endpoints

### 1. **Transaction Analytics** - `GET /analytics/transactions`
Provides detailed transaction metrics for a specified date range.

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format (default: 30 days ago)
- `end_date` (optional): End date in YYYY-MM-DD format (default: today)

**Response:**
```json
{
  "period": {
    "start_date": "2024-01-01T00:00:00.000Z",
    "end_date": "2024-01-31T23:59:59.999Z",
    "days": 31
  },
  "analytics": {
    "total_transactions": 150,
    "total_volume": 75000,
    "successful_transactions": 142,
    "failed_transactions": 8,
    "success_rate": 94.67,
    "average_transaction_value": 500,
    "provider_breakdown": {
      "wave": { "count": 85, "volume": 42500 },
      "orange_money": { "count": 65, "volume": 32500 }
    },
    "country_breakdown": {
      "Senegal": { "count": 90, "volume": 45000 },
      "Ivory Coast": { "count": 60, "volume": 30000 }
    },
    "daily_breakdown": [
      {
        "date": "2024-01-01",
        "transactions": 5,
        "volume": 2500,
        "success_rate": 100
      }
    ]
  }
}
```

### 2. **Ledger Analytics** - `GET /analytics/ledger`
Provides detailed ledger entry metrics and balance changes.

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format (default: 30 days ago)
- `end_date` (optional): End date in YYYY-MM-DD format (default: today)

**Response:**
```json
{
  "period": {
    "start_date": "2024-01-01T00:00:00.000Z",
    "end_date": "2024-01-31T23:59:59.999Z",
    "days": 31
  },
  "analytics": {
    "total_entries": 300,
    "total_volume": 150000,
    "entry_type_breakdown": {
      "payment": { "count": 150, "volume": 75000 },
      "payout": { "count": 50, "volume": 25000 },
      "fee": { "count": 75, "volume": 3750 },
      "refund": { "count": 15, "volume": 7500 },
      "adjustment": { "count": 10, "volume": 5000 }
    },
    "balance_changes": {
      "total_inflows": 87500,
      "total_outflows": 33750,
      "net_change": 53750
    },
    "daily_breakdown": [
      {
        "date": "2024-01-01",
        "entries": 10,
        "volume": 5000,
        "net_change": 2500
      }
    ]
  }
}
```

### 3. **Analytics Summary** - `GET /analytics/summary`
Provides a quick overview of key metrics for dashboard display.

**Response:**
```json
{
  "total_users": 25,
  "total_transactions": 150,
  "total_volume": 75000,
  "today_transactions": 5,
  "today_volume": 2500,
  "success_rate": 94.67,
  "top_provider": "Wave",
  "top_country": "Senegal"
}
```

### 4. **User Analytics** - `GET /admin/analytics/users`
Provides analytics for top users by volume/activity (admin endpoint).

**Query Parameters:**
- `limit` (optional): Number of users to return (default: 10, max: 50)

**Response:**
```json
{
  "users": [
    {
      "user_id": "user_123",
      "total_transactions": 25,
      "total_volume": 12500,
      "current_balance": 5000,
      "success_rate": 96.0,
      "preferred_provider": "wave",
      "active_days": 15,
      "last_activity": "2024-01-31T10:30:00.000Z",
      "country": "Senegal"
    }
  ],
  "total": 10,
  "limit": 10
}
```

---

## 🔧 Features

### **Date Range Support**
- Custom date ranges with validation
- Maximum range of 365 days for performance
- Automatic default to last 30 days
- ISO date format support (YYYY-MM-DD)

### **Provider Breakdown**
- Wave vs Orange Money comparison
- Transaction count and volume by provider
- Success rates by provider

### **Country Analytics**
- Transaction patterns by country
- Volume distribution across West African countries
- Country-specific success rates

### **Daily Breakdowns**
- Day-by-day transaction/ledger activity
- Trend analysis capabilities
- Success rate tracking over time

### **Balance Tracking**
- Net balance changes over time
- Inflow vs outflow analysis
- Fee impact tracking

### **User Insights**
- Top users by transaction volume
- User activity patterns
- Preferred payment methods per user
- Success rates by user

---

## 🚀 Usage Examples

### **Dashboard Integration**
```javascript
// Get summary for dashboard
const summary = await fetch('/analytics/summary', {
  headers: { 'X-API-Key': 'your-api-key' }
});

// Display key metrics
console.log(`Total Volume: ${summary.total_volume} XOF`);
console.log(`Success Rate: ${summary.success_rate}%`);
```

### **Custom Date Analysis**
```javascript
// Analyze last week's performance
const analytics = await fetch('/analytics/transactions?start_date=2024-01-22&end_date=2024-01-28', {
  headers: { 'X-API-Key': 'your-api-key' }
});

// Compare providers
const waveVolume = analytics.provider_breakdown.wave.volume;
const orangeVolume = analytics.provider_breakdown.orange_money.volume;
```

### **User Performance Tracking**
```javascript
// Get top 5 users
const users = await fetch('/admin/analytics/users?limit=5', {
  headers: { 'X-API-Key': 'your-api-key' }
});

// Identify high-value users
const topUser = users.users[0];
console.log(`Top user: ${topUser.user_id} with ${topUser.total_volume} XOF volume`);
```

---

## 📈 Performance Considerations

### **Optimization Features**
- Date range limits (max 365 days)
- Efficient Firestore queries
- Cached balance calculations
- Pagination for large datasets

### **Rate Limiting**
- Analytics endpoints respect API rate limits
- Separate rate limits for admin endpoints
- Request validation and sanitization

### **Data Accuracy**
- Real-time data from Firestore
- Immutable ledger entries
- Transaction status tracking
- Audit trail for all changes

---

## 🔒 Security

### **Authentication**
- All endpoints require API key authentication
- User-specific data isolation
- Admin endpoints for system-wide analytics

### **Data Privacy**
- User data anonymization in aggregate reports
- No PII exposure in analytics
- Secure data transmission

---

## 🧪 Testing

### **Test Coverage**
- Unit tests for all analytics functions
- Integration tests for endpoints
- Date range validation tests
- Performance tests for large datasets

### **Test Scripts**
- `test-analytics.js` for manual endpoint testing
- Automated test suite with Jest
- Mock data for consistent testing

---

## 🎯 Future Enhancements

### **Planned Features**
- Real-time analytics with WebSocket updates
- Advanced filtering and search
- Export functionality (CSV/JSON)
- Custom report generation
- Predictive analytics
- Fraud detection patterns

### **Integration Opportunities**
- Dashboard widgets
- Email reports
- Mobile app analytics
- Third-party BI tools 