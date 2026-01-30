import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

interface PhoneInputSlideProps {
  onComplete: (phoneNumber: string) => void;
  onBack?: () => void;
}

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

export default function PhoneInputSlide({ onComplete, onBack }: PhoneInputSlideProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Format phone number as user types
  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    
    // Format as (XXX) XXX-XXXX
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    } else {
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(formatPhoneNumber(text));
  };

  const getCleanPhoneNumber = () => {
    // Return just the digits with +1 prefix for US
    const digits = phoneNumber.replace(/\D/g, '');
    return `+1${digits}`;
  };

  const isValidPhone = () => {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length === 10;
  };

  const handleSendCode = async () => {
    if (!isValidPhone()) {
      triggerHaptic('error');
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsSending(true);
    triggerHaptic('medium');

    try {
      const cleanPhone = getCleanPhoneNumber();
      
      // Call edge function to send verification code
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { phoneNumber: cleanPhone },
      });

      if (error) {
        console.error('Error sending code:', error);
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
        return;
      }

      if (data?.success) {
        onComplete(cleanPhone);
      } else {
        Alert.alert('Error', data?.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={[styles.backArrow, { fontFamily }]}>←</Text>
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          <Text style={[styles.title, { fontFamily }]}>What's your phone number?</Text>
          <Text style={[styles.subtitle, { fontFamily }]}>
            We'll send you a verification code to confirm it's really you.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.countryCode, { fontFamily }]}>+1</Text>
            <TextInput
              style={[styles.input, { fontFamily }]}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder="(555) 555-5555"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={14} // (XXX) XXX-XXXX
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              (!isValidPhone() || isSending) && styles.continueButtonDisabled,
            ]}
            onPress={handleSendCode}
            disabled={!isValidPhone() || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={[styles.continueButtonText, { fontFamily }]}>
                SEND VERIFICATION CODE
              </Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { fontFamily }]}>
            By continuing, you agree to receive SMS messages from GymBets. Standard message rates may apply.
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80, // Offset for visual centering
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    fontWeight: '400',
    color: '#999',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    backgroundColor: '#FFF',
    marginBottom: 24,
  },
  countryCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 16,
    paddingRight: 16,
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  disclaimer: {
    fontSize: 11,
    fontWeight: '400',
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
});
