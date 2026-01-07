import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import PaymentModal from '@/components/modals/PaymentModal';
import BlockedUsersModal from '@/components/modals/BlockedUsersModal';
import SettingsModal from '@/components/modals/SettingsModal';
import TermsModal from '@/components/modals/TermsModal';
import HowToPlayModal from '@/components/modals/HowToPlayModal';
import FeedbackModal from '@/components/modals/FeedbackModal';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileMetrics from '@/components/profile/ProfileMetrics';
import ProfileActions from '@/components/profile/ProfileActions';
import { triggerHaptic } from '@/lib/haptics';
import AppHeader from '@/components/common/AppHeader';
import { useProfile } from '@/hooks/useProfile';
import { useProfileActions } from '@/hooks/useProfileActions';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

export default function ProfileScreen() {
  const { user, loading, getUserProfile } = useAuth();
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

  const { totalWorkouts, gamesPlayed, loadUserMetrics } = useProfile(userProfile?.hash || null);
  const { handleSignOut, handleDeleteAccount } = useProfileActions(userProfile?.hash || null);

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
  }, [user, loadUserMetrics]);

  useFocusEffect(
    useCallback(() => {
      if (userProfile?.hash) {
        loadUserMetrics(userProfile.hash);
      }
    }, [userProfile?.hash, loadUserMetrics])
  );

  const handleSignOutWithLoading = async () => {
    setSigningOut(true);
    await handleSignOut();
    setSigningOut(false);
  };

  const handleDeleteAccountWithLoading = async () => {
    setDeletingAccount(true);
    await handleDeleteAccount();
    setDeletingAccount(false);
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
              <ProfileHeader
                userHash={userProfile?.hash || null}
                username={userProfile?.username || null}
                email={userProfile?.email || null}
                onSettingsPress={() => {
                  triggerHaptic('light');
                  setSettingsModalVisible(true);
                }}
              />
              <ProfileMetrics totalWorkouts={totalWorkouts} gamesPlayed={gamesPlayed} />
              <ProfileActions
                signingOut={signingOut}
                deletingAccount={deletingAccount}
                onSignOut={handleSignOutWithLoading}
                onDeleteAccount={handleDeleteAccountWithLoading}
              />
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
});
