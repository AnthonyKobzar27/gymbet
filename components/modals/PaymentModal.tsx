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
import { createCheckoutSession, requestWithdrawal } from '../../lib/stripe_utils';
import { getBalance } from '../../lib/transaction_utils';
import { useAuth } from '../../contexts/AuthContext';
import { triggerHaptic } from '@/lib/haptics';

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

  const calculateFees = (depositAmount: number) => {
    const stripeFee = (depositAmount * 0.029) + 0.30;
    const platformFee = 0.10;
    const total = depositAmount + stripeFee + platformFee;
    return { stripeFee, platformFee, total };
  };

  const paymentAmount = parseFloat(amount) || 0;
  const fees = type === 'deposit' ? calculateFees(paymentAmount) : null;

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
      triggerHaptic('error');
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!userHash) {
      triggerHaptic('error');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (type === 'withdraw' && paymentAmount > balance) {
      triggerHaptic('error');
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (type === 'deposit' && fees) {
      if (fees.total < 0.50) {
        triggerHaptic('error');
        Alert.alert('Error', `Total charge must be at least $0.50 (Stripe requirement)\n\nYour total: $${fees.total.toFixed(2)}`);
        return;
      }
    }

    triggerHaptic('medium');
    setLoading(true);

    try {
      if (type === 'deposit') {
        const sessionUrl = await createCheckoutSession(paymentAmount, userHash);
        const result = await WebBrowser.openBrowserAsync(sessionUrl);
        if (result.type === 'cancel' || result.type === 'dismiss') {
          Alert.alert('Cancelled', 'Payment was cancelled');
        } else {
          Alert.alert(
            'Payment Processing',
            'Your payment is being processed. Your balance will update shortly.'
          );
          setAmount('');
          onClose();
          setTimeout(() => {
            if (userHash) loadBalance(userHash);
          }, 2000);
        }
      } else {
        const result = await requestWithdrawal(paymentAmount, userHash);

        if (!result.ok) {
          throw new Error(result.error || 'Withdrawal failed');
        }

        Alert.alert(
          'Withdrawal Requested',
          `Your withdrawal of $${paymentAmount.toFixed(2)} has been requested.\n\nFunds will be processed within 1-3 business days.`,
          [{ text: 'OK', onPress: () => {
            setAmount('');
            loadBalance(userHash);
            onClose();
          }}]
        );
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = type === 'deposit' ? [10, 25, 50, 100] : [0.50, 1, 5, 10];

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
            <TouchableOpacity onPress={() => {
              triggerHaptic('light');
              onClose();
            }}>
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
                onPress={() => {
                  triggerHaptic('light');
                  setAmount(quickAmount.toString());
                }}
                disabled={loading}
              >
                <Text style={styles.quickAmountText}>${quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {type === 'deposit' && paymentAmount > 0 && fees && (
            <View style={styles.feeBreakdown}>
              <Text style={styles.feeTitle}>Fee Breakdown:</Text>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Account Credit:</Text>
                <Text style={styles.feeValue}>${paymentAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Processing Fee:</Text>
                <Text style={styles.feeValue}>${fees.stripeFee.toFixed(2)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Platform Fee:</Text>
                <Text style={styles.feeValue}>${fees.platformFee.toFixed(2)}</Text>
              </View>
              <View style={[styles.feeRow, styles.feeTotal]}>
                <Text style={styles.feeTotalLabel}>Total Charge:</Text>
                <Text style={styles.feeTotalValue}>${fees.total.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {type === 'deposit' && (
            <Text style={styles.disclaimer}>
              You&apos;ll be redirected to secure Stripe checkout
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
  feeBreakdown: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  feeTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    marginBottom: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feeLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  feeValue: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  feeTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  feeTotalLabel: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
  },
  feeTotalValue: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
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
