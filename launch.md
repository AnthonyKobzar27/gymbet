 Great! Let me give you the exact steps to launch your app. I'll keep it simple and
  actionable:

  🚀 LAUNCH CHECKLIST - Do These in Order

  STEP 1: Get Production Stripe Keys (5 minutes)

  1. Go to https://dashboard.stripe.com
  2. Toggle to LIVE mode (switch in top right corner)
  3. Go to Developers → API Keys
  4. Copy your Publishable key (starts with pk_live_)
  5. Update your .env file:

  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE

  6. Copy your Secret key (starts with sk_live_)
  7. Go to your Supabase Dashboard → Project Settings → Edge Functions → Secrets
  8. Add new secret:
    - Name: STRIPE_SECRET_KEY
    - Value: sk_live_YOUR_SECRET_KEY

  STEP 2: Set Up Stripe Webhook (5 minutes)

  1. In Stripe Dashboard → Developers → Webhooks
  2. Click "Add endpoint"
  3. Endpoint URL: https://YOUR_SUPABASE_PROJECT_ID.supabase.co/functions/v1/stripe-webhook     
    - Get your project ID from .env (it's the part before .supabase.co)
  4. Click "Select events" → Choose: checkout.session.completed
  5. Click "Add endpoint"
  6. Copy the Signing secret (starts with whsec_)
  7. Back in Supabase Dashboard → Add another secret:
    - Name: STRIPE_WEBHOOK_SECRET
    - Value: whsec_YOUR_SIGNING_SECRET

  STEP 3: Secure Your Database (2 minutes)

  1. Go to Supabase Dashboard → SQL Editor
  2. Copy contents of database/add_game_id_to_activity_log.sql
  3. Paste and click "Run"
  4. Copy contents of database/enable_rls_security.sql
  5. Paste and click "Run"

  ✅ Your database is now protected!

  STEP 4: Deploy Your Edge Functions (3 minutes)

  # Install Supabase CLI (if not already installed)
  npm install -g supabase

  # Login to Supabase
  supabase login

  # Link your project (get project ID from your Supabase URL)
  supabase link --project-ref YOUR_PROJECT_ID

  # Deploy both functions
  supabase functions deploy create-checkout-session
  supabase functions deploy stripe-webhook

  STEP 5: Build Your App (10-20 minutes)

  # Install EAS CLI
  npm install -g eas-cli

  # Login to Expo
  eas login

  # Configure EAS (creates eas.json)
  eas build:configure

  # Build for iOS (takes 10-15 minutes)
  eas build --platform ios --profile production

  # Build for Android (takes 10-15 minutes)
  eas build --platform android --profile production

  EAS will build in the cloud and give you download links when done!

  STEP 6: Test Your Build

  Before submitting to stores, test the build:

  1. Download the iOS build to TestFlight
  2. Download the Android APK to your phone
  3. Test the complete flow:
    - Sign up
    - Deposit money (use real Stripe in test mode first)
    - Join a game
    - Submit a proof
    - Make sure everything works!

  STEP 7: Create Required Legal Pages (30 minutes)

  You MUST have these for App Store approval:

  1. Privacy Policy - What data you collect and how you use it
  2. Terms of Service - Rules for using your app
  3. Support Page - How users can get help

  Quick solution: Use https://www.termsfeed.com/ to generate these (free tier works)

  Host them somewhere (GitHub Pages, your own domain, etc.) and get URLs like:
  - https://yourdomain.com/privacy
  - https://yourdomain.com/terms
  - https://yourdomain.com/support

  STEP 8: Submit to App Store

  For Apple:

  1. Go to https://appstoreconnect.apple.com
  2. Click "My Apps" → "+" → "New App"
  3. Fill in:
    - Name: SnoozeApp
    - Bundle ID: com.snoozeapp.app
    - SKU: snoozeapp-001
  4. Upload your build (the one from Step 5)
  5. Add screenshots (use iOS Simulator or real device)
  6. Add app description (I can help write this)
  7. Add privacy policy URL
  8. Set age rating: 17+ (due to real money)
  9. Submit for review!

  For Google Play:

  1. Go to https://play.google.com/console
  2. Create new app: SnoozeApp
  3. Upload APK from Step 5
  4. Add screenshots
  5. Add description
  6. Fill out content rating questionnaire
  7. Submit for review!

  ---
  ⚠️ CRITICAL THINGS TO KNOW

  About Stripe Test vs Production

  - Test mode: Uses fake money, test cards like 4242 4242 4242 4242
  - Production mode: Real money, real cards
  - You MUST switch to production keys before launch

  About App Store Review

  Apple will test your app! Prepare:
  - Create a test account with $50 preloaded balance
  - Give them login credentials in review notes
  - Explain how PBFT voting works (they need to understand it's fair, not gambling)

  About Database Security

  The RLS scripts I gave you are ESSENTIAL. Without them:
  - Anyone could change anyone's balance
  - Anyone could delete games
  - Your app would be vulnerable to attacks

  Run those SQL scripts before launch!

  ---
  📝 QUICK REFERENCE COMMANDS

  # Build for iOS
  eas build --platform ios --profile production

  # Build for Android
  eas build --platform android --profile production

  # Deploy Edge Functions
  supabase functions deploy create-checkout-session
  supabase functions deploy stripe-webhook

  # Check build status
  eas build:list

  ---
  🎯 Fastest Path to Launch (If You're in a Hurry)

  Minimum to launch:
  1. ✅ Stripe production keys (Step 1)
  2. ✅ Stripe webhook (Step 2)
  3. ✅ Database security (Step 3)
  4. ✅ Deploy functions (Step 4)
  5. ✅ Build app (Step 5)

  Can do later (but needed for App Store approval):
  - Legal pages (Step 7)
  - App Store submission (Step 8)

  ---
  🆘 Need Help?

  Common Issues:

  "eas build failed"
  # Clear cache and try again
  npm install
  npx expo start --clear
  eas build --platform ios --clear-cache

  "Stripe payments not working"
  - Make sure you're using pk_live_ keys (not pk_test_)
  - Check webhook is configured correctly
  - Test with a real card (test cards don't work in production)

  "Permission denied in database"
  - Make sure you ran both SQL scripts from Step 3
  - Check Supabase logs for errors

  ---
  🎉 That's It!

  Follow these 8 steps and you'll have your app in the App Store!

  Want me to help with any specific step? Let me know and I'll guide you through it!

  The hardest part is already done - your app is built and works! Now it's just
  configuration and submission. You got this! 💪
                                                                                                
────────────────────────────────────────────────────────────────────────────────────────────────
>                                                                                               
────────────────────────────────────────────────────────────────────────────────────────────────
  ? for shortcuts                                                                               
                                                                                                
                                                                                                
                                                                                                
                                                                                                
