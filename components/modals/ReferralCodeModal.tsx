import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface ReferralCodeModalProps {
  visible: boolean;
  onClose: () => void;
  referralCode: string | null;
}

export default function ReferralCodeModal({
  visible,
  onClose,
  referralCode,
}: ReferralCodeModalProps) {

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>YOUR REFERRAL CODE</Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
            >
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Share your code with friends! You both get 1 token when they sign up.
          </Text>

          <View style={styles.codeContainer}>
            <Text style={styles.codeText} selectable numberOfLines={1}>{referralCode || 'Loading...'}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.79)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    padding: 24,
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#000',
  },
  closeButton: {
    fontSize: 18,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  description: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  codeContainer: {
    backgroundColor: '#F5F5F5',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 0,
    alignItems: 'center',
    overflow: 'hidden',
  },
  codeText: {
    fontSize: 24,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#000',
  },
});
