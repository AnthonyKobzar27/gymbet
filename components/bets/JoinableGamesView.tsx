import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Game } from '@/lib/game_utils';
import { triggerHaptic } from '@/lib/haptics';

interface JoinableGamesViewProps {
  joinableGames: Game[];
  onJoinGame: (gameId: string) => void;
  onCreateGame: () => void;
  formatDate: (dateStr: string) => string;
}

export default function JoinableGamesView({
  joinableGames,
  onJoinGame,
  onCreateGame,
  formatDate,
}: JoinableGamesViewProps) {
  return (
    <>
      {/* Joinable Games */}
      <View style={styles.arcadeCard}>
        <View style={styles.cardInner}>
          <Text style={styles.cardTitle}>JOINABLE GAMES</Text>
          <View style={styles.spacer} />

          {joinableGames.length === 0 ? (
            <Text style={styles.emptyText}>No games available. Create one!</Text>
          ) : (
            joinableGames.map((game) => (
              <View key={game.id} style={styles.gameItem}>
                <View style={styles.gameHeader}>
                  <Text style={styles.gameTitle}>Weekly Split</Text>
                  <Text style={styles.gameStake}>
                    {game.stake === 0 ? 'FREE / TEST' : `$${game.stake}`}
                  </Text>
                </View>

                {game.weekly_schedule && (
                  <View style={styles.scheduleGrid}>
                    <View style={styles.scheduleRow}>
                      <Text style={styles.dayLabel}>M</Text>
                      <Text style={styles.dayValue}>{game.weekly_schedule.monday}</Text>
                    </View>
                    <View style={styles.scheduleRow}>
                      <Text style={styles.dayLabel}>T</Text>
                      <Text style={styles.dayValue}>{game.weekly_schedule.tuesday}</Text>
                    </View>
                    <View style={styles.scheduleRow}>
                      <Text style={styles.dayLabel}>W</Text>
                      <Text style={styles.dayValue}>{game.weekly_schedule.wednesday}</Text>
                    </View>
                    <View style={styles.scheduleRow}>
                      <Text style={styles.dayLabel}>TH</Text>
                      <Text style={styles.dayValue}>{game.weekly_schedule.thursday}</Text>
                    </View>
                    <View style={styles.scheduleRow}>
                      <Text style={styles.dayLabel}>F</Text>
                      <Text style={styles.dayValue}>{game.weekly_schedule.friday}</Text>
                    </View>
                    <View style={styles.scheduleRow}>
                      <Text style={styles.dayLabel}>S</Text>
                      <Text style={styles.dayValue}>{game.weekly_schedule.saturday}</Text>
                    </View>
                    <View style={styles.scheduleRow}>
                      <Text style={styles.dayLabel}>S</Text>
                      <Text style={styles.dayValue}>{game.weekly_schedule.sunday}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.gameInfo}>
                  <Text style={styles.gamePlayers}>
                    {game.player_count}/8 Players
                  </Text>
                  <Text style={styles.gameCreated}>
                    {formatDate(game.created_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => {
                    triggerHaptic('medium');
                    onJoinGame(game.id);
                  }}
                >
                  <Text style={styles.joinButtonText}>JOIN GAME →</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>
    </>
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
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  gameItem: {
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  gameStake: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: '#4CAF50',
  },
  scheduleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  scheduleRow: {
    alignItems: 'center',
    minWidth: 36,
  },
  dayLabel: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    marginBottom: 2,
    letterSpacing: 0,
  },
  dayValue: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gamePlayers: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  gameCreated: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  joinButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  createButton: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  createButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
});
