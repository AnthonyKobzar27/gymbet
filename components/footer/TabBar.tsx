import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigationState, useNavigation, CommonActions } from '@react-navigation/native';
import TabButton from './TabButton';
import { Ionicons } from '@expo/vector-icons';

const TABS = ['index', 'proofs', 'bets', 'profile'];
const TAB_ICONS: Array<keyof typeof Ionicons.glyphMap> = ['home', 'checkmark-circle', 'trophy', 'person'];

export default function TabBar() {
  const navigation = useNavigation();

  const routeName = useNavigationState((state) => {
    if (!state) return 'index';
    const route = state.routes[state.index];
    if (route?.state?.routes) {
      const tabRoute = route.state.routes[route.state.index || 0];
      return tabRoute?.name || route.name;
    }
    return route?.name || 'index';
  });

  const cleanRouteName = routeName.replace('(tabs)/', '');
  const currentIndex = TABS.findIndex(
    (tab) => cleanRouteName === tab || cleanRouteName.includes(tab)
  );
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  const handleTabPress = (index: number) => {
    if (index !== activeIndex) {
      navigation.dispatch(
        CommonActions.navigate({
          name: '(tabs)',
          params: { screen: TABS[index] },
        })
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Left tabs */}
        <View style={styles.sideTabs}>
          <TabButton
            iconName={TAB_ICONS[0]}
            isActive={activeIndex === 0}
            onPress={() => handleTabPress(0)}
          />
          <TabButton
            iconName={TAB_ICONS[1]}
            isActive={activeIndex === 1}
            onPress={() => handleTabPress(1)}
          />
        </View>

        {/* Spacer for camera button */}
        <View style={styles.cameraSpacer} />

        {/* Right tabs */}
        <View style={styles.sideTabs}>
          <TabButton
            iconName={TAB_ICONS[2]}
            isActive={activeIndex === 2}
            onPress={() => handleTabPress(2)}
          />
          <TabButton
            iconName={TAB_ICONS[3]}
            isActive={activeIndex === 3}
            onPress={() => handleTabPress(3)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f7f7f7',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    zIndex: 1000,
    elevation: 10,
    paddingBottom: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sideTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
  },
  cameraSpacer: {
    width: 64,
  },
});
