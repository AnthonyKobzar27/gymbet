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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/Avatar';

export default function ProfileScreen() {
  const { user, signOut, loading, getUserProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string } | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const profile = await getUserProfile();
        setUserProfile(profile);
      }
    };

    fetchUserProfile();
  }, [user, getUserProfile]);

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


  const getWinRate = () => {
    return 0;
  };

  if (!user) {
    return (
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
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.loginButtonText}>LOGIN</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/AppBackground.jpg')}
      style={styles.background}
      imageStyle={{ resizeMode: "cover" }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                {userProfile?.hash ? (
                  <UserAvatar hash={userProfile.hash} size={72} />
                ) : (
                  <Text style={styles.avatarText}>...</Text>
                )}
              </View>
              <Text style={styles.name}>
                {userProfile?.username || 'Loading...'}
              </Text>
              <Text style={styles.username}>@{userProfile?.username || 'user'}</Text>

            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>s</Text>
                <Text style={styles.statLabel}>Games Played</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>s</Text>
                <Text style={styles.statLabel}>Games Won</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{getWinRate()}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
            </View>

            {/* Earnings Card */}
            <View style={styles.arcadeCard}>
              <View style={styles.cardInner}>
                <Text style={styles.cardTitle}>💰 TOTAL EARNINGS</Text>
                <View style={styles.spacer} />
                <Text style={styles.earningsAmount}>
                  sh
                </Text>
              </View>
            </View>

            {/* Streak Card */}
            <View style={styles.arcadeCard}>
              <View style={styles.cardInner}>
                <Text style={styles.cardTitle}>🔥 STREAKS</Text>
                <View style={styles.spacer} />
                <View style={styles.streakContainer}>
                  <View style={styles.streakItem}>
                    <Text style={styles.streakNumber}>ama</Text>
                    <Text style={styles.streakLabel}>Current</Text>
                  </View>
                  <View style={styles.streakItem}>
                    <Text style={styles.streakNumber}>drank</Text>
                    <Text style={styles.streakLabel}>Best</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Recent Games */}
            <View style={styles.arcadeCard}>
              <View style={styles.cardInner}>
                <Text style={styles.cardTitle}>📊 RECENT GAMES</Text>
                <View style={styles.spacer} />
                
              </View>
            </View>

            {/* Account Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.signOutButton]}
                onPress={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.actionButtonText, styles.signOutButtonText]}>
                    Sign Out
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 100, // Account for header
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fdcff3',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  avatarText: {
    color: '#000000',
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    textAlign: 'center',
  },

  // Arcade Cards
  arcadeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 0,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  cardInner: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 16,
  },
  spacer: {
    height: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    color: '#4CAF50',
    textAlign: 'center',
  },

  // Streaks
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
  },

  // Games
  gameItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    marginBottom: 4,
  },
  gameDate: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
  },
  gameResult: {
    alignItems: 'flex-end',
  },
  gameStatus: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#666666',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  gameStatusWin: {
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    textAlign: 'center',
    padding: 24,
  },

  // Actions
  actionsContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  signOutButton: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  signOutButtonText: {
    color: '#FFFFFF',
  },
});