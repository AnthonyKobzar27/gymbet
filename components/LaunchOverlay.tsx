import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { ImageBackground } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

const { width, height } = Dimensions.get('window');

interface LaunchOverlayProps {
  onFinished?: () => void;
}

export function LaunchOverlay({ onFinished }: LaunchOverlayProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  // Start smaller so the logo can zoom out and expand
  const scale = useRef(new Animated.Value(0.4)).current;

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
      onFinished?.();
    });
  }, [opacity, scale, onFinished]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        { opacity },
      ]}
    >
      {/* Use the main app background so it feels consistent */}
      <ImageBackground
        source={require('@/assets/images/AppBackground.jpg')}
        style={styles.backgroundLayer}
        imageStyle={{ resizeMode: 'cover' }}
      >
        {/* Wavy GymBets bands over the background */}
        <View style={styles.wavesContainer}>
          <View style={[styles.wave, styles.waveTop]} />
          <View style={[styles.wave, styles.waveMiddle]} />
          <View style={[styles.wave, styles.waveBottom]} />
        </View>

        {/* Center logo only */}
        <Animated.View style={[styles.centerContent, { transform: [{ scale }] }]}>
          <Image
            source={require('@/assets/images/GYMBETS.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </ImageBackground>
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
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  wavesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  // Wavy-ish bands (rounded stripes) that feel relaxed but still like lines
  wave: {
    position: 'absolute',
    width: width * 1.8,
    height: height * 0.25,
    borderRadius: height * 0.25, // rounded edges but still band-like
    opacity: 0.9,
    transform: [{ rotate: '-18deg' }],
  },
  waveTop: {
    backgroundColor: '#fdcff3', // light GymBets pink
    top: -height * 0.25,
    left: -width * 0.4,
  },
  waveMiddle: {
    backgroundColor: '#9cd6ff', // soft blue
    top: height * 0.05,
    right: -width * 0.5,
  },
  waveBottom: {
    backgroundColor: '#ffd5ff', // lighter pink
    bottom: -height * 0.25,
    left: -width * 0.3,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    // Slightly rounded like an App Store icon, not a circle
    borderRadius: width * 0.12,
    marginBottom: 0,
  },
});


