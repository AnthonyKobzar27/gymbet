import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { triggerHaptic } from '@/lib/haptics';
import { getBlockedUsers, unblockUser } from '@/lib/flagging_utils';
import { UserAvatar } from '@/components/Avatar';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.8;

interface BlockedUsersModalProps {
  visible: boolean;
  onClose: () => void;
  userHash: string;
}

interface BlockedUser {
  hash: string;
}

export default function BlockedUsersModal({
  visible,
  onClose,
  userHash,
}: BlockedUsersModalProps) {
  const [blockedHashes, setBlockedHashes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userHash) {
      loadBlockedUsers();
    }
  }, [visible, userHash]);

  const loadBlockedUsers = async () => {
    if (!userHash) return;
    setLoading(true);
    try {
      const blocked = await getBlockedUsers(userHash);
      setBlockedHashes(blocked);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedHash: string) => {
    triggerHaptic('warning');
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock 0x${blockedHash.substring(0, 8)}? You will start seeing their content again.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => triggerHaptic('light') },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            triggerHaptic('medium');
            setUnblocking(blockedHash);
            try {
              const result = await unblockUser(userHash, blockedHash);
              if (result.ok) {
                triggerHaptic('success');
                await loadBlockedUsers();
                Alert.alert('Success', 'User has been unblocked.');
              } else {
                triggerHaptic('error');
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
              }
            } catch (error) {
              triggerHaptic('error');
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { height: MODAL_HEIGHT }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>BLOCKED USERS</Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic?.('light');
                onClose();
              }}
            >
              <Text style={styles.close}>X</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : blockedHashes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blocked users</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
            >
              {blockedHashes.map((hash) => (
                <View key={hash} style={styles.blockedUserItem}>
                  <View style={styles.userInfo}>
                    <UserAvatar hash={hash} size={40} />
                    <Text style={styles.userHash}>
                      0x{hash.substring(0, 8)}...
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.unblockButton,
                      unblocking === hash && styles.unblockButtonDisabled,
                    ]}
                    onPress={() => handleUnblock(hash)}
                    disabled={unblocking === hash}
                  >
                    {unblocking === hash ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.unblockButtonText}>UNBLOCK</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.79)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 320,
    backgroundColor: '#fff',
    padding: 24,
    borderWidth: 4,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    borderRadius: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  close: {
    fontSize: 18,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  blockedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userHash: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  unblockButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  unblockButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
    letterSpacing: 0.5,
  },
});




