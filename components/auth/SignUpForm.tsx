import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface SignUpFormProps {
  email: string;
  password: string;
  username: string;
  acceptedEULA: boolean;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onUsernameChange: (username: string) => void;
  onEULAToggle: () => void;
  onSubmit: () => void;
  onTermsPress: () => void;
  onGuidelinesPress: () => void;
}

export default function SignUpForm({
  email,
  password,
  username,
  acceptedEULA,
  loading,
  onEmailChange,
  onPasswordChange,
  onUsernameChange,
  onEULAToggle,
  onSubmit,
  onTermsPress,
  onGuidelinesPress,
}: SignUpFormProps) {
  return (
    <>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          triggerHaptic('light');
          router.push({
            pathname: '/onboarding',
            params: { showQuestions: 'true' },
          });
        }}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Join GymBet</Text>
      <Text style={styles.subtitle}>
        Start betting on your discipline goals!
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={onUsernameChange}
          placeholder="Enter your username"
          placeholderTextColor="#999"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={onEmailChange}
          placeholder="Enter your email"
          placeholderTextColor="#999"
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
          onChangeText={onPasswordChange}
          placeholder="Enter your password"
          placeholderTextColor="#999"
          secureTextEntry
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={styles.eulaContainer}
        onPress={onEULAToggle}
        disabled={loading}
      >
        <View style={[styles.checkbox, acceptedEULA && styles.checkboxChecked]}>
          {acceptedEULA && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <Text style={styles.eulaText}>
          I agree to the{' '}
          <Text style={styles.linkText} onPress={onTermsPress}>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text style={styles.linkText} onPress={onGuidelinesPress}>
            Community Guidelines
          </Text>
          . I understand there is zero tolerance for objectionable content or
          abusive users, and violations will result in immediate removal.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.authButton, loading && styles.disabledButton]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.authButtonText}>CREATE ACCOUNT</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 24,
    fontFamily: fontFamily,
    fontWeight: '400',
    color: '#000',
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
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
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#000000',
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
    borderColor: '#000',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  checkmark: {
    color: '#FFF',
    fontFamily: fontFamily,
    fontWeight: '800',
    fontSize: 14,
  },
  eulaText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '400',
    color: '#666',
    lineHeight: 18,
  },
  linkText: {
    fontFamily: fontFamily,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  authButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

