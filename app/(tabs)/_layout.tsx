import React, { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Modal, TouchableOpacity, Text, StyleSheet, View, Platform} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/Avatar';
import { Image } from 'react-native';
import LoginModal from '@/components/modals/LoginModal';
import HowToPlayModal from '@/components/modals/HowToPlayModal';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { triggerHaptic } from '@/lib/haptics';
import { HapticTab } from '@/components/haptic-tab';


function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export function HeaderRight() {
  const { user, getUserProfile } = useAuth();
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string, balance: number } | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [howToPlayModalVisible, setHowToPlayModalVisible] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (user) {
      const profile = await getUserProfile();
      setUserProfile(profile);
    }
  };

  const handleProfilePress = () => {
    triggerHaptic('light');
    router.push('/profile');
  };

  const handleHowToPlayPress = () => {
    triggerHaptic('medium');
    setHowToPlayModalVisible(true);
  };

  return (
    <View style={styles.headerRightContainer}>
      <TouchableOpacity
        style={styles.cryptoButton}
        onPress={handleHowToPlayPress}
      >
        <Text style={styles.cryptoButtonText}>
          How to Play
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profileBubble, !user && styles.profileBubbleGuest]}
        onPress={handleProfilePress}
      >
        {user && userProfile?.hash ? (
          <UserAvatar hash={userProfile.hash} size={36} />
        ) : (
          <Image 
            source={require('@/assets/images/noprofile.png')} 
            style={{ width: 40, height: 40, borderRadius: 18 }}
          />
        )}
      </TouchableOpacity>

      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
      />

      <HowToPlayModal
        visible={howToPlayModalVisible}
        onClose={() => setHowToPlayModalVisible(false)}
      />
    </View>
  );
}



export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarButton: (props) => <HapticTab {...props} />,
        tabBarStyle: {
          backgroundColor: '#0b0930',
          borderTopWidth: 0,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 0,
          height: 70,
          borderTopColor: '#000000',
          overflow: 'hidden',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={"white"} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="bets"
        options={{
          title: 'GAMES',
          tabBarIcon: ({ color }) => <TabBarIcon name="trophy" color={"white"} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={"white"} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBubble: {
    width: 40,
    height: 40,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  profileBubbleGuest: {
    backgroundColor: '#E0E0E0',
    borderColor: '#999999',
  },
  cryptoButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: 10,
  },
  cryptoButtonText: {
    color: '#000000',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
