import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { UserAvatar } from '@/components/Avatar';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface ProfileHeaderProps {
  userHash: string | null;
  username: string | null;
  email: string | null;
  onSettingsPress: () => void;
}

export default function ProfileHeader({
  userHash,
  username,
  email,
  onSettingsPress,
}: ProfileHeaderProps) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatar}>
        {userHash ? (
          <UserAvatar hash={userHash} size={80} />
        ) : (
          <Text style={styles.avatarText}>...</Text>
        )}
      </View>
      {userHash && (
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            triggerHaptic('light');
            onSettingsPress();
          }}
        >
          <FontAwesome name="cog" size={20} color="#000" />
        </TouchableOpacity>
      )}
      <Text style={styles.name}>{username || 'Loading...'}</Text>
      <Text style={styles.email}>{email || ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarText: {
    color: '#000000',
    fontSize: 24,
    fontFamily: fontFamily,
    fontWeight: '800',
  },
  name: {
    fontSize: 28,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666666',
  },
});

