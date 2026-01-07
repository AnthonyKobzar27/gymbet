import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Game } from '@/types/game';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

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
  if (joinableGames.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No games available. Create one!</Text>
      </View>
    );
  }

  return (
    <>
      {joinableGames.map((game) => (
        <View key={game.id} style={styles.gameCard}>
          <View style={styles.gameHeader}>
            <Text style={styles.gameTitle}>WEEKLY SPLIT</Text>
            <View style={styles.stakeBadge}>
              {game.stake === 0 ? (
                <Text style={styles.gameStake}>FREE</Text>
              ) : (
                <View style={styles.stakeContainer}>
                  <Text style={styles.gameStake}>{game.stake}</Text>
                  <Image 
                    source={require('@/assets/images/token.png')} 
                    style={styles.tokenImage}
                  />
                </View>
              )}
            </View>
          </View>

          {game.weekly_schedule && (
            <View style={styles.scheduleGrid}>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>M</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{game.weekly_schedule.monday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>T</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{game.weekly_schedule.tuesday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>W</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{game.weekly_schedule.wednesday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>TH</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{game.weekly_schedule.thursday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>F</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{game.weekly_schedule.friday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>S</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{game.weekly_schedule.saturday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>S</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{game.weekly_schedule.sunday}</Text>
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
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#000',
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  gameCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#000',
    padding: 20,
    marginBottom: 16,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gameTitle: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  stakeBadge: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stakeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gameStake: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  tokenImage: {
    width: 16,
    height: 16,
  },
  scheduleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 4,
  },
  scheduleRow: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dayValue: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  gamePlayers: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
  },
  gameCreated: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#999',
  },
  joinButton: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'center',
    minWidth: 140,
  },
  joinButtonText: {
    color: '#FFF',
    fontFamily: fontFamily,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
