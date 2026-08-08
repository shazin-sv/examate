import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { ClerkProvider, SignedIn, SignedOut, useUser } from '@clerk/clerk-expo';
import tokenCache from './src/lib/clerkTokenCache';
import { auth, profile } from './src/lib/supabase';
import SignInScreen from './src/screens/auth/SignInScreen';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ChapterLogScreen from './src/screens/ChapterLogScreen';
import ChatScreen from './src/screens/ChatScreen';

const CLERK_PUBLISHABLE_KEY = 'pk_test_c3BlY2lhbC1vcnl4LTkzLmNsZXJrLmFjY291bnRzLmRldiQ';

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>📅</Text>,
        }}
      />
      <Tab.Screen
        name="Chapters"
        component={ChapterLogScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="AI Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🤖</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthenticatedApp() {
  const { user, isLoaded } = useUser();
  const [onboarded, setOnboarded] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;
    auth.setUserId(user.id);
    let mounted = true;
    (async () => {
      try {
        const p = await profile.get();
        if (mounted) setOnboarded(p?.onboarding_complete || false);
      } catch (e) {
        console.log('Profile check error:', e);
      }
      if (mounted) setChecking(false);
    })();
    return () => { mounted = false; };
  }, [isLoaded, user]);

  if (!isLoaded || checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>The Comeback</Text>
      </View>
    );
  }

  if (!onboarded) {
    return <OnboardingScreen onComplete={() => setOnboarded(true)} />;
  }

  return <MainTabs />;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <SignInScreen />
        </SignedOut>
      </NavigationContainer>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 16 },
});
