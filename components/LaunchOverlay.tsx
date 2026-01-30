import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

const { width, height } = Dimensions.get('window');

interface LaunchOverlayProps {
  onFinished?: () => void;
}

export function LaunchOverlay({ onFinished }: LaunchOverlayProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  // Start smaller so the logo can zoom out and expand
  const scale = useRef(new Animated.Value(0.4)).current;
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Kick off a satisfying haptic when the animation starts
    triggerHaptic('medium');

    // Extra engagement haptic halfway through the zoom
    const midHapticTimeout = setTimeout(() => {
      triggerHaptic('light');
    }, 350);

    Animated.sequence([
      // Big zoom out / expand
      Animated.timing(scale, {
        toValue: 1.15,
        duration: 650,
        useNativeDriver: true,
      }),
      // Gentle settle back to 1 while fading out
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      clearTimeout(midHapticTimeout);
      triggerHaptic('success');
      setIsFinished(true);
      onFinished?.();
    });
  }, [opacity, scale, onFinished]);

  // Don't render anything after animation finishes
  if (isFinished) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        { opacity },
      ]}
    >
      {/* Simple background with logo animation */}
      <View style={styles.backgroundLayer}>
        <Animated.View style={[styles.centerContent, { transform: [{ scale }] }]}>
          <Image
            source={require('@/assets/images/GYMBETS.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backgroundLayer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.12,
    marginBottom: 0,
  },
});


