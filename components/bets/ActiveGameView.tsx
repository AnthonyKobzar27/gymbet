import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { GameWithPlayers } from '@/lib/game_utils';
import { UserAvatar } from '@/components/Avatar';

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
      {/* Game Header */}
      <View style={styles.arcadeCard}>
        <View style={styles.cardInner}>
          <Text style={styles.cardTitle}>MY CURRENT GAME</Text>
          <View style={styles.spacer} />

          {/* Weekly Schedule */}
          {activeGame.weekly_schedule && (
            <>
              <View style={styles.scheduleGrid}>
                <View style={styles.scheduleRow}>
                  <Text style={styles.dayLabel} numberOfLines={1}>M</Text>
                  <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.monday}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.dayLabel} numberOfLines={1}>T</Text>
                  <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.tuesday}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.dayLabel} numberOfLines={1}>W</Text>
                  <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.wednesday}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.dayLabel} numberOfLines={1}>TH</Text>
                  <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.thursday}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.dayLabel} numberOfLines={1}>F</Text>
                  <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.friday}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.dayLabel} numberOfLines={1}>S</Text>
                  <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.saturday}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.dayLabel} numberOfLines={1}>S</Text>
                  <Text style={styles.dayValue} numberOfLines={1}>{activeGame.weekly_schedule.sunday}</Text>
                </View>
              </View>
              <View style={styles.spacer} />
            </>
          )}

          <View style={styles.gameStatsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>STAKE</Text>
              <Text style={styles.statValue}>${activeGame.stake}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>POOL</Text>
              <Text style={styles.statValue}>${activeGame.stake * activeGame.player_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>PLAYERS</Text>
              <Text style={styles.statValue}>{activeGame.players.length}/8</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              {activeGame.status === 'active' ? 'GAME ACTIVE' : 'WAITING FOR PLAYERS'}
            </Text>
            <Text style={styles.playerCount}>
              {activeGame.players.length}/8 Players
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'players' && styles.tabActive]}
          onPress={() => onTabChange('players')}
        >
          <Text style={[styles.tabText, selectedTab === 'players' && styles.tabTextActive]}>
            PLAYERS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'log' && styles.tabActive]}
          onPress={() => onTabChange('log')}
        >
          <Text style={[styles.tabText, selectedTab === 'log' && styles.tabTextActive]}>
            LOG
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.arcadeCard}>
        <View style={styles.cardInner}>
          {selectedTab === 'players' && (
            <>
              <Text style={styles.cardTitle}>PLAYERS ({activeGame.players.length}/8)</Text>
              <View style={styles.spacer} />
              {activeGame.players.map((player) => (
                <View key={player.id} style={styles.playerItem}>
                  <UserAvatar hash={player.user_hash} size={40} />
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerHash} numberOfLines={1}>
                      0x{player.user_hash.substring(0, 12)}...
                    </Text>
                    <Text style={styles.playerWakeups} numberOfLines={1}>
                      {player.total_workouts} workouts
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {selectedTab === 'log' && (
            <>
              <Text style={styles.cardTitle}>ACTIVITY LOG</Text>
              <View style={styles.spacer} />
              {activeGame.logs.length === 0 ? (
                <Text style={styles.emptyText}>No activity yet</Text>
              ) : (
                <ScrollView
                  style={styles.logScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {activeGame.logs.map((log) => (
                    <View key={log.id} style={styles.logItem}>
                      <View style={styles.logHeader}>
                        <Text style={styles.logType} numberOfLines={1}>
                          {log.event_type.toUpperCase()}
                        </Text>
                        <Text style={styles.logTime} numberOfLines={1}>
                          {formatDate(log.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.logMessage} numberOfLines={2}>{log.message}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Chat Input */}
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#999"
                  value={chatMessage}
                  onChangeText={onChatMessageChange}
                  multiline
                  maxLength={500}
                  editable={!sendingMessage}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (sendingMessage || !chatMessage.trim()) && styles.sendButtonDisabled]}
                  onPress={onSendMessage}
                  disabled={sendingMessage || !chatMessage.trim()}
                >
                  {sendingMessage ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.sendButtonText}>SEND</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Submit Proof Button */}
      <TouchableOpacity
        style={[
          styles.submitProofButton,
          (hasSubmittedToday || activeGame.status !== 'active') && styles.submitProofButtonDisabled
        ]}
        onPress={onSubmitProof}
        disabled={hasSubmittedToday || activeGame.status !== 'active'}
      >
        <Text style={styles.submitProofButtonText} numberOfLines={1}>
          {activeGame.status !== 'active'
            ? `WAITING FOR PLAYERS... (${activeGame.players.length}/8)`
            : hasSubmittedToday
              ? 'PROOF SUBMITTED TODAY ✓'
              : 'SUBMIT WORKOUT PROOF'}
        </Text>
      </TouchableOpacity>

      {/* Leave Game Button - Only show if game hasn't started */}
      {activeGame.status === 'joinable' && (
        <TouchableOpacity
          style={styles.leaveGameButton}
          onPress={onLeaveGame}
        >
          <Text style={styles.leaveGameButtonText} numberOfLines={1}>
            LEAVE GAME
          </Text>
        </TouchableOpacity>
      )}
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
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  dayValue: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  gameStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  playerCount: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  tabActive: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#FFF',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  playerInfo: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  playerHash: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    marginBottom: 2,
    flexShrink: 1,
  },
  playerWakeups: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  logScrollView: {
    maxHeight: 300,
  },
  logItem: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
    padding: 10,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logType: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    letterSpacing: 0.5,
  },
  logTime: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
  },
  logMessage: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    flexShrink: 1,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
    borderColor: '#999',
  },
  sendButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  submitProofButton: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  submitProofButtonDisabled: {
    backgroundColor: '#CCC',
    borderColor: '#999',
  },
  submitProofButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
    flexShrink: 1,
  },
  leaveGameButton: {
    backgroundColor: '#FF4444',
    borderWidth: 4,
    borderColor: '#000',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  leaveGameButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    letterSpacing: 1,
  },
});
