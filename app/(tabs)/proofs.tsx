import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';
import AppHeader from '@/components/common/AppHeader';
import { ProofItem, ProofFilterMode } from '@/types/proof';
import { useProofVoting } from '@/hooks/useProofVoting';
import { useProofChallenge } from '@/hooks/useProofChallenge';
import { blockUser } from '@/lib/flagging_utils';
import ProofCard from '@/components/proofs/ProofCard';
import ProofFilterButton from '@/components/proofs/ProofFilterButton';
import ProofFilterMenu from '@/components/proofs/ProofFilterMenu';
import ProofEmptyState from '@/components/proofs/ProofEmptyState';

export default function ProofsScreen() {
  const { user } = useAuth();
  const { cache, refreshProofs } = useDataCache();
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<ProofFilterMode>('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  const userHash = cache.userProfile?.hash || null;

  const { handleVote, votingProofId } = useProofVoting(proofs, setProofs, userHash, refreshProofs);
  const { handleChallenge } = useProofChallenge(userHash);

  const handleBlockUser = useCallback(async (blockedUserHash: string) => {
    if (!userHash) return;
    const result = await blockUser(userHash, blockedUserHash);
    if (result.ok) {
      Alert.alert('User Blocked', 'You will no longer see proofs from this user.');
      refreshProofs();
    } else {
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  }, [userHash, refreshProofs]);

  useEffect(() => {
    if (!user) {
      router.replace('/signin');
    }
  }, [user]);

  // Use cached proofs based on filter mode
  useEffect(() => {
    if (filterMode === 'myProofs') {
      setProofs(cache.myProofs);
    } else if (filterMode === 'myVotes') {
      setProofs(cache.myVotes);
    } else {
      setProofs(cache.allProofs);
    }
  }, [filterMode, cache.myProofs, cache.myVotes, cache.allProofs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProofs();
    setRefreshing(false);
  }, [refreshProofs]);

  if (!user) {
    return null;
  }

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
        <AppHeader />
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.filterRow}>
            <ProofFilterButton 
              onPress={() => setFilterMenuVisible(!filterMenuVisible)}
            />
            <ProofFilterMenu
              visible={filterMenuVisible}
              filterMode={filterMode}
              onClose={() => setFilterMenuVisible(false)}
              onSelectFilter={setFilterMode}
            />
          </View>
          {proofs.length === 0 ? (
            <ProofEmptyState filterMode={filterMode} />
          ) : (
            proofs.map((proof) => (
              <ProofCard
                key={proof.id}
                proof={proof}
                filterMode={filterMode}
                onVote={handleVote}
                onChallenge={handleChallenge}
                onBlockUser={handleBlockUser}
                isVoting={votingProofId === proof.id}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
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
  filterRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
    marginRight: 0,
  },
});
