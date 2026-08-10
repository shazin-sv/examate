import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_ICONS = {
  Calendar: { active: '📅', inactive: '📅', label: 'Calendar' },
  Chapters: { active: '📖', inactive: '📖', label: 'Chapters' },
  'AI Chat': { active: '🤖', inactive: '🤖', label: 'AI Chat' },
  Account: { active: '👤', inactive: '👤', label: 'Account' },
};

export default function CustomTabBar({ state, descriptors, navigation }) {
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const tabCount = state.routes.length;
  const TAB_WIDTH = SCREEN_WIDTH / tabCount;
  const INDICATOR_WIDTH = 48;

  useEffect(() => {
    const targetLeft = state.index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
    Animated.spring(indicatorLeft, {
      toValue: targetLeft,
      useNativeDriver: false,
      speed: 40,
      bounciness: 8,
    }).start();
  }, [state.index]);

  return (
    <View style={s.container}>
      <View style={s.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tabInfo = TAB_ICONS[route.name] || { active: '•', inactive: '•', label: route.name };

          return (
            <TouchableOpacity
              key={route.name}
              style={s.tab}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name);
              }}
              activeOpacity={0.7}
            >
              <Text style={[s.tabIcon, isFocused && s.tabIconActive]}>
                {isFocused ? tabInfo.active : tabInfo.inactive}
              </Text>
              <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>
                {tabInfo.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={s.indicatorTrack}>
        <Animated.View
          style={[
            s.indicator,
            {
              width: INDICATOR_WIDTH,
              left: indicatorLeft,
            },
          ]}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: 2,
  },
  tabBar: {
    flexDirection: 'row',
    height: 52,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  indicatorTrack: {
    height: 3,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  indicator: {
    height: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 1.5,
    position: 'absolute',
    top: 0,
  },
});
