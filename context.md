# Mobys API — Project Context

## Overview
Mobys is a developer-first payments API that enables businesses and developers in Francophone West Africa to accept mobile money payments from customers via providers like **Orange Money** and **Wave**.

The goal is to create a clean, unified API for initiating and confirming mobile payments across major providers, starting with Mali, Côte d'Ivoire, and Senegal. Future versions may expand to other African countries and include additional providers like Moov and MTN.

## Target Users
- Software developers building e-commerce sites, marketplaces, SaaS apps
- Freelancers who want to accept mobile money on websites
- Small businesses offering payment links or embedded checkouts

## Core MVP Features

### 1. `POST /pay`
- Initiates a mobile money payment
- Accepts payment method (`orange_money` or `wave`), amount, currency (`XOF`), and phone number
- For Orange Money, returns a redirect URL for user to complete payment
- For Wave, sends a payment request and returns a short URL to Wave's payment page

### 2. `POST /webhook/payment` (or provider-specific webhooks)
- Endpoint to receive asynchronous confirmations from providers
- Orange Money redirects with status after user completes payment
- Wave sends a webhook to confirm payment success or failure
- Updates transaction status to `success` or `failed` in Firestore

### 3. API Key Authentication
- Each request to `/pay` requires an `Authorization: Bearer <API_KEY>` header
- Keys are stored in a Firestore collection
- API key limits can be set per user (e.g., 1000 requests/month)

## 🧾 Payment Lifecycle (Updated for Fund Holding and Payouts)

Mobys now follows a **Stripe-like architecture** where payments are first collected by Mobys, held briefly, then disbursed to the merchant's mobile wallet after confirmation.

### Lifecycle Breakdown:

1. **Payment Intent Creation (`POST /pay`)**
   - Merchant creates a payment intent via API.
   - Mobys triggers a payment request to Wave or Orange Money.

2. **Payment Authorization**
   - User receives prompt on their mobile (USSD, push, or payment URL).
   - User confirms the transaction on their device.

3. **Provider Callback / Webhook**
   - Wave or Orange Money sends a confirmation webhook.
   - Mobys verifies it and updates the transaction to `succeeded` or `failed`.

4. **Ledger Entry Creation**
   - Upon confirmation, Mobys writes a **ledger entry**:
     - Type: `payment`
     - Status: `succeeded`
     - Source wallet, destination (Mobys), amount, currency, timestamps.

5. **Merchant Balance Update**
   - The merchant's **available balance** in Mobys is updated (calculated from the ledger).

6. **Payout Request or Auto-Payout**
   - Mobys triggers a **payout** (manual or scheduled).
   - Creates a new ledger entry of type `payout` with full traceability.
   - Sends money from Mobys's Wave/Orange wallet to the merchant's mobile money wallet.

## 🧮 Ledger System

All financial operations are tracked via a structured ledger system to ensure accuracy, traceability, and auditability.

Each ledger record includes:
- `type`: `payment`, `payout`, or `refund`
- `status`: `pending`, `succeeded`, or `failed`
- `amount`, `currency`, `user_id`
- `source_wallet`, `destination_wallet`
- Timestamps and reference metadata

Balances are **never stored directly** — they're calculated by summing all ledger entries per merchant.

## Stack

- **Backend**: Node.js + Express (via Firebase Functions)
- **Database**: Firestore
- **Auth**: Custom API key middleware
- **Third-Party Providers**: Orange Money & Wave (v1)
- **Payments Testing**: Use Orange and Wave public APIs or simulate flows
- **Hosting**: Firebase Hosting + Vercel (optional)
- **Docs**: Swagger UI or Markdown-based API docs
- **Frontend**: Later phase may include hosted checkout page

## Example: Request & Response

### `POST /pay` (Wave)
```json
{
  "amount": 5000,
  "currency": "XOF",
  "method": "wave",
  "phone": "+22391234567",
  "metadata": {
    "order_id": "ORD-1234"
  }
}
```

### `POST /pay` (Orange)
```json
{
  "amount": 5000,
  "currency": "XOF",
  "method": "orange_money",
  "phone": "+22391234567",
  "metadata": {
    "order_id": "ORD-5678"
  }
}
```

### Orange Redirect Response (after payment):
```
GET /callback/orange?order_id=ORD-5678&status=SUCCESS
```

### Wave Webhook Payload:
```json
{
  "transaction_id": "txn_abc123",
  "status": "success",
  "provider": "wave",
  "amount": 5000,
  "phone": "+22391234567"
}
```

## Non-Goals for MVP
- No dashboard or UI in the MVP (just API)
- No bank integrations (mobile money only)
- No KYC or full payment processor licensing

## Future Ideas
- Add hosted checkout experience (like Stripe Checkout)
- Expand to other providers (MTN, Airtel, Moov)
- Add invoicing, recurring billing, receipts
- Partner with fintechs or launch as a SaaS for African startups

## References
- Orange Money WebPay: https://developer.orange.com/apis/om-webpay
- Wave Business API: https://docs.wave.com/business#requests
