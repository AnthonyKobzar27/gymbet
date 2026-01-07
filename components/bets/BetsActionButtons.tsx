import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface BetsActionButtonsProps {
  onJoinRandom: () => void;
  onCreateGame: () => void;
}

export default function BetsActionButtons({ onJoinRandom, onCreateGame }: BetsActionButtonsProps) {
  return (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity style={styles.actionButtonSecondary} onPress={onJoinRandom}>
        <Text style={styles.actionButtonSecondaryText}>JOIN RANDOM</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButtonPrimary}
        onPress={() => {
          triggerHaptic('medium');
          onCreateGame();
        }}
      >
        <Text style={styles.actionButtonPrimaryText}>CREATE GAME</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButtonPrimaryText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: fontFamily,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButtonSecondaryText: {
    color: '#000',
    textAlign: 'center',
    fontFamily: fontFamily,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

