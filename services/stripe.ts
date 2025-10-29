import { initStripe, confirmPayment as stripeConfirmPayment } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Stripe
export const initializeStripe = async () => {
  // TODO: Replace with your actual Stripe publishable key from Stripe Dashboard
  // For testing: pk_test_... 
  // For production: pk_live_...
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_REPLACE_WITH_YOUR_KEY';
  
  if (publishableKey === 'pk_test_REPLACE_WITH_YOUR_KEY') {
    console.warn('⚠️ Using placeholder Stripe key. Please add your real publishable key to environment variables.');
    return;
  }
  
  try {
    await initStripe({
      publishableKey,
      merchantIdentifier: 'merchant.com.snoozeapp', // TODO: Replace with your Apple merchant ID
      urlScheme: 'snoozeapp', // For handling payment redirects
    });
    console.log('✅ Stripe initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Stripe:', error);
  }
};

// User balance storage
export const BALANCE_STORAGE_KEY = 'user_balance';

export const getUserBalance = async (): Promise<number> => {
  try {
    // Try to get balance from backend first
    const response = await fetch(`${BACKEND_URL}/balance/${USER_ID}`);
    if (response.ok) {
      const data = await response.json();
      const backendBalance = data.balance || 0;
      
      // Update local storage with backend balance
      await AsyncStorage.setItem(BALANCE_STORAGE_KEY, backendBalance.toString());
      return backendBalance;
    }
  } catch (error) {
    console.warn('Could not fetch balance from backend, using local storage:', error);
  }
  
  // Fallback to local storage
  try {
    const balance = await AsyncStorage.getItem(BALANCE_STORAGE_KEY);
    return balance ? parseFloat(balance) : 0;
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
};

export const setUserBalance = async (balance: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(BALANCE_STORAGE_KEY, balance.toString());
  } catch (error) {
    console.error('Error setting balance:', error);
  }
};

export const updateUserBalance = async (amount: number): Promise<number> => {
  try {
    const currentBalance = await getUserBalance();
    const newBalance = Math.max(0, currentBalance + amount); // Prevent negative balance
    await setUserBalance(newBalance);
    return newBalance;
  } catch (error) {
    console.error('Error updating balance:', error);
    return 0;
  }
};

// Payment methods - these will call your backend API
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const USER_ID = 'user123'; // TODO: Replace with actual user authentication

export const createPaymentIntent = async (amount: number): Promise<string> => {
  console.log(`Creating payment intent for $${(amount / 100).toFixed(2)}`);
  
  try {
    // TODO: Replace this with your actual backend endpoint
    const response = await fetch(`${BACKEND_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount, // Amount in cents
        user_id: USER_ID,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { client_secret } = await response.json();
    return client_secret;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    // Fallback to mock for development (remove this in production)
    if (__DEV__) {
      console.warn('🚧 Using mock payment intent for development');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return `pi_test_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    throw error;
  }
};

export const confirmPayment = async (clientSecret: string): Promise<boolean> => {
  console.log('Confirming payment with client secret:', clientSecret);
  
  try {
    // Use real Stripe payment confirmation
    const { error, paymentIntent } = await stripeConfirmPayment(clientSecret, {
      paymentMethodType: 'Card',
      // You can add billing details here if needed
    });

    if (error) {
      console.error('Payment confirmation error:', error);
      throw new Error(error.message || 'Payment failed');
    }

    if (paymentIntent?.status === 'Succeeded') {
      console.log('✅ Payment succeeded!');
      return true;
    } else {
      console.log('Payment status:', paymentIntent?.status);
      throw new Error('Payment was not completed successfully');
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    
    // Fallback to mock for development (remove this in production)
    if (__DEV__ && clientSecret.includes('pi_test_')) {
      console.warn('🚧 Using mock payment confirmation for development');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate 95% success rate for testing
      const success = Math.random() > 0.05;
      if (!success) {
        throw new Error('Mock payment failed. Please try again.');
      }
      return true;
    }
    
    throw error;
  }
};

// Withdrawal methods
export const requestWithdrawal = async (amount: number): Promise<boolean> => {
  const currentBalance = await getUserBalance();

  if (currentBalance < amount) {
    throw new Error('Insufficient balance');
  }

  // Deduct from balance immediately (in real app, you'd hold it until processed)
  await updateUserBalance(-amount);

  // In production, this would call your backend to process the withdrawal
  console.log(`Withdrawal request for $${amount} processed`);
  return true;
};

// Bet management
export const stakeAmount = async (amount: number): Promise<boolean> => {
  const currentBalance = await getUserBalance();

  if (currentBalance < amount) {
    throw new Error(`Insufficient balance. You need $${amount} but only have $${currentBalance.toFixed(2)}`);
  }

  // Deduct stake from balance
  await updateUserBalance(-amount);

  console.log(`Staked $${amount} for bet`);
  return true;
};

export const distributeWinnings = async (winnerAddress: string, amount: number): Promise<boolean> => {
  // Credit the winner's account
  await updateUserBalance(amount);
  console.log(`Distributed $${amount} to winner: ${winnerAddress}`);
  return true;
};

// Transaction history
export const TRANSACTION_STORAGE_KEY = 'transaction_history';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'stake' | 'win' | 'loss';
  amount: number;
  timestamp: Date;
  description: string;
}

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const existingTransactions = await getTransactions();
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    existingTransactions.unshift(newTransaction);
    
    // Keep only the last 100 transactions to prevent storage bloat
    const limitedTransactions = existingTransactions.slice(0, 100);
    
    await AsyncStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(limitedTransactions));
  } catch (error) {
    console.error('Error adding transaction:', error);
  }
};

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const transactions = await AsyncStorage.getItem(TRANSACTION_STORAGE_KEY);
    if (!transactions) return [];
    
    const parsed = JSON.parse(transactions);
    // Convert timestamp strings back to Date objects
    return parsed.map((t: any) => ({
      ...t,
      timestamp: new Date(t.timestamp)
    }));
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
};

// Helper function to add test balance via backend
export const addTestBalance = async (amount: number = 50): Promise<void> => {
  try {
    const response = await fetch(`${BACKEND_URL}/add-test-balance/${USER_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Added $${amount} test balance via backend. New balance: $${data.balance}`);
      
      // Update local storage
      await setUserBalance(data.balance);
      
      // Add local transaction record
      await addTransaction({
        type: 'deposit',
        amount: amount,
        description: `Test deposit of $${amount}`
      });
    } else {
      throw new Error(`Backend error: ${response.status}`);
    }
  } catch (error) {
    console.warn('Could not add test balance via backend, using local method:', error);
    
    // Fallback to local method
    await updateUserBalance(amount);
    await addTransaction({
      type: 'deposit',
      amount: amount,
      description: `Test deposit of $${amount} (local)`
    });
    console.log(`Added $${amount} test balance (local fallback)`);
  }
};