import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/Avatar';
import LoginModal from '@/components/modals/LoginModal';
import PaymentModal from '@/components/modals/PaymentModal';
import BlockedUsersModal from '@/components/modals/BlockedUsersModal';
import SettingsModal from '@/components/modals/SettingsModal';
import TermsModal from '@/components/modals/TermsModal';
import { getStats } from '@/lib/homepage_utils';
import { getBalance } from '@/lib/transaction_utils';
import { getUserGames, getUserActiveGame, getGameDetails, GameWithPlayers } from '@/lib/game_utils';
import { triggerHaptic } from '@/lib/haptics';

export default function ProfileScreen() {
  const { user, signOut, loading, getUserProfile, deleteAccount } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string } | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [blockedUsersModalVisible, setBlockedUsersModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const [balance, setBalance] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  const [activeGame, setActiveGame] = useState<GameWithPlayers | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      if (userProfile?.hash) {
        loadUserMetrics(userProfile.hash);
      }
    }, [userProfile?.hash])
  );

  const loadUserMetrics = async (userHash: string) => {
    console.log('=== Loading user metrics ===');
    console.log('User hash:', userHash);

    const userBalance = await getBalance(userHash);
    setBalance(userBalance);

    const stats = await getStats(userHash);
    console.log('Stats:', stats);
    setTotalProfit(stats.profitMade);
    setTotalWorkouts(stats.workoutLogged); 

    const games = await getUserGames(userHash);
    setGamesPlayed(games.length);

    const activeGameData = await getUserActiveGame(userHash);
    if (activeGameData) {
      const gameDetails = await getGameDetails(activeGameData.id);
      setActiveGame(gameDetails);
    } else {
      setActiveGame(null);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await signOut();
            setSigningOut(false);
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
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
                Alert.alert(
                  'Error',
                  result.error.message || 'Failed to delete account. Please try again or contact support.'
                );
                setDeletingAccount(false);
              } else {
                Alert.alert(
                  'Account Deleted',
                  'Your account has been successfully deleted.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again or contact support.');
              setDeletingAccount(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (!user) {
    return (
      <>
        <ImageBackground
          source={require('../../assets/images/AppBackground.jpg')}
          style={styles.background}
          imageStyle={{ resizeMode: "cover" }}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.guestContainer}>
              <Text style={styles.guestTitle}>Profile</Text>
              <Text style={styles.guestSubtitle}>
                Please login to view your profile
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => {
                  triggerHaptic('medium');
                  setLoginModalVisible(true);
                }}
              >
                <Text style={styles.loginButtonText}>LOGIN</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ImageBackground>

        <LoginModal
          visible={loginModalVisible}
          onClose={() => setLoginModalVisible(false)}
        />
      </>
    );
  }

  if (loading) {
    return (
      <ImageBackground
        source={require('../../assets/images/AppBackground.jpg')}
        style={styles.background}
        imageStyle={{ resizeMode: "cover" }}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <>
      <ImageBackground
        source={require('../../assets/images/AppBackground.jpg')}
        style={styles.background}
        imageStyle={{ resizeMode: "cover" }}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.content}>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  <View style={styles.avatar}>
                    {userProfile?.hash ? (
                      <UserAvatar hash={userProfile.hash} size={80} />
                    ) : (
                      <Text style={styles.avatarText}>...</Text>
                    )}
                  </View>
                  <Text style={styles.name}>
                    {userProfile?.username || 'Loading...'}
                  </Text>
                  <Text style={styles.email}>{userProfile?.email || ''}</Text>
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
                </View>

                {/* Metrics Cards */}
                <View style={styles.metricsContainer}>
                  {/* Total Workouts Card */}
                  <View style={styles.metricCard}>
                    <View style={styles.cardInner}>
                      <Text style={styles.metricLabel}>TOTAL WORKOUTS</Text>
                      <Text style={styles.metricValue}>{totalWorkouts}</Text>
                    </View>
                  </View>

                  {/* Games Played Card */}
                  <View style={styles.metricCard}>
                    <View style={styles.cardInner}>
                      <Text style={styles.metricLabel}>GAMES PLAYED</Text>
                      <Text style={styles.metricValue}>{gamesPlayed}</Text>
                    </View>
                  </View>
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                  style={styles.signOutButton}
                  onPress={() => {
                    triggerHaptic('warning');
                    handleSignOut();
                  }}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.signOutButtonText}>SIGN OUT</Text>
                  )}
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity
                  style={styles.deleteAccountButton}
                  onPress={() => {
                    triggerHaptic('error');
                    handleDeleteAccount();
                  }}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.deleteAccountButtonText}>DELETE ACCOUNT</Text>
                  )}
                </TouchableOpacity>

            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>

      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
      />

      <PaymentModal
        visible={withdrawModalVisible}
        onClose={() => {
          setWithdrawModalVisible(false);
          if (userProfile?.hash) {
            loadUserMetrics(userProfile.hash);
          }
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
          />
          <BlockedUsersModal
            visible={blockedUsersModalVisible}
            onClose={() => setBlockedUsersModalVisible(false)}
            userHash={userProfile.hash}
          />
          <TermsModal
            visible={termsModalVisible}
            onClose={() => setTermsModalVisible(false)}
          />
        </>
      )}
    </>
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
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 10,
    paddingTop: 100,
    paddingBottom: 20,
  },
  content: {
    padding: 20,
    paddingBottom: 130,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },

  // Guest View
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  guestTitle: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 16,
  },
  guestSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
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
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
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
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    overflow: 'hidden',
  },
  avatarText: {
    color: '#000000',
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
  },
  name: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
  },

  // Balance Card
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#666666',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 40,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
  },

  // Withdraw Button
  withdrawButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingVertical: 18,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },

  // Metrics
  metricsContainer: {
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  cardInner: {
    padding: 20,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#666666',
    letterSpacing: 1,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
  },

  // Activity Log
  activityLogCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 16,
  },
  logItem: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
    padding: 10,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logType: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    letterSpacing: 0.5,
  },
  logTime: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
  },
  logMessage: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },

  // Actions
  signOutButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingVertical: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },
  deleteAccountButton: {
    backgroundColor: '#FF4444',
    borderWidth: 3,
    borderColor: '#FF4444',
    paddingVertical: 12,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  deleteAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
});
