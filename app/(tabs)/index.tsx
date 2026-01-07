import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import HomeFeed from '@/components/comps/homescreen';
import OnboardingScreen from '@/components/onboarding/OnboardingScreen';
import LoadingView from '@/components/home/LoadingView';
import { useOnboarding } from '@/hooks/useOnboarding';
import { router } from 'expo-router';
import AppHeader from '@/components/common/AppHeader';

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const route = useRoute();
  const [refreshing, setRefreshing] = useState(false);
  const { showOnboarding, handleComplete } = useOnboarding();

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace('/signin');
    }
  }, [user, authLoading]);

  if (authLoading) {
    return <LoadingView />;
  }

  if (!user) {
    return null;
  }

  if (showOnboarding) {
    return (
      <View style={styles.onboardingContainer}>
        <OnboardingScreen onComplete={handleComplete} />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
        <AppHeader />
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} />}
        >
          <HomeFeed />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  onboardingContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f7f7f7',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
});
