import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import LoadingView from '@/components/home/LoadingView';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      // Still loading auth state, wait
      return;
    }

    // Check if we're already on a sign-in/sign-up page
    const isOnAuthPage = segments[0] === 'signin' || segments[0] === 'signup' || segments[0] === 'onboarding';

    if (!user) {
      // No user - redirect to sign-in page
      if (!isOnAuthPage) {
        router.replace('/signin');
      }
    } else {
      // User exists - redirect to tabs if not already there
      if (segments[0] !== '(tabs)' && !isOnAuthPage) {
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, segments]);

  // Always show loading view - never return null
  // This prevents the black screen issue
  return <LoadingView />;
}

