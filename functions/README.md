# 🚀 Mobys API - Firebase Functions

## Overview
Mobys API is a comprehensive payment processing system for West African mobile money providers (Wave and Orange Money), built with Firebase Functions and TypeScript.

---

## 📚 **Documentation**

### **📖 Complete Documentation**
All comprehensive documentation is now organized in the **[docs/](./docs/)** directory:

- **[📋 Documentation Index](./docs/README.md)** - Complete documentation overview and navigation
- **[🧮 Phase 3 Complete](./docs/PHASE3_COMPLETE.md)** - Ledger system, analytics, and admin tools
- **[📊 Analytics Features](./docs/ANALYTICS_FEATURES.md)** - Comprehensive analytics system
- **[🔧 Admin Tools](./docs/ADMIN_TOOLS.md)** - Administrative operations and tools
- **[🧪 Testing Guide](./docs/TESTING_GUIDE.md)** - Complete testing procedures
- **[📈 Test Results](./docs/TEST_RESULTS.md)** - Test coverage and results
- **[🔍 Real API Testing](./docs/REAL_API_TESTING.md)** - Real API testing procedures

### **🗺️ Project Planning**
- **[ROADMAP.md](../ROADMAP.md)** - Complete development roadmap with phases
- **[DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)** - Firestore database schema
- **[SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md)** - Security requirements and status

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm
- Firebase CLI
- Firebase project with Firestore enabled

### **Installation**
```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Run tests
npm test

# Start development server
npm run serve
```

### **Environment Variables**
Copy `env.example` to `.env` and configure:
- Firebase project settings
- API keys for Wave and Orange Money
- Webhook secrets
- Database configuration

---

## 🏗️ **Project Structure**

```
functions/
├── src/                    # Source code
│   ├── index.ts           # Main entry point
│   ├── routes.ts          # API routes
│   ├── middleware.ts      # Middleware functions
│   ├── config.ts          # Configuration
│   ├── providers/         # Payment providers
│   └── utils/             # Utility functions
├── test/                  # Test files
├── docs/                  # 📚 Documentation
├── package.json           # Dependencies
└── README.md             # This file
```

---

## 🎯 **Current Status**

### **✅ Completed Phases**
- **Phase 1**: Core Infrastructure & Security Foundation (100%)
- **Phase 2**: Core Payment Functionality (100%)
- **Phase 3**: Ledger System & Financial Operations (100%)
- **Phase 7**: Testing & Quality Assurance (100%)

### **🔄 Next Phase**
- **Phase 4**: Payout System (Ready to start)

---

## 🔧 **Key Features**

### **Payment Processing**
- Wave and Orange Money integration
- Webhook handling with signature verification
- Transaction status management
- Comprehensive error handling

### **Financial Management**
- Immutable ledger system
- Real-time balance tracking
- Transaction reconciliation
- Audit trail for all operations

### **Analytics & Reporting**
- Transaction analytics with date ranges
- User performance metrics
- Provider comparison analytics
- Export functionality (JSON/CSV)

### **Admin Tools**
- Manual ledger adjustments
- Advanced transaction search
- Bulk operations
- System health monitoring

### **Security**
- API key authentication
- Rate limiting
- Webhook signature verification
- Input validation and sanitization

---

## 🧪 **Testing**

### **Test Suites**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:api

# Run with coverage
npm run test:coverage
```

### **Manual Testing**
```bash
# Test analytics endpoints
node test-analytics.js

# Test admin endpoints
node test-admin.js

# Test API endpoints
node test-api.js
```

---

## 📊 **API Endpoints**

### **Core Payment**
- `POST /pay` - Initiate payment
- `POST /webhook/payment` - Webhook processing
- `GET /health` - Health check

### **Financial Management**
- `GET /balance` - Get user balance
- `GET /ledger` - Get ledger entries
- `POST /ledger/reconcile` - Reconcile ledger
- `GET /balance/history` - Balance history

### **Analytics**
- `GET /analytics/transactions` - Transaction analytics
- `GET /analytics/ledger` - Ledger analytics
- `GET /analytics/summary` - Dashboard summary
- `GET /admin/analytics/users` - User analytics

### **Admin Tools**
- `POST /admin/ledger/adjustment` - Manual adjustments
- `GET /admin/transactions/search` - Transaction search
- `GET /admin/transactions/export` - Data export
- `GET /admin/system/health` - System health
- `POST /admin/transactions/bulk-update` - Bulk updates

---

## 🔒 **Security**

- **Authentication**: API key-based authentication
- **Rate Limiting**: Per-IP and per-API key rate limiting
- **Input Validation**: Comprehensive request validation
- **Webhook Security**: Signature verification and IP whitelisting
- **Data Protection**: User data isolation and audit logging

---

## 🚀 **Deployment**

### **Firebase Deployment**
```bash
# Deploy to Firebase
firebase deploy --only functions

# Deploy with environment variables
firebase functions:config:set env.production=true
firebase deploy --only functions
```

### **Environment Configuration**
- Production environment variables
- Firestore security rules
- Database indexes
- Webhook configurations

---

## 📞 **Support**

### **Documentation**
- Start with **[docs/README.md](./docs/README.md)** for complete documentation
- Check **[ROADMAP.md](../ROADMAP.md)** for project progress
- Review **[TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)** for testing procedures

### **Development**
- All code is documented with TypeScript interfaces
- Comprehensive test coverage
- Error handling and logging
- Performance optimization

---

## 🎯 **Contributing**

1. Follow the established code structure
2. Add tests for new features
3. Update documentation in the `docs/` directory
4. Follow security best practices
5. Maintain audit trail for all operations

---

**📚 For complete documentation, visit the [docs/](./docs/) directory!** 