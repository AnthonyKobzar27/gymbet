import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/modals/LoginModal';
import HomeFeed from '@/components/comps/homescreen';
import { triggerHaptic } from '@/lib/haptics';


const ActivityItem = ({ activity }: { activity: any }) => (
  <View style={styles.activityItem}>
    <View style={styles.activityHeader}>
      <Text style={styles.activityUser}>
        {activity.profiles?.display_name || activity.profiles?.username || 'User'}
      </Text>
      <Text style={styles.activityTime}>
        {new Date(activity.created_at).toLocaleDateString()}
      </Text>
    </View>
    <Text style={styles.activityTitle}>{activity.title}</Text>
    {activity.description && (
      <Text style={styles.activityDescription}>{activity.description}</Text>
    )}
  </View>
);

const GameCard = ({ game, onJoin }: { game: any; onJoin: (gameId: string) => void }) => (
  <View style={styles.gameCard}>
    <View style={styles.gameHeader}>
      <Text style={styles.gameTitle}>{game.title}</Text>
      <Text style={styles.gameStake}>${(game.stake_amount_cents / 100).toFixed(2)}</Text>
    </View>
    {game.description && (
      <Text style={styles.gameDescription}>{game.description}</Text>
    )}
    <View style={styles.gameFooter}>
      <Text style={styles.gameInfo}>
        {game.total_participants}/{game.max_participants} players
      </Text>
      <Text style={styles.gameInfo}>
        Ends: {new Date(game.end_time).toLocaleDateString()}
      </Text>
    </View>
    <TouchableOpacity
      style={styles.joinButton}
      onPress={() => onJoin(game.id)}
    >
      <Text style={styles.joinButtonText}>JOIN CHALLENGE</Text>
    </TouchableOpacity>
  </View>
);

const CurrentGameCard = ({ game }: { game: any }) => (
  <View style={styles.currentGameCard}>
    <Text style={styles.currentGameTitle}>🎯 ACTIVE CHALLENGE</Text>
    <Text style={styles.currentGameName}>{game.title}</Text>
    <Text style={styles.currentGameStake}>
      Staked: ${(game.user_participation?.stake_amount_cents / 100).toFixed(2)}
    </Text>
    <Text style={styles.currentGameStatus}>
      Status: {game.status === 'active' ? 'In Progress' : 'Verification Phase'}
    </Text>
    {game.status === 'verification' && !game.user_participation?.submitted_proof && (
      <TouchableOpacity style={styles.submitProofButton}>
        <Text style={styles.submitProofButtonText}>SUBMIT PROOF</Text>
      </TouchableOpacity>
    )}
  </View>
);


export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const handleJoinGame = async (gameId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to join challenges');
      router.push('/auth');
      return;
    }
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading...</Text>
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
            refreshControl={
              <RefreshControl refreshing={refreshing}  />
            }
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
    paddingBottom: 100,
  },
  content: {
    padding: 16,
    paddingTop: 50,
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
  
  guestWelcome: {
    margin: 16,
    marginTop: 120,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 0,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  guestTitle: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  guestSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  guestButton: {
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
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },

  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
  },

  createGameButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  createGameButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 1,
  },

  currentGameCard: {
    backgroundColor: '#E8F5E8',
    borderWidth: 4,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  currentGameTitle: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 8,
  },
  currentGameName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    marginBottom: 8,
  },
  currentGameStake: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    marginBottom: 4,
  },
  currentGameStatus: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    marginBottom: 16,
  },
  submitProofButton: {
    backgroundColor: '#FF6B35',
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  submitProofButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 1,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    textAlign: 'center',
    padding: 24,
  },

  gameCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    flex: 1,
  },
  gameStake: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: '#FF6B35',
  },
  gameDescription: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gameInfo: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
  },
  joinButton: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 1,
  },

  activityItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
  },
  activityTime: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    lineHeight: 16,
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
    borderRadius: 0,
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
    borderRadius: 0,
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