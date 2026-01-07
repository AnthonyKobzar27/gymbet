// CameraButton.tsx
import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/lib/haptics';

interface CameraButtonProps {
  onPress: () => void;
  enabled: boolean;
}

export default function CameraButton({ onPress, enabled }: CameraButtonProps) {
  const handlePress = () => {
    if (!enabled) return;
    triggerHaptic('medium');
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={enabled ? 0.7 : 1}
      onPress={handlePress}
      disabled={!enabled}
    >
      <View style={[styles.circle, !enabled && styles.circleDisabled]}>
        <Ionicons name="camera" size={36} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const CIRCLE_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 36,
    left: '50%',
    marginLeft: -CIRCLE_SIZE / 2,
    zIndex: 1001,
    elevation: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDisabled: {
    backgroundColor: '#999',
    borderColor: '#CCC',
  },
});

