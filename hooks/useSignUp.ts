import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { triggerHaptic } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';

export const useSignUp = (userAge: number | null, userGender: string | null, userPhoneNumber: string | null = null) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedEULA, setAcceptedEULA] = useState(false);
  const { signUp, checkOnboardingStatus } = useAuth();

  const handleSignUp = useCallback(async () => {
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
      const cameFromOnboarding = userAge !== null || userGender !== null;
      const { error } = await signUp(email, password, username, userAge, userGender, cameFromOnboarding, userPhoneNumber, referralCode || null);
      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 300));
      await checkOnboardingStatus();

      triggerHaptic('success');
      router.replace('/(tabs)');
    } catch (err: any) {
      triggerHaptic('error');
      Alert.alert('Error', err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [email, password, username, referralCode, acceptedEULA, userAge, userGender, userPhoneNumber, signUp, checkOnboardingStatus]);

  return {
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
  };
};

