import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/Avatar';
import LoginModal from '@/components/modals/LoginModal';
import { getStats } from '@/lib/homepage_utils';
import { getBalance } from '@/lib/transaction_utils';
import { getUserGames } from '@/lib/game_utils';

export default function ProfileScreen() {
  const { user, signOut, loading, getUserProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string } | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  // User metrics
  const [balance, setBalance] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [sleepLogged, setSleepLogged] = useState(0);
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

  const loadUserMetrics = async (userHash: string) => {
    console.log('=== Loading user metrics ===');
    console.log('User hash:', userHash);

    // Load balance
    const userBalance = await getBalance(userHash);
    console.log('Balance:', userBalance);
    setBalance(userBalance);

    // Load stats from homepage
    const stats = await getStats(userHash);
    console.log('Stats:', stats);
    setTotalProfit(stats.profitMade);
    setSleepLogged(stats.sleepLogged);

    // Load games count
    const games = await getUserGames(userHash);
    console.log('Games played:', games.length);
    setGamesPlayed(games.length);
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
                onPress={() => setLoginModalVisible(true)}
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
          <View style={[styles.scrollWrapper, {height: Dimensions.get("window").height - 50}]}>
            <ScrollView style={styles.scrollContent}>
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
                </View>

                {/* Metrics Cards */}
                <View style={styles.metricsContainer}>

                  {/* Balance Card */}
                  <View style={styles.metricCard}>
                    <View style={styles.cardInner}>
                      <Text style={styles.metricLabel}>BALANCE</Text>
                      <Text style={styles.metricValue}>${balance.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Total Profit Card */}
                  <View style={styles.metricCard}>
                    <View style={styles.cardInner}>
                      <Text style={styles.metricLabel}>TOTAL PROFIT</Text>
                      <Text style={styles.metricValue}>${totalProfit.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Sleep Logged Card */}
                  <View style={styles.metricCard}>
                    <View style={styles.cardInner}>
                      <Text style={styles.metricLabel}>SLEEP LOGGED</Text>
                      <Text style={styles.metricValue}>{sleepLogged}h</Text>
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
                  onPress={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.signOutButtonText}>SIGN OUT</Text>
                  )}
                </TouchableOpacity>

              </View>
            </ScrollView>
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

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  scrollWrapper: {
    overflow: 'hidden'
  },
  scrollContent: {
    flexGrow: 1,
    padding: 10,
    paddingTop: 100,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
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

  // Actions
  signOutButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingVertical: 18,
    marginTop: 16,
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
});
