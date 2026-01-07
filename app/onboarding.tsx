import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import OnboardingScreen from '@/components/onboarding/OnboardingScreen';

export default function OnboardingPage() {
  const params = useLocalSearchParams();
  const showQuestions = params.showQuestions === 'true';

  const handleComplete = () => {
    // This will be handled by the OnboardingScreen component
    // which redirects to signup with age/gender params
  };

  return (
    <View style={styles.container}>
      <OnboardingScreen onComplete={handleComplete} initialShowQuestions={showQuestions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

