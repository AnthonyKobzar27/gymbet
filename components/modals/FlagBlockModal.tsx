import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

interface FlagBlockModalProps {
  visible: boolean;
  onClose: () => void;
  onFlag: (reason: string) => void;
  onBlock: () => void;
  userHash: string;
}

export default function FlagBlockModal({
  visible,
  onClose,
  onFlag,
  onBlock,
  userHash,
}: FlagBlockModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');

  const flagReasons = [
    'Inappropriate Content',
    'Spam',
    'Harassment',
    'Violence',
    'Other',
  ];

  const handleFlag = () => {
    if (!selectedReason) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please select a reason');
      return;
    }
    triggerHaptic('medium');
    onFlag(selectedReason);
    setSelectedReason('');
    onClose();
  };

  const handleBlock = () => {
    triggerHaptic('warning');
    Alert.alert(
      'Block User',
      `Are you sure you want to block 0x${userHash.substring(0, 8)}? You won't see their content anymore.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => triggerHaptic('light') },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('medium');
            onBlock();
            onClose();
          },
        },
      ]
    );
  };

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
            <Text style={styles.title}>REPORT / BLOCK</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Flag this post:</Text>
          <View style={styles.reasonsContainer}>
            {flagReasons.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonButton,
                  selectedReason === reason && styles.reasonButtonSelected,
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedReason(reason);
                }}
              >
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.flagButton, !selectedReason && styles.flagButtonDisabled]}
            onPress={handleFlag}
            disabled={!selectedReason}
          >
            <Text style={styles.flagButtonText}>FLAG POST</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.blockButton} onPress={handleBlock}>
            <Text style={styles.blockButtonText}>BLOCK USER</Text>
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
    marginBottom: 20,
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
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 16,
  },
  reasonsContainer: {
    marginBottom: 20,
  },
  reasonButton: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  reasonButtonSelected: {
    backgroundColor: '#000',
  },
  reasonText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  reasonTextSelected: {
    color: '#FFF',
  },
  flagButton: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
    marginBottom: 16,
  },
  flagButtonDisabled: {
    opacity: 0.5,
  },
  flagButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#000',
    marginVertical: 16,
  },
  blockButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
  },
  blockButtonText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});




