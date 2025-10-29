# 🔧 Environment Setup for React Native App

## Create .env file in MyAwesomeApp directory:

```bash
# Stripe Configuration (get from Stripe Dashboard)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Backend Configuration
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

## For iOS Simulator / Android Emulator:
- Use `http://localhost:3000` for backend URL

## For Physical Device Testing:
- Find your computer's IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Use `http://YOUR_IP_ADDRESS:3000` for backend URL
- Example: `http://192.168.1.100:3000`

## Production:
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
EXPO_PUBLIC_BACKEND_URL=https://your-backend.herokuapp.com
```
