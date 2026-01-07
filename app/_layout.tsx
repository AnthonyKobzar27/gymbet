import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useColorScheme } from '@/components/useColorScheme';
import { Platform } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { LaunchOverlay } from '@/components/LaunchOverlay';

let StripeProvider: React.ComponentType<any>;
if (Platform.OS !== 'web') {
  StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
} else {
  StripeProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
}

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
  ssr: false,
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [showIntro, setShowIntro] = useState(true);

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.snooze">
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ presentation: 'modal', title: 'Login' }} />
              <Stack.Screen name="signin" options={{ headerShown: false, animation: 'none' }} />
              <Stack.Screen name="signup" options={{ headerShown: false, animation: 'none' }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'none' }} />
              <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_left' }} />
            </Stack>
            {showIntro && <LaunchOverlay onFinished={() => setShowIntro(false)} />}
          </>
        </ThemeProvider>
      </AuthProvider>
    </StripeProvider>
  );
}
