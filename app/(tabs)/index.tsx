import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';

// Mini Line Chart Component
const MiniLineChart = ({ data, color = '#000', height = 60 }: { data: number[], color?: string, height?: number }) => {
  const width = 180;
  const padding = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#E0E0E0" strokeWidth="1" />
      {/* Line */}
      <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth="3" />
      {/* Points */}
      {data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((value - min) / range) * (height - 2 * padding);
        return <Circle key={index} cx={x} cy={y} r="3" fill={color} />;
      })}
    </Svg>
  );
};

const MiniLineChart2 = ({ data, color = '#000', height = 60 }: { data: number[], color?: string, height?: number }) => {
  const width = 180;
  const padding = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#E0E0E0" strokeWidth="1" />
      {/* Line */}
      <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth="3" />
      {/* Points */}
      {data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((value - min) / range) * (height - 2 * padding);
        return <Circle key={index} cx={x} cy={y} r="3" fill={color} />;
      })}
    </Svg>
  );
};



interface FeedItem {
  id: string;
  userHash: string;
  action: string;
  timestamp: string;
  type: 'wakeup' | 'comment' | 'bet' | 'win';
}

export default function HomeScreen() {
  const [activeGame] = useState(true);
  const [inGame, setInGame] = useState(false);
  
  // Mock data for charts
  const sleepData = [6.5, 7.2, 5.8, 8.1, 7.5, 6.0, 7.8]; // Last 7 days of sleep
  const profitData = [0, 5, 3, 8, 15, 20, 25]; // Cumulative profit over week
  
  // Mock feed data
  const feedItems: FeedItem[] = [
    { id: '1', userHash: '0x742d35Cc6634C0532925a3b8', action: 'woke up at 6:30 AM and won $10!', timestamp: '2 min ago', type: 'wakeup' },
    { id: '2', userHash: '0x89Ab23Ef5678C0532925a3b9', action: 'said: "Let\'s go! Easy money"', timestamp: '15 min ago', type: 'comment' },
    { id: '3', userHash: '0x456f78Cd9012C0532925a3c0', action: 'joined a new game with $5 stake', timestamp: '1 hour ago', type: 'bet' },
    { id: '4', userHash: '0x123e45Bc6789C0532925a3d1', action: 'woke up at 7:00 AM and won $15!', timestamp: '2 hours ago', type: 'win' },
    { id: '5', userHash: '0x987g65Hi4321C0532925a3e2', action: 'said: "Morning crew checking in!"', timestamp: '3 hours ago', type: 'comment' },
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

          {/* Sleep Today with Chart */}
          <TouchableOpacity 
            style={styles.arcadeCard}
            onPress={() => console.log("Sleep history tapped")}
          >
            <View style={styles.cardInner}>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Text style={styles.statLabel}>SLEEP TODAY</Text>
                  <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>7h</Text>
                </View>
                <View style={styles.chartContainer}>
                  <MiniLineChart data={sleepData} color="#000" height={60} />
                </View>
              </View>
              <View style={styles.dividerLight} />
              <View style={styles.linkRow}>
                <Text style={styles.linkText}>VIEW SLEEP HISTORY →</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Profit with Chart */}
          <TouchableOpacity 
            style={styles.arcadeCard}
            onPress={() => console.log("Profit history tapped")}
          >
            <View style={styles.cardInner}>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Text style={styles.statLabel}>TOTAL PROFIT</Text>
                  <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>$25</Text>
                </View>
                <View style={styles.chartContainer}>
                <MiniLineChart2 data={profitData} color="#000" height={60} />
                </View>
              </View>
              <View style={styles.dividerLight} />
              <View style={styles.linkRow}>
                <Text style={styles.linkText}>VIEW PROFITS →</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Feed Section */}
          <View style={styles.arcadeCard}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>ACTIVITY FEED</Text>
              <View style={styles.spacer} />
              
              {feedItems.map((item) => (
                <View key={item.id} style={styles.feedItem}>
                  <View style={styles.feedHeader}>
                    <View style={styles.feedUserRow}>
                      <Text style={styles.feedEmoji}></Text>
                      <Text style={styles.feedUser}>{item.userHash}</Text>
                    </View>
                    <Text style={styles.feedTimestamp}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.feedAction}>{item.action}</Text>
                </View>
              ))}
              
              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>VIEW MORE ACTIVITY →</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Action Buttons */}
          <TouchableOpacity 
            style={styles.buttonPrimary}
            onPress={() => router.push('/create-game' as any)}
          >
            <Text style={styles.buttonPrimaryText}>CREATE NEW GAME</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.buttonSecondary}
            onPress={() => router.push('/create-game' as any)}
          >
            <Text style={styles.buttonSecondaryText}>JOIN RANDOM GAME</Text>
          </TouchableOpacity>
          
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  chartLabel: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginTop: 4,
    color: '#666',
  },
  dividerLight: {
    height: 2,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  linkRow: {
    alignItems: 'flex-end',
  },
  linkText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  feedItem: {
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
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feedEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  feedUser: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    letterSpacing: 0.3,
  },
  feedTimestamp: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
    letterSpacing: 0.3,
  },
  feedAction: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    lineHeight: 18,
  },
  viewMoreButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  viewMoreText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 10,
    paddingTop: 40,
    overflow: 'hidden',
  },
  buttonPrimary: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  buttonPrimaryText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  buttonSecondary: {
    backgroundColor: '#FFF',
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
  buttonSecondaryText: {
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
});
