import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/modals/LoginModal';
import HomeFeed from '@/components/comps/homescreen';
import OnboardingScreen from '@/components/onboarding/OnboardingScreen';
import LoginPrompt from '@/components/home/LoginPrompt';
import LoadingView from '@/components/home/LoadingView';
import SwipeableTabScreen from '@/components/SwipeableTabScreen';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const route = useRoute();
  const [refreshing, setRefreshing] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const { showOnboarding, handleComplete } = useOnboarding();

  if (authLoading) {
    return <LoadingView />;
  }

  if (showOnboarding) {
    return (
      <View style={styles.onboardingContainer}>
        <OnboardingScreen onComplete={handleComplete} />
      </View>
    );
  }

  return (
    <SwipeableTabScreen currentTab={route.name}>
      <ImageBackground 
        source={require('@/assets/images/AppBackground.jpg')} 
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
          {!user ? (
            <LoginPrompt onPress={() => setLoginModalVisible(true)} />
          ) : (
            <ScrollView
              style={styles.scrollView}
              refreshControl={<RefreshControl refreshing={refreshing} />}
            >
              <HomeFeed />
            </ScrollView>
          )}
        </SafeAreaView>
        <LoginModal 
          visible={loginModalVisible} 
          onClose={() => setLoginModalVisible(false)} 
        />
      </ImageBackground>
    </SwipeableTabScreen>
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
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
});
