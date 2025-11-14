import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';

interface WeeklySplitCardProps {
  hasActiveGame: boolean;
  activeGame: any;
  currentSplitDay: string;
  totalWorkouts: number;
  workoutData: number[];
  canLogWorkoutToday: boolean;
  onLogWorkout: () => void;
}

const MiniLineChart = ({ data, color = '#000', height = 60 }: { data: number[], color?: string, height?: number }) => {
  const width = 180;
  const padding = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#E0E0E0" strokeWidth="1" />
      <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth="3" />
      {data.map((value, index) => {
        const x = data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((value - min) / range) * (height - 2 * padding);
        return <Circle key={index} cx={x} cy={y} r="3" fill={color} />;
      })}
    </Svg>
  );
};

export default function WeeklySplitCard({
  hasActiveGame,
  activeGame,
  currentSplitDay,
  totalWorkouts,
  workoutData,
  canLogWorkoutToday,
  onLogWorkout,
}: WeeklySplitCardProps) {
  return (
    <TouchableOpacity
      style={styles.arcadeCard}
      onPress={canLogWorkoutToday && hasActiveGame ? onLogWorkout : undefined}
      disabled={!canLogWorkoutToday || !hasActiveGame}
    >
      <View style={styles.cardInner}>
        <Text style={styles.cardTitle}>WEEKLY SPLIT</Text>
        <View style={styles.spacer} />

        {!hasActiveGame ? (
          <Text style={styles.noGameText}>
            Join a game to see your weekly split!
          </Text>
        ) : activeGame?.weekly_schedule ? (
          <>
            {/* Weekly Schedule Grid */}
            <View style={styles.weeklyGrid}>
              {['M', 'T', 'W', 'TH', 'F', 'S', 'S'].map((dayLabel, index) => {
                const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const dayName = dayNames[index];
                const workout = activeGame.weekly_schedule[dayName];
                const todayIndex = (new Date().getDay() + 6) % 7;
                const isToday = index === todayIndex;

                return (
                  <View key={index} style={[styles.dayBox, isToday && styles.dayBoxActive]}>
                    <Text style={[styles.dayBoxLabel, isToday && styles.dayBoxLabelActive]}>{dayLabel}</Text>
                    <Text style={[styles.dayBoxValue, isToday && styles.dayBoxValueActive]}>{workout}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.dividerLight} />
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Text style={styles.statLabel}>TODAY</Text>
                <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{currentSplitDay}</Text>
                <Text style={styles.statSubtext}>{totalWorkouts} total workouts</Text>
              </View>
              <View style={styles.chartContainer}>
                <MiniLineChart data={workoutData} color="#000" height={60} />
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noGameText}>Loading schedule...</Text>
        )}

        {hasActiveGame && canLogWorkoutToday && (
          <>
            <View style={styles.dividerLight} />
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>LOG WORKOUT →</Text>
            </View>
          </>
        )}
        {hasActiveGame && !canLogWorkoutToday && (
          <>
            <View style={styles.dividerLight} />
            <View style={styles.linkRow}>
              <Text style={styles.linkTextDisabled}>✓ LOGGED TODAY</Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  arcadeCard: {
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#FFF',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  cardInner: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 16,
  },
  noGameText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 24,
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    marginHorizontal: 2,
  },
  dayBoxActive: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  dayBoxLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dayBoxLabelActive: {
    color: '#FFF',
  },
  dayBoxValue: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    textAlign: 'center',
  },
  dayBoxValueActive: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
  dividerLight: {
    height: 2,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricLeft: {
    flex: 1,
    minWidth: 100,
    maxWidth: 150,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 36,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 4,
    minHeight: 45,
  },
  statSubtext: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#4CAF50',
  },
  chartContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: 0,
    maxWidth: 180,
    overflow: 'hidden',
  },
  linkRow: {
    alignItems: 'flex-end',
  },
  linkText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  linkTextDisabled: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    color: '#999',
  },
});
