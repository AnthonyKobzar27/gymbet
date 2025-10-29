# 🚀 Complete Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project
3. Choose region closest to your users
4. Set strong database password
5. Wait for project to be ready (~2 minutes)

## Step 2: Run Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Copy entire contents of `supabase-schema.sql`
3. Paste and run the SQL
4. Verify all tables were created successfully

## Step 3: Get API Keys

1. Go to **Settings > API**
2. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

## Step 4: Update Environment Variables

### React Native App (.env):
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000

# Encryption
EXPO_PUBLIC_ENCRYPTION_KEY=your-32-character-secret-key-here
```

### Python Backend (.env):
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=3000
```

## Step 5: Install Dependencies

### React Native:
```bash
cd MyAwesomeApp
npm install @supabase/supabase-js crypto-js
```

### Python Backend:
```bash
cd Snooze-backend
pip install supabase
```

## Step 6: Update Services

Replace your current stripe service with the new Supabase-integrated version:

1. Update `services/stripe.ts` to use `walletService.ts`
2. Import Supabase client in your components
3. Set up authentication flow

## Step 7: Authentication Setup

### Enable Email Auth in Supabase:
1. Go to **Authentication > Settings**
2. Enable **Email** provider
3. Set **Site URL**: `http://localhost:8081` (for development)
4. Configure email templates (optional)

### Add Auth to Your App:
```typescript
import { supabase } from './lib/supabase';

// Sign up
const signUp = async (email: string, password: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });
};

// Sign in
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
};
```

## Step 8: Test the Integration

1. **Start your backend**: `python app.py`
2. **Start Stripe CLI**: `stripe listen --forward-to localhost:3000/webhook`
3. **Start React Native**: `npx expo start`
4. **Test user registration** and **payment flow**

## Step 9: Security Checklist

- ✅ **RLS Policies**: Enabled on all tables
- ✅ **Encrypted Data**: Stripe customer IDs encrypted
- ✅ **Service Role**: Only used in backend, never in frontend
- ✅ **Environment Variables**: All secrets in .env files
- ✅ **HTTPS**: Use HTTPS in production
- ✅ **Webhook Signatures**: Verified for all Stripe webhooks

## Step 10: Production Deployment

### Supabase:
1. Upgrade to paid plan for production features
2. Configure custom domain (optional)
3. Set up database backups
4. Monitor usage and performance

### Backend:
1. Deploy to Heroku/Railway/DigitalOcean
2. Set production environment variables
3. Update webhook URL in Stripe Dashboard
4. Enable SSL/HTTPS

### React Native:
1. Update production URLs in environment
2. Build and deploy to App Store/Play Store
3. Test with real payments (small amounts first)

## 🎯 What You Get:

### **Database Tables:**
- ✅ **profiles** - User accounts and stats
- ✅ **wallets** - Encrypted balance and payment data
- ✅ **transactions** - Complete transaction history
- ✅ **games** - Challenge/bet management
- ✅ **game_participants** - Who joined what games
- ✅ **activities** - Social activity feed
- ✅ **notifications** - Push notifications
- ✅ **achievements** - Gamification system

### **Security Features:**
- ✅ **Row Level Security** - Users only see their own data
- ✅ **Encrypted sensitive data** - Stripe IDs encrypted
- ✅ **Secure authentication** - Built-in auth system
- ✅ **API key protection** - Service role never exposed

### **Real-time Features:**
- ✅ **Live balance updates** - Instant balance sync
- ✅ **Game state changes** - Real-time game updates
- ✅ **Activity feed** - Live social updates
- ✅ **Notifications** - Instant push notifications

### **Scalability:**
- ✅ **PostgreSQL** - Handles millions of records
- ✅ **Automatic backups** - Never lose data
- ✅ **Global CDN** - Fast worldwide access
- ✅ **Auto-scaling** - Handles traffic spikes

Your discipline betting app is now production-ready with enterprise-grade database infrastructure! 🎉
