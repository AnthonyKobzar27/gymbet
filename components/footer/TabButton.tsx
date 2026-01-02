import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/lib/haptics';

interface TabButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}

export default function TabButton({ iconName, isActive, onPress }: TabButtonProps) {
  const handlePress = () => {
    triggerHaptic('light');
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={iconName} 
        size={32} 
        color={isActive ? '#000' : '#999'} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});

