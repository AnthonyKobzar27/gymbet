import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import TabBar from '@/components/footer/TabBar';
import CameraButton from '@/components/footer/CameraButton';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { user, onboardingCompleted } = useAuth();
  
  const showTabBar = user && onboardingCompleted !== false && onboardingCompleted !== null;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarButton: (props) => <HapticTab {...props} />,
          tabBarStyle: styles.hiddenTabBar,
          headerShown: false,
        }}>
        <Tabs.Screen name="index" options={{ title: 'HOME' }} />
        <Tabs.Screen name="proofs" options={{ title: 'PROOFS' }} />
        <Tabs.Screen name="bets" options={{ title: 'GAMES' }} />
        <Tabs.Screen name="profile" options={{ title: 'PROFILE' }} />
      </Tabs>
      {showTabBar && (
        <>
          <TabBar />
          <CameraButton onPress={() => console.log('Camera pressed')} />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hiddenTabBar: {
    display: 'none',
    height: 0,
    opacity: 0,
  },
});
