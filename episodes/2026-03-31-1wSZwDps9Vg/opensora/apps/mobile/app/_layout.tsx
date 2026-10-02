import type { User } from '@opea/shared';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect, useState, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getToken, setToken, clearToken } from '../src/lib/api';
import { AuthContext } from '../src/lib/auth';
import { posthogClient } from '../src/lib/posthog';
import { initializePurchases, loginToPurchases, logoutFromPurchases } from '../src/lib/purchases';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Initialize RevenueCat on mount
  useEffect(() => {
    initializePurchases();
  }, []);

  // Rehydrate token on boot
  useEffect(() => {
    void getToken().then((t) => {
      setTokenState(t);
      setReady(true);
    });
  }, []);

  // Redirect based on auth state
  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)/');
    }
  }, [token, ready, segments, router]);

  const signIn = useCallback(async (t: string, u: User) => {
    await setToken(t);
    setTokenState(t);
    setUser(u);
    // Identify user in RevenueCat for subscription tracking
    if (u.id) await loginToPurchases(u.id);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
    await logoutFromPurchases();
  }, []);

  if (!ready) return null;

  return (
    <PostHogProvider client={posthogClient} autocapture>
      <AuthContext.Provider value={{ user, token, signIn, signOut }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="video/[id]"
              options={{
                headerShown: false,
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen
              name="paywall"
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
          </Stack>
        </SafeAreaProvider>
      </AuthContext.Provider>
    </PostHogProvider>
  );
}
