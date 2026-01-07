import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/lib/haptics';
import { setOnboardingCompleted } from '@/lib/onboarding_utils';
import { supabase } from '@/lib/supabase';
import TermsModal from './TermsModal';
import CommunityGuidelinesModal from './CommunityGuidelinesModal';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSignUpSuccess?: () => void;
  defaultMode?: 'login' | 'signup';
  userAge?: number | null;
  userGender?: string | null;
}

export default function LoginModal({
  visible,
  onClose,
  onSignUpSuccess,
  defaultMode = 'login',
  userAge = null,
  userGender = null,
}: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedEULA, setAcceptedEULA] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [guidelinesModalVisible, setGuidelinesModalVisible] = useState(false);

  const { signIn, signUp, checkOnboardingStatus } = useAuth();

  useEffect(() => {
    if (visible) {
      setIsLogin(defaultMode === 'login');
      setEmail('');
      setPassword('');
      setUsername('');
      setAcceptedEULA(false);
    } else {
      // Dismiss keyboard when modal closes
      Keyboard.dismiss();
    }
  }, [visible, defaultMode]);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !username)) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !acceptedEULA) {
      triggerHaptic('error');
      Alert.alert(
        'Error',
        'You must accept the Terms of Service and Community Guidelines to create an account'
      );
      return;
    }

    triggerHaptic('medium');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;

        await checkOnboardingStatus();
        triggerHaptic('success');
        Alert.alert('Success', 'Logged in successfully!');
        onClose();
      } else {
        const { error } = await signUp(email, password, username, userAge, userGender);
        if (error) throw error;

        setTimeout(async () => {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            await setOnboardingCompleted(data.user);
            await checkOnboardingStatus();
            onSignUpSuccess?.();
          }
        }, 500);

        triggerHaptic('success');
        Alert.alert(
          'Success',
          'Account created successfully! Please check your email to verify your account.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (err: any) {
      triggerHaptic('error');
      Alert.alert('Error', err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centered}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.card}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={styles.closeButtonText}>←</Text>
                </TouchableOpacity>

                <Text style={styles.title}>
                  {isLogin ? 'Welcome Back!' : 'Join GymBet'}
                </Text>

                <Text style={styles.subtitle}>
                  {isLogin
                    ? 'Sign in to continue your discipline journey'
                    : 'Start betting on your discipline goals!'}
                </Text>

                {!isLogin && (
                  <Input
                    label="Username"
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter your username"
                  />
                )}

                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter your email"
                />

                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Enter your password"
                />

                {!isLogin && (
                  <TouchableOpacity
                    style={styles.eulaContainer}
                    onPress={() => {
                      triggerHaptic('light');
                      setAcceptedEULA(!acceptedEULA);
                    }}
                  >
                    <View style={[styles.checkbox, acceptedEULA && styles.checkboxChecked]}>
                      {acceptedEULA && <Text style={styles.checkmark}>✓</Text>}
                    </View>

                    <Text style={styles.eulaText}>
                      I agree to the{' '}
                      <Text style={styles.linkText} onPress={() => setTermsModalVisible(true)}>
                        Terms of Service
                      </Text>{' '}
                      and{' '}
                      <Text
                        style={styles.linkText}
                        onPress={() => setGuidelinesModalVisible(true)}
                      >
                        Community Guidelines
                      </Text>
                      . I understand there is zero tolerance for objectionable content or
                      abusive users, and violations will result in immediate removal.
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.authButton, loading && styles.disabled]}
                  onPress={handleAuth}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.authButtonText}>
                      {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                  <Text style={styles.switchText}>
                    {isLogin
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Sign in'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>

      <TermsModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
      <CommunityGuidelinesModal
        visible={guidelinesModalVisible}
        onClose={() => setGuidelinesModalVisible(false)}
      />
    </Modal>
  );
}

function Input(props: any) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        placeholder={props.placeholder}
        placeholderTextColor="#666"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  card: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 28,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#999',
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  authButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.6,
  },
  switchText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#666',
  },
  eulaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  checkmark: {
    color: '#fff',
    fontWeight: '800',
  },
  eulaText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  linkText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
