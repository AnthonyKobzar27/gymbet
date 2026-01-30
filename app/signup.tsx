import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import SignUpLanding from '@/components/auth/SignUpLanding';
import SignUpForm from '@/components/auth/SignUpForm';
import TermsModal from '@/components/modals/TermsModal';
import CommunityGuidelinesModal from '@/components/modals/CommunityGuidelinesModal';
import { useSignUp } from '@/hooks/useSignUp';

export default function SignUpScreen() {
  const params = useLocalSearchParams();
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [guidelinesModalVisible, setGuidelinesModalVisible] = useState(false);

  const userAge = params.age ? Number(params.age) : null;
  const userGender = params.gender ? String(params.gender) : null;
  const userPhoneNumber = params.phoneNumber ? String(params.phoneNumber) : null;
  const cameFromOnboarding = userAge !== null || userGender !== null;

  const {
    email,
    password,
    username,
    referralCode,
    loading,
    acceptedEULA,
    setEmail,
    setPassword,
    setUsername,
    setReferralCode,
    setAcceptedEULA,
    handleSignUp,
  } = useSignUp(userAge, userGender, userPhoneNumber);

  if (!cameFromOnboarding) {
    return (
      <SafeAreaView style={styles.container}>
        <SignUpLanding />
      </SafeAreaView>
    );
  }

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
          <SignUpForm
            email={email}
            password={password}
            username={username}
            referralCode={referralCode}
            acceptedEULA={acceptedEULA}
            loading={loading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onUsernameChange={setUsername}
            onReferralCodeChange={setReferralCode}
            onEULAToggle={() => setAcceptedEULA(!acceptedEULA)}
            onSubmit={handleSignUp}
            onTermsPress={() => setTermsModalVisible(true)}
            onGuidelinesPress={() => setGuidelinesModalVisible(true)}
          />
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
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
});

