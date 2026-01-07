import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

export default function SignUpLanding() {
  return (
    <ScrollView
      contentContainerStyle={styles.landingContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/GYMBETS.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <Text style={styles.landingTitle}>Join Gymbet</Text>
      
      <Text style={styles.landingSubtitle}>
        Start betting on your discipline goals!
      </Text>

      <TouchableOpacity
        style={styles.onboardingButton}
        onPress={() => {
          triggerHaptic('medium');
          router.replace('/onboarding');
        }}
      >
        <Text style={styles.onboardingButtonText}>START USER ONBOARDING</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => {
          triggerHaptic('light');
          router.replace('/signin');
        }}
      >
        <Text style={styles.switchButtonText}>
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  landingContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 40,
    marginTop: 100,
  },
  landingTitle: {
    marginTop: 100,
    fontSize: 28,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  landingSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  onboardingButton: {
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 0,
    alignItems: 'center',
    alignSelf: 'center',
  },
  onboardingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  switchButton: {
    marginTop: 20,
    paddingVertical: 12,
  },
  switchButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    textAlign: 'center',
  },
});

