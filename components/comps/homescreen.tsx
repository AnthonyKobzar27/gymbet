import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import CharacterComponent from './CharacterComponent';
import DailySplit from './DailySplit';

export default function HomeScreen() {
  const { user, getUserProfile } = useAuth();
  const [gender, setGender] = useState<string | null>(null);

  const fetchGender = useCallback(async () => {
    if (user) {
      const profile = await getUserProfile();
      if (profile?.gender !== undefined) {
        setGender(profile.gender);
      }
    }
  }, [user, getUserProfile]);

  useEffect(() => {
    fetchGender();
  }, [fetchGender]);

  useFocusEffect(
    useCallback(() => {
      // Reload gender when screen comes into focus
      fetchGender();
    }, [fetchGender])
  );

  // Determine image source based on gender
  // Male -> benchpress_boy.png, Female/Null/Other -> benchpress_girl.png
  const imageSource = gender === 'Male' 
    ? require('@/assets/images/homepage_pics/benchpress_boy.png')
    : require('@/assets/images/homepage_pics/benchpress_girl.png');

  return (
    <View style={styles.background}>
      <CharacterComponent 
        imageSource={imageSource}
      />
      <DailySplit />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%', 
    height: '100%',
    margin: 0,
    marginTop: 0,
    padding: 0,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
});