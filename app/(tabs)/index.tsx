import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  RefreshControl,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/modals/LoginModal';
import HomeFeed from '@/components/comps/homescreen';
import { triggerHaptic } from '@/lib/haptics';
import SwipeableTabScreen from '@/components/SwipeableTabScreen';

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const route = useRoute();
  const [refreshing, setRefreshing] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading...</Text>
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
            <View style={styles.loginPromptContainer}>
              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptTitle}>Welcome to GymBet!</Text>
                <Text style={styles.loginPromptText}>
                  Join the discipline challenge community. Bet on your goals and win rewards!
                </Text>
                <TouchableOpacity 
                  style={styles.loginPromptButton}
                  onPress={() => {
                    triggerHaptic('medium');
                    setLoginModalVisible(true);
                  }}
                >
                  <Text style={styles.loginPromptButtonText}>LOG IN / SIGN UP</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loginPrompt: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  loginPromptText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loginPromptButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  loginPromptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
