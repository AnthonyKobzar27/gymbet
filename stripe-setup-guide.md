# 🚀 Complete Stripe Setup Guide

## Step 1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business verification
3. Navigate to **Developers > API Keys**
4. Copy your **Publishable Key** (starts with `pk_test_`)

## Step 2: Environment Variables
Create a `.env` file in your project root:

```bash
# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here

# Backend Configuration  
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

## Step 3: Initialize Stripe in Your App
Add this to your main App component:

```javascript
import { initializeStripe } from './services/stripe';

export default function App() {
  useEffect(() => {
    initializeStripe();
  }, []);
  
  // ... rest of your app
}
```

## Step 4: Backend Server (REQUIRED)
You need a backend server. Here's a minimal Node.js setup:

### Create Backend
```bash
mkdir snooze-backend
cd snooze-backend
npm init -y
npm install express stripe cors dotenv
```

### Basic Server Code (`server.js`)
```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Create payment intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      metadata: {
        app: 'snooze-betting'
      }
    });

    res.json({ client_secret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook for payment confirmations
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log('Payment succeeded:', paymentIntent.id);
    // Update user balance in your database
  }

  res.json({received: true});
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Backend Environment Variables
```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 5: Test with Stripe Test Cards
Use these test card numbers:
- **Success**: 4242424242424242
- **Decline**: 4000000000000002
- **Requires Authentication**: 4000002500003155

## Step 6: Webhook Setup
1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `https://your-backend.com/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the webhook secret to your backend env

## Step 7: Go Live
1. Complete Stripe account verification
2. Replace test keys with live keys
3. Update webhook URL to production
4. Test with real (small) amounts first

## Security Notes
- ✅ Never put secret keys in your mobile app
- ✅ Always validate payments server-side
- ✅ Use webhooks to confirm payments
- ✅ Implement proper error handling
- ✅ Log all transactions for debugging

## Betting Flow Integration
1. User deposits money → Stripe payment → Update balance
2. User places bet → Deduct from balance (no Stripe needed)
3. Bet resolves → Distribute winnings (update balances)
4. User withdraws → Stripe payout/transfer

Your current mock functions will work perfectly for the betting logic - you only need real Stripe for deposits and withdrawals!
