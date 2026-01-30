import React from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function LoadingView() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/GYMBETS.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#000" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.1,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 16,
  },
});

