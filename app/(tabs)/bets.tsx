import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VerificationEntry {
  id: string;
  userHash: string;
  timestamp: string;
  action: string;
  status: 'pending' | 'verified' | 'challenged';
}

export default function BetsScreen() {
  const [timeElapsed, setTimeElapsed] = useState('2h 34m');
  
  // Pool competitors
  const competitors = [
    '0x742d35Cc6634C0532925a3b8',
    '0x89Ab23Ef5678C0532925a3b9',
    '0x456f78Cd9012C0532925a3c0',
    '0x123e45Bc6789C0532925a3d1',
  ];
  
  // Mock verification log data
  const verificationLog: VerificationEntry[] = [
    { id: '1', userHash: '0x742d35Cc6634C0532925a3b8', timestamp: '6:32 AM', action: 'Submitted wake-up proof', status: 'pending' },
    { id: '2', userHash: '0x89Ab23Ef5678C0532925a3b9', timestamp: '6:45 AM', action: 'Submitted wake-up proof', status: 'verified' },
    { id: '3', userHash: '0x456f78Cd9012C0532925a3c0', timestamp: '7:01 AM', action: 'Submitted wake-up proof', status: 'pending' },
    { id: '4', userHash: '0x123e45Bc6789C0532925a3d1', timestamp: '6:28 AM', action: 'Submitted wake-up proof', status: 'verified' },
  ];

  return (
    <ImageBackground
      source={require('../../assets/images/AppBackground.jpg')}
      style={styles.background}
      imageStyle={{resizeMode: "cover"}}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style = {[styles.scrollWrapper, {height: Dimensions.get("window").height - 50}]}>
          <ScrollView style={styles.scrollContent}>
            <View style={styles.content}>

          {/* Game Stats */}
          <View style={styles.arcadeCard}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>MY GAME STATS</Text>
              <View style={styles.spacer} />
              
              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>TIME ELAPSED</Text>
                  <Text style={styles.statNumber}>{timeElapsed}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>WAKE TIME</Text>
                  <Text style={styles.statNumber}>6:30 AM</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>STAKE</Text>
                  <Text style={styles.statNumber}>$5.00</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>POOL</Text>
                  <Text style={styles.statNumber}>$20.00</Text>
                </View>
              </View>
              
              <View style={styles.dividerHeavy} />
              
              {/* Competitors List */}
              <Text style={styles.sectionLabel}>POOL COMPETITORS</Text>
              <View style={styles.spacer} />
              
              {competitors.map((hash, index) => (
                <View key={index} style={styles.competitorItem}>
                  <Text style={styles.competitorHash}>{hash}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Verification Log */}
          <View style={styles.arcadeCard}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>VERIFICATION LOG</Text>
              <View style={styles.spacer} />
              
              {verificationLog.map((entry) => (
                <View key={entry.id} style={styles.verificationItem}>
                  <View style={styles.verificationHeader}>
                    <Text style={styles.verificationUser}>{entry.userHash}</Text>
                    <Text style={styles.verificationTime}>{entry.timestamp}</Text>
                  </View>
                  <Text style={styles.verificationAction}>{entry.action}</Text>
                  
                  {entry.status === 'pending' && (
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={styles.verifyButton}>
                        <Text style={styles.verifyButtonText}>VERIFY</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.challengeButton}>
                        <Text style={styles.challengeButtonText}>CHALLENGE</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {entry.status === 'verified' && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>VERIFIED</Text>
                    </View>
                  )}
                  
                  {entry.status === 'challenged' && (
                    <View style={[styles.statusBadge, styles.challengedBadge]}>
                      <Text style={styles.statusText}>CHALLENGED</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%', 
    height: '100%',
  },
  scrollWrapper: { 
    overflow: 'hidden' 
  },
  scrollContent: {
    flexGrow: 1,
    padding: 10,
    paddingTop: 40,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
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
  statsRow: {
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
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  dividerHeavy: {
    height: 3,
    backgroundColor: '#000',
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    color: '#666',
    textTransform: 'uppercase',
  },
  competitorItem: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  competitorHash: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    letterSpacing: 0.3,
  },
  verificationItem: {
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
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  verificationUser: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    letterSpacing: 0.3,
    flex: 1,
  },
  verificationTime: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
    letterSpacing: 0.3,
  },
  verificationAction: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  verifyButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  verifyButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  challengeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  challengeButtonText: {
    color: '#000',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#000',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  challengedBadge: {
    backgroundColor: '#FF5252',
  },
  statusText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
