// CameraButton.tsx
import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/lib/haptics';

interface CameraButtonProps {
  onPress: () => void;
}

export default function CameraButton({ onPress }: CameraButtonProps) {
  const handlePress = () => {
    triggerHaptic('medium');
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View style={styles.circle}>
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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    ...Platform.select({
      android: {
        elevation: 5,
      },
    }),
  },
});

