import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { StyleSheet, Alert } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import TabBar from '@/components/footer/TabBar';
import CameraButton from '@/components/footer/CameraButton';
import ProofSubmissionModal from '@/components/modals/ProofSubmissionModal';
import { useAuth } from '@/contexts/AuthContext';
import { getUserActiveGame, getGameDetails, getGameSubmissions, submitWakeupProof } from '@/lib/game_utils';
import { triggerHaptic } from '@/lib/haptics';

export default function TabLayout() {
  const { user, onboardingCompleted, getUserProfile } = useAuth();
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [userHash, setUserHash] = useState<string | null>(null);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [canSubmitProof, setCanSubmitProof] = useState(false);
  
  // Show tab bar when user is logged in and onboarding is completed (or still checking)
  // Only hide it if onboarding is explicitly false (not completed)
  const showTabBar = user && onboardingCompleted !== false;

  useEffect(() => {
    checkGameStatus();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        checkGameStatus();
      }
    }, [user])
  );

  const checkGameStatus = async () => {
    if (!user) {
      setCanSubmitProof(false);
      return;
    }

    try {
      const profile = await getUserProfile();
      if (!profile?.hash) {
        setCanSubmitProof(false);
        return;
      }

      setUserHash(profile.hash);
      const activeGameData = await getUserActiveGame(profile.hash);

      if (activeGameData && activeGameData.status === 'active') {
        const gameDetails = await getGameDetails(activeGameData.id);
        setActiveGame(gameDetails);

        const today = new Date().toISOString().split('T')[0];
        const submissions = await getGameSubmissions(activeGameData.id, today);
        const userSubmission = submissions.find(s => s.user_hash === profile.hash);
        const submitted = !!userSubmission;
        setHasSubmittedToday(submitted);
        setCanSubmitProof(!submitted);
      } else {
        setActiveGame(null);
        setHasSubmittedToday(false);
        setCanSubmitProof(false);
      }
    } catch (error) {
      console.error('Failed to check game status:', error);
      setCanSubmitProof(false);
    }
  };

  const handleCameraPress = () => {
    if (!canSubmitProof || !activeGame) return;
    triggerHaptic('medium');
    setCameraModalVisible(true);
  };

  const handleProofSubmit = async (photoUri: string, caption: string) => {
    if (!activeGame || !userHash) return;

    triggerHaptic('medium');
    const result = await submitWakeupProof(
      activeGame.id,
      userHash,
      photoUri,
      caption,
      activeGame.split_type
    );

    if (result.ok) {
      triggerHaptic(result.isOnTime ? 'success' : 'warning');
      Alert.alert(
        'Success!',
        result.isOnTime ? 'Your workout proof was submitted on time!' : 'Proof submitted LATE!'
      );
      await checkGameStatus();
    } else {
      triggerHaptic('error');
      throw new Error(result.error?.message || 'Failed to submit proof');
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarButton: (props) => <HapticTab {...props} />,
          tabBarStyle: styles.hiddenTabBar,
          headerShown: false,
        }}>
        <Tabs.Screen name="index" options={{ title: 'HOME' }} />
        <Tabs.Screen name="proofs" options={{ title: 'PROOFS' }} />
        <Tabs.Screen name="bets" options={{ title: 'GAMES' }} />
        <Tabs.Screen name="profile" options={{ title: 'PROFILE' }} />
      </Tabs>
      {showTabBar && (
        <>
          <TabBar />
          <CameraButton onPress={handleCameraPress} enabled={canSubmitProof} />
        </>
      )}
      {activeGame && userHash && (
        <ProofSubmissionModal
          visible={cameraModalVisible}
          onClose={() => setCameraModalVisible(false)}
          onSubmit={handleProofSubmit}
          gameId={activeGame.id}
          splitType={activeGame.split_type}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hiddenTabBar: {
    display: 'none',
    height: 0,
    opacity: 0,
  },
});
