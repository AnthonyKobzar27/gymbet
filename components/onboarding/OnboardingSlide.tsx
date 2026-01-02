import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { Slide } from './onboardingData';
import StreamingText from './StreamingText';
import StreamingTextWithImage from './StreamingTextWithImage';
import { triggerHaptic } from '@/lib/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TEXT_CONTAINER_BOTTOM = 250; // Bottom position of text container

interface OnboardingSlideProps {
  slide: Slide;
  isActive: boolean;
  slideIndex: number;
  currentSlide: number;
  onBack: () => void;
}

export default function OnboardingSlide({ slide, isActive, slideIndex, currentSlide, onBack }: OnboardingSlideProps) {
  const [titleComplete, setTitleComplete] = useState(false);
  const [key, setKey] = useState(0); // Key to force remount of StreamingText components
  
  const fontFamily = Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui',
  });

  // Reset streaming when slide becomes active
  useEffect(() => {
    if (isActive) {
      setTitleComplete(false);
      setKey(prev => prev + 1); // Force remount to restart streaming
    }
  }, [isActive, slideIndex]);

  return (
    <View style={styles.container}>
      {currentSlide > 0 && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      )}
      {slide.showLogo && (
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/GYMBETS.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}
      <View style={styles.textContainer}>
        <View style={styles.titleContainer}>
          {isActive && (
            <StreamingText
              key={`title-${key}`}
              text={slide.title}
              style={[styles.title, { fontFamily }]}
              onComplete={() => setTitleComplete(true)}
              delay={60}
            />
          )}
        </View>
        <View style={styles.descriptionContainer}>
          {isActive && titleComplete && (
            slide.description.includes('[TOKEN]') ? (
              <StreamingTextWithImage
                key={`description-${key}`}
                text={slide.description}
                imagePlaceholder="[TOKEN]"
                imageSource={require('@/assets/images/token.png')}
                imageStyle={styles.tokenImage}
                style={[styles.description, { fontFamily }]}
                delay={45}
              />
            ) : (
              <StreamingText
                key={`description-${key}`}
                text={slide.description}
                style={[styles.description, { fontFamily }]}
                delay={45}
              />
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 40,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    color: '#999',
    fontWeight: '400',
  },
  logoContainer: {
    position: 'absolute',
    top: (SCREEN_HEIGHT - TEXT_CONTAINER_BOTTOM) / 2 - 120, // Center between top (0) and text top, minus half logo height
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 40,
    overflow: 'hidden',
  },
  emojiContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
  },
  textContainer: {
    position: 'absolute',
    bottom: TEXT_CONTAINER_BOTTOM,
    left: 40,
    right: 40,
    alignItems: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },
  titleContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 10,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  descriptionContainer: {
    width: '100%',
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  tokenImage: {
    width: 20,
    height: 20,
  },
});

