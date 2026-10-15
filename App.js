import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { profile } from './src/lib/storage';
import { requestNotificationPermission, setNotificationChannel } from './src/lib/notifications';
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

function AuthenticatedApp() {
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
        <ActivityIndicator size="large" color="#545454" />
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
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setNotificationChannel();
      requestNotificationPermission();
    }
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer>
        <ThemedStatusBar />
        <AuthenticatedApp />
      </NavigationContainer>
    </ThemeProvider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  loadingText: { fontSize: 15, fontWeight: '500', marginTop: 16, color: '#b5b5b5' },
});
