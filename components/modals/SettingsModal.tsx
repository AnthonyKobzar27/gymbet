import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onUnblockUsers: () => void;
  onTermsOfService: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
  onUnblockUsers,
  onTermsOfService,
}: SettingsModalProps) {
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
            <Text style={styles.title}>SETTINGS</Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
            >
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              triggerHaptic('medium');
              onUnblockUsers();
              onClose();
            }}
          >
            <Text style={styles.optionText}>UNBLOCK USERS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              triggerHaptic('medium');
              onTermsOfService();
              onClose();
            }}
          >
            <Text style={styles.optionText}>TERMS OF SERVICE</Text>
          </TouchableOpacity>
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
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
  },
  closeButton: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
  },
  optionButton: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  optionText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

