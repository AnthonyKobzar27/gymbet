import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { GameWithPlayers } from '@/types/game';
import { UserAvatar } from '@/components/Avatar';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface ActiveGameViewProps {
  activeGame: GameWithPlayers;
  selectedTab: 'players' | 'log';
  onTabChange: (tab: 'players' | 'log') => void;
  hasSubmittedToday: boolean;
  onSubmitProof: () => void;
  onLeaveGame: () => void;
  chatMessage: string;
  onChatMessageChange: (text: string) => void;
  onSendMessage: () => void;
  sendingMessage: boolean;
  formatDate: (dateStr: string) => string;
}

export default function ActiveGameView({
  activeGame,
  selectedTab,
  onTabChange,
  hasSubmittedToday,
  onSubmitProof,
  onLeaveGame,
  chatMessage,
  onChatMessageChange,
  onSendMessage,
  sendingMessage,
  formatDate,
}: ActiveGameViewProps) {
  return (
    <>
      {/* Game Info Card */}
      <View style={styles.arcadeCard}>
        <View style={styles.cardInner}>
          <View style={styles.gameHeader}>
            <Text style={styles.cardTitle}>MY GAME</Text>
            <View style={styles.gameStatusBadge}>
              <Text style={styles.gameStatusText}>
                {activeGame.status === 'active' ? 'ACTIVE' : 'WAITING'}
              </Text>
            </View>
          </View>

          {activeGame.weekly_schedule && (
            <View style={styles.scheduleGrid}>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>M</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.monday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>T</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.tuesday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>W</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.wednesday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>TH</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.thursday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>F</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.friday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>S</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.saturday}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.dayLabel}>S</Text>
                <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.sunday}</Text>
              </View>
            </View>
          )}

          <View style={styles.gameInfoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Players</Text>
              <Text style={styles.infoValue}>{activeGame.players.length}/8</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Stake</Text>
              <Text style={styles.infoValue}>${activeGame.stake}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Players List */}
      <View style={styles.arcadeCard}>
        <View style={styles.cardInner}>
          <Text style={styles.cardTitle}>PLAYERS</Text>
          <View style={styles.spacer} />
          {activeGame.players.map((player) => (
            <View key={player.id} style={styles.playerItem}>
              <UserAvatar hash={player.user_hash} size={40} />
              <View style={styles.playerInfo}>
                <Text style={styles.playerHash} numberOfLines={1}>
                  0x{player.user_hash.substring(0, 8)}...
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {activeGame.status === 'joinable' ? (
          <>
            <TouchableOpacity
              style={styles.submitProofButton}
              onPress={() => {
                triggerHaptic('medium');
                onSubmitProof();
              }}
            >
              <Text style={styles.submitProofButtonText}>
                WAITING ({activeGame.players.length}/8)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.leaveGameButton}
              onPress={() => {
                triggerHaptic('warning');
                onLeaveGame();
              }}
            >
              <Text style={styles.leaveGameButtonText}>LEAVE</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[
              styles.submitProofButton,
              styles.submitProofButtonCentered,
              (hasSubmittedToday || activeGame.status !== 'active') && styles.submitProofButtonDisabled
            ]}
            onPress={() => {
              if (!hasSubmittedToday && activeGame.status === 'active') {
                triggerHaptic('medium');
              }
              onSubmitProof();
            }}
            disabled={hasSubmittedToday || activeGame.status !== 'active'}
          >
            <Text style={styles.submitProofButtonText}>
              {hasSubmittedToday
                ? 'PROOF SUBMITTED ✓'
                : 'SUBMIT PROOF'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  arcadeCard: {
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  cardInner: {
    padding: 20,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gameStatusBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gameStatusText: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 16,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    marginVertical: 12,
    justifyContent: 'center',
  },
  scheduleRow: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dayValue: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
  },
  gameInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  playerInfo: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  playerHash: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
    flexShrink: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  submitProofButton: {
    flex: 1,
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  submitProofButtonCentered: {
    alignSelf: 'center',
    minWidth: 200,
  },
  submitProofButtonDisabled: {
    backgroundColor: '#CCC',
    borderColor: '#999',
  },
  submitProofButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: fontFamily,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  leaveGameButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  leaveGameButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: fontFamily,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
