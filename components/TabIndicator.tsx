import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigationState, useNavigation, CommonActions } from '@react-navigation/native';
import { triggerHaptic } from '@/lib/haptics';

const TABS = ['index', 'bets', 'profile'];

export default function TabIndicator() {
  const navigation = useNavigation();
  
  const routeName = useNavigationState(state => {
    if (!state) return 'index';
    const route = state.routes[state.index];
    if (route?.state?.routes) {
      const tabRoute = route.state.routes[route.state.index || 0];
      return tabRoute?.name || route.name;
    }
    return route?.name || 'index';
  });

  const cleanRouteName = routeName.replace('(tabs)/', '');
  const currentIndex = TABS.findIndex(tab => cleanRouteName === tab || cleanRouteName.includes(tab));
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  const handleDotPress = (index: number) => {
    if (index !== activeIndex) {
      triggerHaptic('swipe');
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
      <View style={styles.indicatorContainer}>
        {TABS.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleDotPress(index)}
            activeOpacity={0.7}
            style={styles.dotTouchable}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View
              style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6e5ef',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
    gap: 16,
  },
  dotTouchable: {
    padding: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotActive: {
    backgroundColor: '#000',
  },
  dotInactive: {
    backgroundColor: '#999',
  },
});
