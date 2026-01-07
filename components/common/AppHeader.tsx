import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/Avatar';
import { triggerHaptic } from '@/lib/haptics';
import { getUnreadCount } from '@/lib/notification_utils';
import { useFocusEffect } from 'expo-router';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

export default function AppHeader() {
  const { user, getUserProfile } = useAuth();
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string; balance?: number } | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const profile = await getUserProfile();
        setUserProfile(profile);
        if (profile?.hash) {
          await loadUnreadCount(profile.hash);
        }
      }
    };
    loadProfile();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (userProfile?.hash) {
        loadUnreadCount(userProfile.hash);
      }
    }, [userProfile?.hash])
  );

  const loadUnreadCount = async (userHash: string) => {
    const count = await getUnreadCount(userHash);
    setUnreadNotificationCount(count);
  };

  const handleProfilePress = () => {
    triggerHaptic('light');
    router.push('/(tabs)/profile');
  };

  if (!user) {
    return null;
  }

  return (
    <View style={styles.stickyHeader}>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={() => {
          triggerHaptic('light');
          router.push('/notifications');
        }}
      >
        <View>
          <Ionicons name="notifications-outline" size={32} color="#000" />
          {unreadNotificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.headerRightContainer}>
        {userProfile && (
          <View style={styles.tokenBalanceContainer}>
            <Image
              source={require('@/assets/images/token.png')}
              style={styles.tokenImage}
            />
            <Text style={styles.tokenBalanceText}>
              {userProfile.balance?.toFixed(2) || '0.00'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.headerProfileBubble}
          onPress={handleProfilePress}
        >
          {userProfile?.hash ? (
            <UserAvatar hash={userProfile.hash} size={36} />
          ) : (
            <Image
              source={require('@/assets/images/noprofile.png')}
              style={styles.profileImage}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f7f7f7',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    zIndex: 100,
  },
  bellButton: {
    padding: 4,
    marginLeft: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fontFamily,
    fontWeight: '800',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tokenImage: {
    width: 20,
    height: 20,
  },
  tokenBalanceText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '400',
    color: '#000000',
  },
  headerProfileBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 18,
  },
});

