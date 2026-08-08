import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { auth, profile } from './src/lib/supabase';
import InvitationCodeScreen from './src/screens/auth/InvitationCodeScreen';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ChapterLogScreen from './src/screens/ChapterLogScreen';
import ChatScreen from './src/screens/ChatScreen';

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

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const user = await auth.init();
      if (!mounted) return;
      if (user) {
        setAuthenticated(true);
        try {
          const p = await profile.get();
          if (mounted) setOnboarded(p?.onboarding_complete || false);
        } catch (e) {
          console.log('Profile check error:', e);
        }
      }
      setLoading(false);
    }
    init();
    const unsub = auth.onSessionChange(() => {
      const isAuth = auth.isAuthenticated();
      setAuthenticated(isAuth);
      if (isAuth) {
        profile.get().then(p => {
          setOnboarded(p?.onboarding_complete || false);
        }).catch(() => {});
      } else {
        setOnboarded(false);
      }
    });
    return () => { mounted = false; unsub(); };
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>The Comeback</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      {!authenticated ? (
        <InvitationCodeScreen />
      ) : !onboarded ? (
        <OnboardingScreen onComplete={() => setOnboarded(true)} />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 16 },
});
