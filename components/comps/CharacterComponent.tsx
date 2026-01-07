import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

interface CharacterComponentProps {
  imageSource: any;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CharacterComponent({ imageSource }: CharacterComponentProps) {
  return (
    <View style={styles.container}>
      <Image
        source={imageSource}
        style={styles.characterImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.5, // Upper half of the screen
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
    paddingTop: 0,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
});

