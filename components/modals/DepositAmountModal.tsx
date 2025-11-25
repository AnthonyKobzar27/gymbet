import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

interface DepositAmountModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAmount: (amount: number) => void;
}

export default function DepositAmountModal({ visible, onClose, onSelectAmount }: DepositAmountModalProps) {
  const amounts = [10, 25, 50, 100];
  const [customAmount, setCustomAmount] = useState('');

  const handleCustomAmount = () => {
    const amount = parseFloat(customAmount);

    if (!amount || isNaN(amount)) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount < 0.5) {
      triggerHaptic('error');
      Alert.alert('Error', 'Minimum deposit is $0.5');
      return;
    }

    if (amount > 100) {
      triggerHaptic('error');
      Alert.alert('Error', 'Maximum deposit is $100');
      return;
    }

    triggerHaptic('medium');
    onSelectAmount(amount);
    setCustomAmount('');
    onClose();
  };

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
            <Text style={styles.modalTitle}>SELECT DEPOSIT AMOUNT</Text>
            <TouchableOpacity onPress={() => {
              triggerHaptic('light');
              onClose();
            }}>
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Choose how much you want to deposit:</Text>

          <View style={styles.amountGrid}>
            {amounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.amountButton}
                onPress={() => {
                  triggerHaptic('medium');
                  onSelectAmount(amount);
                  onClose();
                }}
              >
                <Text style={styles.amountText}>${amount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.orText}>OR</Text>

          <Text style={styles.customLabel}>Enter custom amount:</Text>
          <View style={styles.customAmountContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.customInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="0.00"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.customButton}
              onPress={handleCustomAmount}
            >
              <Text style={styles.customButtonText}>GO</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            You&apos;ll be redirected to secure Stripe checkout
          </Text>
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
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
    color: "#000",
  },
  closeButton: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
    color: "#000",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#666",
    marginBottom: 20,
    textAlign: 'center',
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  amountButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000',
    paddingVertical: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  amountText: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  orText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  customLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    width: '100%',
  },
  dollarSign: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  customButton: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  customButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
});
