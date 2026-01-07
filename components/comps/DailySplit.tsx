import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { getUserActiveGame, getGameDetails, WeeklySchedule } from '@/lib/game_utils';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

export default function DailySplit() {
  const { user, getUserProfile } = useAuth();
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveGame();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      // Reload when screen comes into focus (e.g., after joining a game)
      loadActiveGame();
    }, [user])
  );

  const loadActiveGame = async () => {
    if (!user) {
      setLoading(false);
      setWeeklySchedule(null);
      return;
    }

    try {
      setLoading(true);
      const profile = await getUserProfile();
      if (!profile?.hash) {
        setLoading(false);
        setWeeklySchedule(null);
        return;
      }

      const activeGame = await getUserActiveGame(profile.hash);
      console.log('DailySplit: Active game result:', activeGame ? { id: activeGame.id, status: activeGame.status } : null);
      
      if (activeGame) {
        const gameDetails = await getGameDetails(activeGame.id);
        console.log('DailySplit: Game details:', gameDetails ? { id: gameDetails.id, hasSchedule: !!gameDetails.weekly_schedule } : null);
        
        if (gameDetails?.weekly_schedule) {
          setWeeklySchedule(gameDetails.weekly_schedule);
        } else {
          // If game exists but no schedule, still set to null to show join message
          console.warn('Active game found but no weekly_schedule:', activeGame.id);
          setWeeklySchedule(null);
        }
      } else {
        console.log('DailySplit: No active game found for user');
        setWeeklySchedule(null);
      }
    } catch (error) {
      console.error('Failed to load active game:', error);
      setWeeklySchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const getTodayDayName = (): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>MY SPLIT</Text>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!weeklySchedule) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>MY SPLIT</Text>
            <Text style={styles.noGameText}>Join a game to see your weekly split!</Text>
          </View>
        </View>
      </View>
    );
  }

  const todayDayName = getTodayDayName();
  const dayOrder = [
    { name: 'monday', abbr: 'M' },
    { name: 'tuesday', abbr: 'T' },
    { name: 'wednesday', abbr: 'W' },
    { name: 'thursday', abbr: 'TH' },
    { name: 'friday', abbr: 'F' },
    { name: 'saturday', abbr: 'S' },
    { name: 'sunday', abbr: 'S' },
  ];

  const todayWorkout = weeklySchedule[todayDayName as keyof WeeklySchedule] || 'Rest';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <Text style={styles.cardTitle}>MY SPLIT</Text>
          
          {/* Today's Workout */}
          <View style={styles.todayContainer}>
            <Text style={styles.todayWorkout}>{todayWorkout}</Text>
          </View>

          <View style={styles.divider} />

          {/* Weekly Schedule */}
          <View style={styles.scheduleGrid}>
            {dayOrder.map((day) => {
              const workout = weeklySchedule[day.name as keyof WeeklySchedule];
              const isToday = day.name === todayDayName;

              return (
                <View key={day.name} style={styles.dayContainer}>
                  <View style={[styles.dayBox, isToday && styles.dayBoxActive]}>
                    <Text style={[styles.dayLabel, isToday && styles.dayLabelActive]}>
                      {day.abbr}
                    </Text>
                    <Text 
                      style={[styles.dayValue, isToday && styles.dayValueActive]} 
                      numberOfLines={2}
                    >
                      {workout || 'Rest'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: -30,
    marginBottom: 0,
  },
  card: {
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#FFF',
    borderRadius: 16,
  },
  cardInner: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  todayContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  todayLabel: {
    fontSize: 10,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
    marginBottom: 8,
  },
  todayWorkout: {
    fontSize: 24,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  divider: {
    height: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  noGameText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  dayContainer: {
    flex: 1,
    minWidth: 0,
  },
  dayBox: {
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  dayBoxActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dayLabelActive: {
    color: '#FFF',
  },
  dayValue: {
    fontSize: 9,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    lineHeight: 12,
  },
  dayValueActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});

