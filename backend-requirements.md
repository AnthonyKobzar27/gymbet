# Backend Server Requirements for Stripe Integration

## Why You Need a Backend

Stripe requires a backend server because:
- Secret keys must never be exposed in client-side code
- Payment intents must be created server-side for security
- Webhooks need a server endpoint to confirm payments

## Recommended Backend Setup

### Option 1: Node.js/Express (Recommended)
```bash
mkdir snooze-backend
cd snooze-backend
npm init -y
npm install express stripe cors dotenv
```

### Option 2: Serverless (Vercel/Netlify Functions)
- Good for simple payment processing
- Easier deployment
- Lower maintenance

### Option 3: Firebase Functions
- Integrates well with mobile apps
- Built-in authentication
- Real-time database

## Required Endpoints

1. **POST /create-payment-intent**
   - Creates Stripe payment intent
   - Returns client_secret to mobile app

2. **POST /webhook**
   - Handles Stripe webhooks
   - Confirms successful payments
   - Updates user balances

3. **POST /create-withdrawal**
   - Handles withdrawal requests
   - Creates Stripe transfers/payouts

## Environment Variables Needed

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=...
```
