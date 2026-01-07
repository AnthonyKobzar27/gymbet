import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { triggerHaptic } from '@/lib/haptics';
import { setOnboardingCompleted } from '@/lib/onboarding_utils';
import { supabase } from '@/lib/supabase';
import TermsModal from '@/components/modals/TermsModal';
import CommunityGuidelinesModal from '@/components/modals/CommunityGuidelinesModal';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

export default function SignUpScreen() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedEULA, setAcceptedEULA] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [guidelinesModalVisible, setGuidelinesModalVisible] = useState(false);
  const { signUp, checkOnboardingStatus } = useAuth();

  const userAge = params.age ? Number(params.age) : null;
  const userGender = params.gender ? String(params.gender) : null;
  const cameFromOnboarding = userAge !== null || userGender !== null;

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!acceptedEULA) {
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
      // If user has age/gender params, they came from onboarding, so mark onboarding as completed
      const cameFromOnboarding = userAge !== null || userGender !== null;
      const { error } = await signUp(email, password, username, userAge, userGender, cameFromOnboarding);
      if (error) throw error;

      // Wait a moment for the user session to be established
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refresh onboarding status
      await checkOnboardingStatus();

      triggerHaptic('success');
      // Redirect immediately without alert to avoid onboarding showing again
      router.replace('/(tabs)');
    } catch (err: any) {
      triggerHaptic('error');
      Alert.alert('Error', err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // If not coming from onboarding, show landing page
  if (!cameFromOnboarding) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.landingContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/GYMBETS.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.landingTitle}>Join Gymbet</Text>
          
          <Text style={styles.landingSubtitle}>
            Start betting on your discipline goals!
          </Text>

          <TouchableOpacity
            style={styles.onboardingButton}
            onPress={() => {
              triggerHaptic('medium');
              router.replace('/onboarding');
            }}
          >
            <Text style={styles.onboardingButtonText}>START USER ONBOARDING</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              triggerHaptic('light');
              router.replace('/signin');
            }}
          >
            <Text style={styles.switchButtonText}>
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // If coming from onboarding, show signup form
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                triggerHaptic('light');
                // Navigate back to onboarding and show questions slide
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
                  onChangeText={setUsername}
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
                  onChangeText={setEmail}
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
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={styles.eulaContainer}
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

              <TouchableOpacity
                style={[styles.authButton, loading && styles.disabledButton]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.authButtonText}>CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

      <TermsModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
      <CommunityGuidelinesModal
        visible={guidelinesModalVisible}
        onClose={() => setGuidelinesModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  backdrop: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  landingContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 40,
    marginTop: 100,
  },
  landingTitle: {
    marginTop: 100,
    fontSize: 28,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  landingSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  onboardingButton: {
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 0,
    alignItems: 'center',
    alignSelf: 'center',
  },
  onboardingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
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
  switchButton: {
    marginTop: 20,
    paddingVertical: 12,
  },
  switchButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    textAlign: 'center',
  },
});

