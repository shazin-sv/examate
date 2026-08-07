import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import CalendarScreen from './src/screens/CalendarScreen';
import ChapterLogScreen from './src/screens/ChapterLogScreen';
import ChatScreen from './src/screens/ChatScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
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
    </NavigationContainer>
  );
}
