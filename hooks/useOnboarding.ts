import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setOnboardingCompleted } from '@/lib/onboarding_utils';

export function useOnboarding() {
  const { user, onboardingCompleted, checkOnboardingStatus } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      return;
    }
    
    // Only show onboarding if explicitly false (not completed)
    // If null, it means we're still checking, so don't show onboarding yet
    if (onboardingCompleted === false) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user, onboardingCompleted]);

  const handleComplete = async () => {
    if (user) {
      await setOnboardingCompleted(user);
      await checkOnboardingStatus();
    }
    setShowOnboarding(false);
  };

  return { showOnboarding, handleComplete };
}

