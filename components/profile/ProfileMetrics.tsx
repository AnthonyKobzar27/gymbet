import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface ProfileMetricsProps {
  totalWorkouts: number;
  gamesPlayed: number;
}

export default function ProfileMetrics({ totalWorkouts, gamesPlayed }: ProfileMetricsProps) {
  return (
    <View style={styles.metricsContainer}>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>TOTAL WORKOUTS</Text>
        <Text style={styles.metricValue}>{totalWorkouts}</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>GAMES PLAYED</Text>
        <Text style={styles.metricValue}>{gamesPlayed}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 28,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000000',
  },
});

