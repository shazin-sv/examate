import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase, profile } from './src/lib/supabase';
import SignInScreen from './src/screens/auth/SignInScreen';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ChapterLogScreen from './src/screens/ChapterLogScreen';
import ChatScreen from './src/screens/ChatScreen';
import AccountScreen from './src/screens/AccountScreen';
import CustomTabBar from './src/components/CustomTabBar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Chapters" component={ChapterLogScreen} />
      <Tab.Screen name="AI Chat" component={ChatScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function AuthenticatedApp({ onSignOut }) {
  const [onboarded, setOnboarded] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  useEffect(() => {
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
  }, []);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading</Text>
      </View>
    );
  }

  if (!onboarded) {
    return <OnboardingScreen onComplete={() => setOnboarded(true)} />;
  }

  return <MainTabs />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <ThemedStatusBar />
        {session ? (
          <AuthenticatedApp />
        ) : (
          <SignInScreen onAuthChange={() => {}} />
        )}
      </NavigationContainer>
    </ThemeProvider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f7f5' },
  loadingText: { fontSize: 15, fontWeight: '500', marginTop: 16, color: '#94a3b8' },
});
