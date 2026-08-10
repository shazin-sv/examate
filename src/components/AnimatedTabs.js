import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export function AnimatedTabIndicator({ activeIndex, tabWidths, style }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    let offset = 0;
    for (let i = 0; i < activeIndex; i++) {
      offset += (tabWidths[i] || 60) + 8;
    }
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: offset,
        useNativeDriver: false,
        speed: 40,
        bounciness: 6,
      }),
      Animated.spring(width, {
        toValue: tabWidths[activeIndex] || 60,
        useNativeDriver: false,
        speed: 40,
        bounciness: 6,
      }),
    ]).start();
  }, [activeIndex, tabWidths]);

  return (
    <Animated.View
      style={[
        styles.indicator,
        style,
        {
          transform: [{ translateX }],
          width,
        },
      ]}
    />
  );
}

export function AnimatedColorTransition({ isActive, activeColor, inactiveColor, children, style }) {
  const bgColor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(bgColor, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: false,
      speed: 40,
      bounciness: 4,
    }).start();
  }, [isActive]);

  const backgroundColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <Animated.View style={[style, { backgroundColor }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#3b82f6',
  },
});
