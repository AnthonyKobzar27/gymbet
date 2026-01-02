import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import SwipeableTabScreen from '@/components/SwipeableTabScreen';

export default function ProofsScreen() {
  const route = useRoute();

  return (
    <SwipeableTabScreen currentTab={route.name}>
      <ImageBackground
        source={require('@/assets/images/AppBackground.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
          <View style={styles.content}>
            <Text style={styles.title}>PROOFS</Text>
            <Text style={styles.subtitle}>Your workout proofs will appear here</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
});

