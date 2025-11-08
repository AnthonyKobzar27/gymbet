import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Linking
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { createCheckoutSession, addTransaction } from '../../lib/stripe_utils';
import { getBalance, deposit, withdraw } from '../../lib/transaction_utils';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
}

export default function PaymentModal({ visible, onClose, type }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const { getUserProfile } = useAuth();
  const [userHash, setUserHash] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadUserHash();
    }
  }, [visible]);

  const loadUserHash = async () => {
    const profile = await getUserProfile();
    if (profile?.hash) {
      setUserHash(profile.hash);
      loadBalance(profile.hash);
    }
  };

  const loadBalance = async (hash: string) => {
    const currentBalance = await getBalance(hash);
    setBalance(currentBalance);
  };

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!userHash) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (type === 'withdraw' && paymentAmount > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (type === 'deposit' && paymentAmount < 5) {
      Alert.alert('Error', 'Minimum deposit is $5');
      return;
    }

    setLoading(true);

    try {
      if (type === 'deposit') {
        // Create Stripe Checkout Session
        const sessionUrl = await createCheckoutSession(paymentAmount, userHash);

        // Open Stripe Checkout in browser
        const result = await WebBrowser.openBrowserAsync(sessionUrl);

        // Note: The actual payment confirmation will happen via webhook
        // For now, we'll just close the modal and let the user know
        if (result.type === 'cancel' || result.type === 'dismiss') {
          Alert.alert('Cancelled', 'Payment was cancelled');
        } else {
          Alert.alert(
            'Payment Processing',
            'Your payment is being processed. Your balance will update shortly.'
          );
          setAmount('');
          onClose();
          // Reload balance after a short delay
          setTimeout(() => {
            if (userHash) loadBalance(userHash);
          }, 2000);
        }
      } else {
        // Handle withdrawal (same as before)
        const result = await withdraw(userHash, paymentAmount);

        if (!result.ok) {
          throw new Error(result.error?.message || 'Withdrawal failed');
        }

        await addTransaction({
          type: 'withdrawal',
          amount: -paymentAmount,
          description: `Withdrew $${paymentAmount.toFixed(2)}`,
          userHash: userHash
        });

        Alert.alert('Success', `$${paymentAmount.toFixed(2)} withdrawal requested. Funds will be available in 1-3 business days.`);
        setAmount('');
        loadBalance(userHash);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = type === 'deposit' ? [10, 25, 50, 100] : [5, 10, 25, 50];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>
              {type === 'deposit' ? 'DEPOSIT FUNDS' : 'WITHDRAW FUNDS'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalTitle}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceText}>Current Balance: ${balance.toFixed(2)}</Text>

          <View style={styles.amountInput}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.quickAmounts}>
            {quickAmounts.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => setAmount(quickAmount.toString())}
                disabled={loading}
              >
                <Text style={styles.quickAmountText}>${quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {type === 'deposit' && (
            <Text style={styles.disclaimer}>
              You'll be redirected to secure Stripe checkout
            </Text>
          )}

          {type === 'withdraw' && (
            <Text style={styles.disclaimer}>
              ⏱️ Withdrawals typically process within 1-3 business days to your bank account.
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.paymentButton,
              loading && styles.disabledButton
            ]}
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.paymentButtonText}>
                {type === 'deposit' ? 'OPEN STRIPE CHECKOUT' : 'REQUEST WITHDRAWAL'}
              </Text>
            )}
          </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.79)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 320,
    padding: 24,
    borderRadius: 0,
    borderWidth: 4,
    borderColor: '#000000',
    backgroundColor: "#fdcff3",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
    color: "#000",
  },
  balanceText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000",
    marginBottom: 16,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    width: '100%',
  },
  dollarSign: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  quickAmountButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  quickAmountText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  paymentButton: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  paymentButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 16,
    letterSpacing: 1,
  },
});
