import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const TAB_LABELS = {
  Calendar: 'Plan',
  Chapters: 'Log',
  'AI Chat': 'Ask',
  Account: 'You',
};

export default function CustomTabBar({ state, navigation }) {
  const { theme } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: theme.card, borderTopColor: theme.borderLight }]}>
      <View style={s.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = TAB_LABELS[route.name] || route.name;

          return (
            <TouchableOpacity
              key={route.name}
              style={s.tab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <Text style={[
                s.tabLabel,
                { color: isFocused ? theme.text : theme.textMuted },
                isFocused && s.tabLabelActive,
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
  },
  tabBar: {
    flexDirection: 'row',
    height: 44,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
