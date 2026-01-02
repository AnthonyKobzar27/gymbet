import React, { useRef } from 'react';
import { View, PanResponder } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { triggerHaptic } from '@/lib/haptics';

interface SwipeableTabScreenProps {
  children: React.ReactNode;
  currentTab: string;
}

const TABS = ['index', 'proofs', 'bets', 'profile'];
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;

export default function SwipeableTabScreen({ children, currentTab }: SwipeableTabScreenProps) {
  const navigation = useNavigation();
  
  const navigateToTab = (tabName: string) => {
    triggerHaptic('swipe');
    navigation.dispatch(
      CommonActions.navigate({
        name: '(tabs)',
        params: { screen: tabName },
      })
    );
  };
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 1.5);
        return isHorizontalSwipe && Math.abs(gestureState.dx) > 15;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const routeName = currentTab.replace('(tabs)/', '');
        const currentIndex = TABS.findIndex(tab => routeName === tab || routeName.includes(tab));
        
        const shouldNavigate = Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > VELOCITY_THRESHOLD;
        
        if (shouldNavigate) {
          if (dx > 0 && currentIndex > 0) {
            navigateToTab(TABS[currentIndex - 1]);
          } else if (dx < 0 && currentIndex < TABS.length - 1) {
            navigateToTab(TABS[currentIndex + 1]);
          }
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
