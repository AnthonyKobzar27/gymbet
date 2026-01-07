import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});
import { useFocusEffect, router } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/Avatar';
import PaymentModal from '@/components/modals/PaymentModal';
import BlockedUsersModal from '@/components/modals/BlockedUsersModal';
import SettingsModal from '@/components/modals/SettingsModal';
import TermsModal from '@/components/modals/TermsModal';
import HowToPlayModal from '@/components/modals/HowToPlayModal';
import FeedbackModal from '@/components/modals/FeedbackModal';
import { getStats } from '@/lib/homepage_utils';
import { getBalance } from '@/lib/transaction_utils';
import { getUserGames, getUserActiveGame, getGameDetails, GameWithPlayers } from '@/lib/game_utils';
import { triggerHaptic } from '@/lib/haptics';
import AppHeader from '@/components/common/AppHeader';

export default function ProfileScreen() {
  const { user, signOut, loading, getUserProfile, deleteAccount } = useAuth();
  const route = useRoute();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string; balance?: number } | null>(null);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [blockedUsersModalVisible, setBlockedUsersModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [howToPlayModalVisible, setHowToPlayModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const profile = await getUserProfile();
        setUserProfile(profile);
        if (profile?.hash) {
          await loadUserMetrics(profile.hash);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const handleHowToPlayPress = () => {
    triggerHaptic('medium');
    setHowToPlayModalVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      if (userProfile?.hash) {
        loadUserMetrics(userProfile.hash);
      }
    }, [userProfile?.hash])
  );

  const loadUserMetrics = async (userHash: string) => {
    const stats = await getStats(userHash);
    setTotalWorkouts(stats.workoutLogged);
    const games = await getUserGames(userHash);
    setGamesPlayed(games.length);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!userProfile?.hash) {
              Alert.alert('Error', 'Unable to delete account. User profile not found.');
              return;
            }
            triggerHaptic('error');
            setDeletingAccount(true);
            try {
              const result = await deleteAccount(userProfile.hash);
              if (result.error) {
                Alert.alert('Error', result.error.message || 'Failed to delete account.');
                setDeletingAccount(false);
              } else {
                Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              }
            } catch {
              Alert.alert('Error', 'An unexpected error occurred.');
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!user && !loading) {
      router.replace('/signin');
    }
  }, [user, loading]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.background}>
        <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
          <AppHeader />
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer} showsVerticalScrollIndicator>
            <View style={styles.content}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  {userProfile?.hash ? <UserAvatar hash={userProfile.hash} size={80} /> : <Text style={styles.avatarText}>...</Text>}
                </View>
                {userProfile?.hash && (
                  <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => {
                      triggerHaptic('light');
                      setSettingsModalVisible(true);
                    }}
                  >
                    <FontAwesome name="cog" size={20} color="#000" />
                  </TouchableOpacity>
                )}
                <Text style={styles.name}>{userProfile?.username || 'Loading...'}</Text>
                <Text style={styles.email}>{userProfile?.email || ''}</Text>
              </View>

              <View style={styles.metricsContainer}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>TOTAL WORKOUTS</Text>
                  <Text style={styles.metricValue}>{totalWorkouts}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>GAMES PLAYED</Text>
                  <Text style={styles.metricValue}>{gamesPlayed}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.signOutButtonText}>SIGN OUT</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteAccountButton}
                onPress={() => {
                  triggerHaptic('error');
                  handleDeleteAccount();
                }}
                disabled={deletingAccount}
              >
                {deletingAccount ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.deleteAccountButtonText}>DELETE ACCOUNT</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>

        <PaymentModal
          visible={withdrawModalVisible}
          onClose={() => {
            setWithdrawModalVisible(false);
            if (userProfile?.hash) loadUserMetrics(userProfile.hash);
          }}
          type="withdraw"
        />
        {userProfile?.hash && (
          <>
            <SettingsModal
              visible={settingsModalVisible}
              onClose={() => setSettingsModalVisible(false)}
              onUnblockUsers={() => setBlockedUsersModalVisible(true)}
              onTermsOfService={() => setTermsModalVisible(true)}
              onFeedback={() => setFeedbackModalVisible(true)}
            />
            <BlockedUsersModal visible={blockedUsersModalVisible} onClose={() => setBlockedUsersModalVisible(false)} userHash={userProfile.hash} />
            <TermsModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
            <HowToPlayModal visible={howToPlayModalVisible} onClose={() => setHowToPlayModalVisible(false)} />
            <FeedbackModal visible={feedbackModalVisible} onClose={() => setFeedbackModalVisible(false)} />
          </>
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f7f7f7',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  content: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#000',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  guestTitle: {
    fontSize: 32,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
  },
  guestSubtitle: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 1,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarText: {
    color: '#000000',
    fontSize: 24,
    fontFamily: fontFamily,
    fontWeight: '800',
  },
  name: {
    fontSize: 28,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666666',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 28,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000000',
  },
  signOutButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingVertical: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deleteAccountButton: {
    backgroundColor: '#FF4444',
    borderWidth: 3,
    borderColor: '#FF4444',
    paddingVertical: 12,
    marginBottom: 24,
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
