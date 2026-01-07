import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, Dimensions, TouchableOpacity } from 'react-native';
import StreamingText from '../StreamingText';
import { triggerHaptic } from '@/lib/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TEXT_CONTAINER_BOTTOM = 250;

interface WelcomeSlideProps {
  isActive: boolean;
  currentSlide: number;
  onBack: () => void;
}

export default function WelcomeSlide({ isActive, currentSlide, onBack }: WelcomeSlideProps) {
  const [titleComplete, setTitleComplete] = useState(false);
  const [key, setKey] = useState(0);
  
  const fontFamily = Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui',
  });

  useEffect(() => {
    if (isActive) {
      setTitleComplete(false);
      setKey(prev => prev + 1);
    }
  }, [isActive]);

  const title = 'Welcome to GymBet!';
  const description = "We're so incredibly grateful to have you! Gymbets makes working out more fun and consistent through adding a fun incentive - lets show you around!";

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
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/GYMBETS.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.titleContainer}>
          {isActive && (
            <StreamingText
              key={`title-${key}`}
              text={title}
              style={[styles.title, { fontFamily }]}
              onComplete={() => setTitleComplete(true)}
              delay={60}
            />
          )}
        </View>
        <View style={styles.descriptionContainer}>
          {isActive && titleComplete && (
            <StreamingText
              key={`description-${key}`}
              text={description}
              style={[styles.description, { fontFamily }]}
              delay={45}
            />
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
    top: (SCREEN_HEIGHT - TEXT_CONTAINER_BOTTOM) / 2 - 120,
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
});

