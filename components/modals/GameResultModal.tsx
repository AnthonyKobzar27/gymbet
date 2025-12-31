import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { triggerHaptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

interface GameResultModalProps {
  visible: boolean;
  type: 'win' | 'loss';
  amount: number;
  message: string;
  userHash: string;
  onClose: () => void;
}

export default function GameResultModal({
  visible,
  type,
  amount,
  message,
  userHash,
  onClose,
}: GameResultModalProps) {
  const handleClose = async () => {
    triggerHaptic('light');
    
    // Delete the login modal entry from database
    await supabase
      .from('login_modals')
      .delete()
      .eq('user_hash', userHash);
    
    onClose();
  };

  const isWin = type === 'win';
  const backgroundColor = isWin ? '#10B981' : '#EF4444';
  const icon = isWin ? '🎉' : '😔';
  const title = isWin ? 'You Won!' : 'Game Over';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { borderColor: backgroundColor }]}>
          <View style={[styles.header, { backgroundColor }]}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>
            
            {isWin && amount > 0 && (
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Profit:</Text>
                <Text style={styles.amount}>${amount.toFixed(2)}</Text>
              </View>
            )}
            
            {!isWin && amount > 0 && (
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Lost:</Text>
                <Text style={[styles.amount, { color: '#EF4444' }]}>
                  ${amount.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor }]}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  message: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  amountLabel: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  closeButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});



