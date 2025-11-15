import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { GameLog } from '@/lib/game_utils';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  userHash: string;
  logs: GameLog[];
  onSendMessage: (message: string) => Promise<void>;
}

export default function ChatModal({
  visible,
  onClose,
  gameId,
  userHash,
  logs,
  onSendMessage,
}: ChatModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const chatMessages = logs.filter(log => log.event_type === 'chat');

  useEffect(() => {
    if (visible && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, chatMessages.length]);

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      await onSendMessage(message);
      setMessage('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>GAME CHAT</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {chatMessages.length === 0 ? (
                <Text style={styles.emptyText}>
                  No messages yet. Start the conversation!
                </Text>
              ) : (
                chatMessages.map((log) => {
                  const isOwnMessage = log.user_hash === userHash;
                  return (
                    <View
                      key={log.id}
                      style={[
                        styles.messageItem,
                        isOwnMessage && styles.ownMessage,
                      ]}
                    >
                      <View style={styles.messageHeader}>
                        <Text style={[
                          styles.messageUser,
                          isOwnMessage && styles.ownMessageText
                        ]}>
                          {isOwnMessage ? 'You' : `0x${log.user_hash?.substring(0, 8)}`}
                        </Text>
                        <Text style={[
                          styles.messageTime,
                          isOwnMessage && styles.ownMessageText
                        ]}>
                          {formatTime(log.created_at)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.messageText,
                        isOwnMessage && styles.ownMessageText
                      ]}>{log.message}</Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                editable={!sending}
              />
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sending || !message.trim()}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.sendButtonText}>SEND</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 4,
    borderBottomWidth: 0,
    borderColor: '#000',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#000',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 40,
  },
  messageItem: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#000',
    padding: 12,
    marginBottom: 12,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  ownMessage: {
    backgroundColor: '#000',
    alignSelf: 'flex-end',
  },
  ownMessageText: {
    color: '#FFF',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  messageUser: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#666',
  },
  messageTime: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: '#000',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
    borderColor: '#999',
  },
  sendButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
