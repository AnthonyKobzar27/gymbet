import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { triggerHaptic } from '@/lib/haptics';
import { submitFeedback } from '@/lib/feedback_utils';
import { useAuth } from '@/contexts/AuthContext';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { getUserProfile } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }

    triggerHaptic('medium');
    setSubmitting(true);

    try {
      const profile = await getUserProfile();
      if (!profile?.hash) {
        throw new Error('User profile not found');
      }

      const result = await submitFeedback(profile.hash, feedback.trim());
      
      if (result.ok) {
        triggerHaptic('success');
        Alert.alert('Success', 'Thank you for your feedback!', [
          { text: 'OK', onPress: () => {
            setFeedback('');
            onClose();
          }}
        ]);
      } else {
        throw new Error(result.error?.message || 'Failed to submit feedback');
      }
    } catch (error: any) {
      triggerHaptic('error');
      Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    triggerHaptic('light');
    setFeedback('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>FEEDBACK</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButton}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator>
              <Text style={styles.label}>
                We'd love to hear your thoughts! Share your feedback, suggestions, or report any issues.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your feedback..."
                placeholderTextColor="#999"
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                maxLength={1000}
              />

              <Text style={styles.charCount}>
                {feedback.length}/1000
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>SUBMIT FEEDBACK</Text>
              )}
            </TouchableOpacity>
          </View>
      </KeyboardAvoidingView>
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
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
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
  scrollView: {
    maxHeight: 300,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: fontFamily,
    color: '#000',
    backgroundColor: '#FAFAFA',
    minHeight: 120,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#999',
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

