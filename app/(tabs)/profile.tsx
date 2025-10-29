import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <ImageBackground
      source={require('../../assets/images/AppBackground.jpg')}
      style={styles.background}
      imageStyle={{resizeMode: "cover"}}
    >
    <SafeAreaView style={{ flex: 1 }}>
      <View style={[styles.scrollWrapper, {height: Dimensions.get("window").height - 50}]}>
        <ScrollView style={styles.scrollContent}>
          <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <Text style={styles.name}>JOHN DOE</Text>
          <Text style={styles.username}>@johndoe</Text>
        </View>

        {/* Achievement Badges */}
        <View style={styles.arcadeCard}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>ACHIEVEMENTS</Text>
            <View style={styles.spacer} />
            <View style={styles.badgeGrid}>
              <View style={styles.badgeItem}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>7D</Text>
                </View>
                <Text style={styles.badgeLabel}>STREAK</Text>
              </View>
              <View style={styles.badgeItem}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>1ST</Text>
                </View>
                <Text style={styles.badgeLabel}>WIN</Text>
              </View>
              <View style={styles.badgeItem}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>SPD</Text>
                </View>
                <Text style={styles.badgeLabel}>WAKER</Text>
              </View>
              <View style={[styles.badgeItem, styles.badgeLocked]}>
                <View style={styles.badgeDisabled}>
                  <Text style={styles.badgeTextDisabled}>10X</Text>
                </View>
                <Text style={styles.badgeLabel}>WINS</Text>
              </View>
              <View style={[styles.badgeItem, styles.badgeLocked]}>
                <View style={styles.badgeDisabled}>
                  <Text style={styles.badgeTextDisabled}>CHM</Text>
                </View>
                <Text style={styles.badgeLabel}>CHAMP</Text>
              </View>
              <View style={[styles.badgeItem, styles.badgeLocked]}>
                <View style={styles.badgeDisabled}>
                  <Text style={styles.badgeTextDisabled}>LGD</Text>
                </View>
                <Text style={styles.badgeLabel}>LEGEND</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Card */}
        <TouchableOpacity 
          style={styles.arcadeCard}
          onPress={() => router.push('/leaderboard' as any)}
        >
          <View style={styles.cardInner}>
            <View style={styles.statsHeader}>
              <Text style={styles.cardTitle}>STATISTICS</Text>
              <Text style={styles.linkText}>VIEW LEADERBOARD →</Text>
            </View>
            
            <View style={styles.spacer} />
            
            <View style={styles.statRow}>
              <Text style={styles.label}>CURRENT STREAK</Text>
              <Text style={styles.statValue}>7 days</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statRow}>
              <Text style={styles.label}>BEST STREAK</Text>
              <Text style={styles.statValue}>12 days</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statRow}>
              <Text style={styles.label}>WIN RATE</Text>
              <Text style={styles.statValue}>62.5%</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statRow}>
              <Text style={styles.label}>TOTAL GAMES</Text>
              <Text style={styles.statValue}>8</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statRow}>
              <Text style={styles.label}>TOTAL WINNINGS</Text>
              <Text style={styles.bigValue}>$25.00</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Settings/Options */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>SETTINGS</Text>
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>NOTIFICATIONS</Text>
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>PAYMENT METHODS</Text>
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>INVITE FRIENDS</Text>
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>HELP & SUPPORT</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>LOGOUT</Text>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: '#000',
    borderRadius: 0,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    color: '#FFF',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
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
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeLocked: {
    opacity: 0.3,
  },
  badge: {
    width: 56,
    height: 56,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeDisabled: {
    width: 56,
    height: 56,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
  },
  badgeTextDisabled: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    color: '#999',
  },
  badgeLabel: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  bigValue: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 24,
  },
  divider: {
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  menuCard: {
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
  menuItem: {
    padding: 16,
    backgroundColor: '#FFF',
  },
  menuDivider: {
    height: 2,
    backgroundColor: '#000',
  },
  menuText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 10,
    paddingTop: 40,
    overflow: 'hidden',
  },
  logoutText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
});
