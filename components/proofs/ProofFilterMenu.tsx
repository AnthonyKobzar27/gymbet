import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Dimensions } from 'react-native';
import { ProofFilterMode } from '@/types/proof';
import { triggerHaptic } from '@/lib/haptics';

const MENU_HEIGHT = 44;
const BUTTON_SPACING = 8;

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface ProofFilterMenuProps {
  visible: boolean;
  filterMode: ProofFilterMode;
  onClose: () => void;
  onSelectFilter: (mode: ProofFilterMode) => void;
}

export default function ProofFilterMenu({
  visible,
  filterMode,
  onClose,
  onSelectFilter,
}: ProofFilterMenuProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Slide from right to left
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (!visible) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.menuContainer,
          { transform: [{ translateX }], opacity },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterMode === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => {
            triggerHaptic('light');
            onSelectFilter('all');
            onClose();
          }}
        >
          <Text
            style={[styles.filterButtonText, filterMode === 'all' && styles.filterButtonTextActive]}
          >
            All Proofs
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterMode === 'myVotes' && styles.filterButtonActive,
          ]}
          onPress={() => {
            triggerHaptic('light');
            onSelectFilter('myVotes');
            onClose();
          }}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterMode === 'myVotes' && styles.filterButtonTextActive,
            ]}
          >
            My Votes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterMode === 'myProofs' && styles.filterButtonActive,
          ]}
          onPress={() => {
            triggerHaptic('light');
            onSelectFilter('myProofs');
            onClose();
          }}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterMode === 'myProofs' && styles.filterButtonTextActive,
            ]}
          >
            My Proofs
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: -100,
    left: -16,
    right: -16,
    bottom: -2000,
    backgroundColor: 'transparent',
    zIndex: 998,
  },
  menuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BUTTON_SPACING,
    zIndex: 1000,
    flex: 1,
  },
  filterButton: {
    flex: 1,
    height: MENU_HEIGHT,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterButtonActive: {
    backgroundColor: '#000',
  },
  filterButtonText: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
});
