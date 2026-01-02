import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setOnboardingCompleted } from '@/lib/onboarding_utils';

export function useOnboarding() {
  const { user, onboardingCompleted, checkOnboardingStatus } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowOnboarding(true);
    } else {
      if (onboardingCompleted === false || onboardingCompleted === null) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
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

