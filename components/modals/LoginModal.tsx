import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/lib/haptics';
import TermsModal from './TermsModal';
import CommunityGuidelinesModal from './CommunityGuidelinesModal';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LoginModal({ visible, onClose }: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedEULA, setAcceptedEULA] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [guidelinesModalVisible, setGuidelinesModalVisible] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email || !password) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !username) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!isLogin && username.length < 3) {
      triggerHaptic('error');
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      triggerHaptic('error');
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!isLogin && !acceptedEULA) {
      triggerHaptic('error');
      Alert.alert('Error', 'You must accept the Terms of Service and Community Guidelines to create an account');
      return;
    }

    triggerHaptic('medium');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          triggerHaptic('error');
          Alert.alert('Login Failed', error.message);
        } else {
          triggerHaptic('success');
          Alert.alert('Success', 'Logged in successfully!');
          onClose();
        }
      } else {
        const { error } = await signUp(email, password, username);
        if (error) {
          triggerHaptic('error');
          Alert.alert('Signup Failed', error.message);
        } else {
          triggerHaptic('success');
          Alert.alert(
            'Success', 
            'Account created successfully! Please check your email to verify your account.',
            [{ text: 'OK', onPress: onClose }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    triggerHaptic('light');
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setUsername('');
    setAcceptedEULA(false);
  };

  const handleClose = () => {
    triggerHaptic('light');
    setEmail('');
    setPassword('');
    setUsername('');
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.formContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.title}>
                {isLogin ? 'Welcome Back!' : 'Join GymBet'}
              </Text>
              <Text style={styles.subtitle}>
                {isLogin 
                  ? 'Sign in to continue your discipline journey' 
                  : 'Start betting on your discipline goals'
                }
              </Text>

              {!isLogin && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter your username"
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#666"
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              {!isLogin && (
                <View style={styles.eulaContainer}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => {
                      triggerHaptic('light');
                      setAcceptedEULA(!acceptedEULA);
                    }}
                    disabled={loading}
                  >
                    <View style={[styles.checkbox, acceptedEULA && styles.checkboxChecked]}>
                      {acceptedEULA && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.eulaText}>
                      I agree to the{' '}
                      <Text 
                        style={styles.linkText}
                        onPress={() => {
                          triggerHaptic('light');
                          setTermsModalVisible(true);
                        }}
                      >
                        Terms of Service
                      </Text>
                      {' '}and{' '}
                      <Text 
                        style={styles.linkText}
                        onPress={() => {
                          triggerHaptic('light');
                          setGuidelinesModalVisible(true);
                        }}
                      >
                        Community Guidelines
                      </Text>
                      . I understand there is zero tolerance for objectionable content or abusive users, and violations will result in immediate removal.
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[styles.authButton, loading && styles.disabledButton]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.authButtonText}>
                    {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={toggleMode}
                disabled={loading}
              >
                <Text style={styles.switchButtonText}>
                  {isLogin 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </Text>
              </TouchableOpacity>

              {isLogin && (
                <TouchableOpacity
                  style={styles.forgotButton}
                  disabled={loading}
                >
                  <Text style={styles.forgotButtonText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <TermsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />

      <CommunityGuidelinesModal
        visible={guidelinesModalVisible}
        onClose={() => setGuidelinesModalVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#000000',
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000000',
  },
  authButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  switchButton: {
    marginTop: 24,
    paddingVertical: 12,
  },
  switchButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  forgotButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  forgotButtonText: {
    color: '#666666',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  eulaContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  eulaText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    lineHeight: 16,
  },
  linkText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    textDecorationLine: 'underline',
  },
});
