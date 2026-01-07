import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

interface ProofFilterButtonProps {
  onPress: () => void;
}

export default function ProofFilterButton({ onPress }: ProofFilterButtonProps) {
  return (
    <View style={styles.filterButtonContainer}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          triggerHaptic('light');
          onPress();
        }}
      >
        <View style={styles.filterIconCircle}>
          <View style={styles.filterLine} />
          <View style={styles.filterLine} />
          <View style={styles.filterLine} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  filterButtonContainer: {
    // Minimal container - sizing handled by filterButton
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  filterLine: {
    width: 18,
    height: 2,
    backgroundColor: '#000',
    borderRadius: 1,
  },
});

