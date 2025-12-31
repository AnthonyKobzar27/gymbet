import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import TabIndicator from '@/components/TabIndicator';

export default function TabLayout() {
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
        <Tabs.Screen name="bets" options={{ title: 'GAMES' }} />
        <Tabs.Screen name="profile" options={{ title: 'PROFILE' }} />
      </Tabs>
      <TabIndicator />
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
