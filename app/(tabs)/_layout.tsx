import React, { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Modal, TouchableOpacity, Text, StyleSheet, View, Platform} from 'react-native';
// import { useWallet } from '../providers/WalletConnectProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PaymentModal from '@/components/modals/PaymentModal';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/Avatar';
import { Image } from 'react-native';
import LoginModal from '@/components/modals/LoginModal';
import { router } from 'expo-router';
import { getBalance } from '@/lib/transaction_utils';


// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export function HeaderRight() {
  const { user, signOut, getUserProfile } = useAuth();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [balance, setBalance] = useState(0);
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string, balance: number } | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setUserProfile(null);
      setBalance(0);
    }
  }, [user]);

  // Load balance whenever userProfile changes
  useEffect(() => {
    if (userProfile?.hash) {
      loadBalance();
    }
  }, [userProfile]);

  const loadUserProfile = async () => {
    if (user) {
      const profile = await getUserProfile();
      setUserProfile(profile);
    }
  };

  const loadBalance = async () => {
    if (userProfile?.hash) {
      const newBalance = await getBalance(userProfile.hash);
      setBalance(newBalance);
    }
  };

  const handleProfilePress = () => {
    router.push('/profile');
  };

  const handleConnect = () => {
    if (!user) {
      setLoginModalVisible(true);
      return;
    }
    setPaymentModalVisible(true);
  };

  const handlePaymentModalClose = () => {
    setPaymentModalVisible(false);
    // Reload balance after payment modal closes
    loadBalance();
  };

  return (
    <View style={styles.headerRightContainer}>
      {/* Balance Display - Only show if logged in */}
      {user && (
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>${balance.toFixed(2)}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.cryptoButton}
        onPress={handleConnect}
      >
        <Text style={styles.cryptoButtonText}>
          {user ? 'Deposit' : 'Login'}
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

      <PaymentModal
        visible={paymentModalVisible}
        onClose={handlePaymentModalClose}
        type="deposit"
      />
      
      <LoginModal 
        visible={loginModalVisible} 
        onClose={() => setLoginModalVisible(false)} 
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
        headerStyle: {
          backgroundColor: '#fdcff3',
        },
        headerTransparent: true,
        headerTitleAlign: "left",
        headerTitleStyle: {
          fontSize: 26,
          overflow: 'hidden',
          fontFamily: 'Inter_800ExtraBold',
          color: '#000000',
          marginLeft: 15,
        },
        headerTintColor: '#000000',
        headerRight: () => <HeaderRight />,
        headerRightContainerStyle: {
          paddingRight: 20,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={"white"} />,
        }}
      />
      <Tabs.Screen
        name="bets"
        options={{
          title: 'BETS',
          tabBarIcon: ({ color }) => <TabBarIcon name="trophy" color={"white"} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={"white"} />,
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
  balanceContainer: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: 10,
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textAlign: 'center',
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
});
