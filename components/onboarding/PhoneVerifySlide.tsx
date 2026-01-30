import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Pressable, Keyboard, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

interface PhoneVerifySlideProps {
  phoneNumber: string;
  onComplete: () => void;
  onBack?: () => void;
  onResend?: () => void;
}

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

const CODE_LENGTH = 6;

export default function PhoneVerifySlide({ phoneNumber, onComplete, onBack, onResend }: PhoneVerifySlideProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  // Countdown for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleCodeChange = (text: string) => {
    // Extract only digits and limit to 6
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    
    // Distribute digits across the code array
    const newCode = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < digits.length; i++) {
      newCode[i] = digits[i];
    }
    
    setCode(newCode);
    
    // Auto-verify if all 6 digits entered
    if (digits.length === CODE_LENGTH) {
      verifyCode(digits);
    }
  };

  const verifyCode = async (fullCode: string) => {
    setIsVerifying(true);
    triggerHaptic('medium');

    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-code', {
        body: { 
          phoneNumber,
          code: fullCode,
        },
      });

      if (error) {
        console.error('Error verifying code:', error);
        Alert.alert('Error', 'Failed to verify code. Please try again.');
        setCode(['', '', '', '', '', '']);
        return;
      }

      if (data?.success) {
        triggerHaptic('success');
        onComplete();
      } else {
        triggerHaptic('error');
        Alert.alert('Invalid Code', data?.error || 'The code you entered is incorrect. Please try again.');
        setCode(['', '', '', '', '', '']);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
      setCode(['', '', '', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;

    setIsResending(true);
    triggerHaptic('light');

    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { phoneNumber },
      });

      if (error || !data?.success) {
        Alert.alert('Error', 'Failed to resend code. Please try again.');
      } else {
        Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
        setResendCountdown(30);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formatPhoneDisplay = () => {
    // Format +15551234567 to (555) 123-4567
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      const local = digits.slice(1);
      return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
    }
    return phoneNumber;
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
          <Text style={[styles.title, { fontFamily }]}>Enter verification code</Text>
          <Text style={[styles.subtitle, { fontFamily }]}>
            We sent a 6-digit code to {formatPhoneDisplay()}
          </Text>

          <Pressable
            style={styles.codeContainer}
            onPress={() => inputRef.current?.focus()}
          >
            {/* Hidden input for SMS autofill */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code.join('')}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              caretHidden
            />
            {/* Visible code boxes */}
            {code.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.codeInputWrapper,
                  digit && styles.codeInputFilled,
                ]}
              >
                <Text style={[styles.codeDigitText, { fontFamily }]}>
                  {digit}
                </Text>
              </View>
            ))}
          </Pressable>

          {isVerifying && (
            <View style={styles.verifyingContainer}>
              <ActivityIndicator color="#000" />
              <Text style={[styles.verifyingText, { fontFamily }]}>Verifying...</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.resendButton,
              (resendCountdown > 0 || isResending) && styles.resendButtonDisabled,
            ]}
            onPress={handleResend}
            disabled={resendCountdown > 0 || isResending}
          >
            <Text style={[styles.resendText, { fontFamily }]}>
              {isResending
                ? 'Sending...'
                : resendCountdown > 0
                ? `Resend code in ${resendCountdown}s`
                : 'Resend code'}
            </Text>
          </TouchableOpacity>
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
    paddingBottom: 80,
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
  codeContainer: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  codeInputWrapper: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#CCC',
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeDigitText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#CCC',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#FFF',
    color: '#000',
    overflow: 'hidden',
  },
  codeInputFilled: {
    borderColor: '#000',
    backgroundColor: '#F5F5F5',
  },
  verifyingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  verifyingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  resendButton: {
    alignItems: 'center',
    padding: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textDecorationLine: 'underline',
  },
});
