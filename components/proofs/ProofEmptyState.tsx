import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ProofFilterMode } from '@/types/proof';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface ProofEmptyStateProps {
  filterMode: ProofFilterMode;
}

export default function ProofEmptyState({ filterMode }: ProofEmptyStateProps) {
  const getEmptyText = () => {
    if (filterMode === 'myProofs') return 'No proofs submitted yet';
    if (filterMode === 'myVotes') return 'No votes yet';
    return 'No proofs yet';
  };

  const getEmptySubtext = () => {
    if (filterMode === 'myProofs') return 'Your workout proofs will appear here';
    if (filterMode === 'myVotes') return 'Proofs you voted on will appear here';
    return 'Workout proofs will appear here';
  };

  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{getEmptyText()}</Text>
      <Text style={styles.emptySubtext}>{getEmptySubtext()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
  },
});

