import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';
import ProofSubmissionModal from '@/components/modals/ProofSubmissionModal';
import CreateGameSlides from '@/components/bets/CreateGameSlides';
import ActiveGameView from '@/components/bets/ActiveGameView';
import JoinableGamesView from '@/components/bets/JoinableGamesView';
import BetsActionButtons from '@/components/bets/BetsActionButtons';
import HowToPlayModal from '@/components/modals/HowToPlayModal';
import { triggerHaptic } from '@/lib/haptics';
import AppHeader from '@/components/common/AppHeader';
import { useGames } from '@/hooks/useGames';
import { useGameActions } from '@/hooks/useGameActions';
import { formatDate } from '@/utils/dateUtils';

type TabType = 'players' | 'log';

export default function BetsScreen() {
  const { user } = useAuth();
  const { cache } = useDataCache();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('players');
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [howToPlayModalVisible, setHowToPlayModalVisible] = useState(false);

  const userHash = cache.userProfile?.hash || null;
  const { activeGame, joinableGames, hasSubmittedToday, loadGames } = useGames(userHash);
  const {
    handleJoinGame,
    handleLeaveGame,
    handleJoinRandomGame,
    handleProofSubmit,
    handleSendMessage,
  } = useGameActions(userHash, activeGame, loadGames);

  useEffect(() => {
    if (!user) {
      router.replace('/signin');
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <View style={styles.background}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
          <AppHeader />
            <ScrollView 
              style={styles.scrollContent} 
              showsVerticalScrollIndicator 
              contentContainerStyle={styles.scrollContentContainer}
            >
              {activeGame ? (
                <ActiveGameView
                  activeGame={activeGame}
                  selectedTab={selectedTab}
                  onTabChange={setSelectedTab}
                  hasSubmittedToday={hasSubmittedToday}
                  onSubmitProof={() => {
                    triggerHaptic('medium');
                    setProofModalVisible(true);
                  }}
                  onLeaveGame={handleLeaveGame}
                  chatMessage={chatMessage}
                  onChatMessageChange={setChatMessage}
                  onSendMessage={() => handleSendMessage(chatMessage, setChatMessage, setSendingMessage)}
                  sendingMessage={sendingMessage}
                  formatDate={formatDate}
                />
              ) : (
                <>
                  <BetsActionButtons
                    onJoinRandom={handleJoinRandomGame}
                    onCreateGame={() => {
                      triggerHaptic('medium');
                      setCreateModalVisible(true);
                    }}
                  />
                  <JoinableGamesView
                    joinableGames={joinableGames}
                    onJoinGame={handleJoinGame}
                    onCreateGame={() => {
                      triggerHaptic('medium');
                      setCreateModalVisible(true);
                    }}
                    formatDate={formatDate}
                  />
                </>
              )}
            </ScrollView>
          </SafeAreaView>

        <CreateGameSlides visible={createModalVisible} onClose={() => setCreateModalVisible(false)} onGameCreated={loadGames} />
        {activeGame && userHash && (
          <ProofSubmissionModal
            visible={proofModalVisible}
            onClose={() => setProofModalVisible(false)}
            onSubmit={handleProofSubmit}
            gameId={activeGame.id}
            splitType={activeGame.split_type}
          />
        )}
        <HowToPlayModal visible={howToPlayModalVisible} onClose={() => setHowToPlayModalVisible(false)} />
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
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
});
