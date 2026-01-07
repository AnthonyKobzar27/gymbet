import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useDataCache } from '@/contexts/DataCacheContext';
import { WeeklySchedule } from '@/lib/game';
import CharacterComponent from './CharacterComponent';
import DailySplit from './DailySplit';
import { SPLIT_IMAGE_MAP } from '@/types/splitTypes';

// Import all homepage images
const IMAGES = {
  // Male images
  upper_boy: require('@/assets/images/homepage_pics/upper_boy.png'),
  lower_boy: require('@/assets/images/homepage_pics/lower_boy.png'),
  benchpress_boy: require('@/assets/images/homepage_pics/benchpress_boy.png'),
  back_boy: require('@/assets/images/homepage_pics/back_boy.png'),
  squats_boy: require('@/assets/images/homepage_pics/squats_boy.png'),
  arms_boy: require('@/assets/images/homepage_pics/arms_boy.png'),
  cardio_boy: require('@/assets/images/homepage_pics/cardio_boy.png'),
  rest_boy: require('@/assets/images/homepage_pics/rest_boy.png'),
  // Female images
  upper_girl: require('@/assets/images/homepage_pics/upper_girl.png'),
  lower_girl: require('@/assets/images/homepage_pics/lower_girl.png'),
  benchpress_girl: require('@/assets/images/homepage_pics/benchpress_girl.png'),
  back_girl: require('@/assets/images/homepage_pics/back_girl.png'),
  squats_girl: require('@/assets/images/homepage_pics/squats_girl.png'),
  arms_girl: require('@/assets/images/homepage_pics/arms_girl.png'),
  cardio_girl: require('@/assets/images/homepage_pics/cardio_girl.png'),
  rest_girl: require('@/assets/images/homepage_pics/rest_girl.png'),
};

type ImageKey = keyof typeof IMAGES;

const getTodayDayName = (): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

const getImageForSplit = (split: string | null, isMale: boolean): ImageKey => {
  const suffix = isMale ? '_boy' : '_girl';
  
  // If no split (no game), default to rest
  if (!split) {
    return `rest${suffix}` as ImageKey;
  }

  // Check if the split matches one of our known types
  const normalizedSplit = split.toLowerCase();
  const imageName = SPLIT_IMAGE_MAP[normalizedSplit];
  
  if (imageName) {
    return `${imageName}${suffix}` as ImageKey;
  }

  // For custom/other splits, default to rest
  return `rest${suffix}` as ImageKey;
};

export default function HomeScreen() {
  const { cache } = useDataCache();
  
  // Get gender from cache
  const gender = cache.userProfile?.gender;
  
  // Get today's split from cached schedule
  let todaySplit: string | null = null;
  if (cache.weeklySchedule) {
    const todayDayName = getTodayDayName();
    todaySplit = cache.weeklySchedule[todayDayName as keyof WeeklySchedule]?.toLowerCase() || null;
  }

  // Determine if user is male (only "Male" is boy, everything else is girl)
  const isMale = gender === 'Male';
  const imageKey = getImageForSplit(todaySplit, isMale);
  const imageSource = IMAGES[imageKey] || IMAGES[isMale ? 'rest_boy' : 'rest_girl'];

  return (
    <View style={styles.background}>
      <CharacterComponent imageSource={imageSource} />
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
