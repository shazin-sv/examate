import React, { useCallback } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ScalePressable({ children, onPress, style, scaleTo = 0.96, disabled }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale, scaleTo]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={[{ transform: [{ scale }] }, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function FadeScalePressable({ children, onPress, style, scaleTo = 0.97, disabled }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(opacity, { toValue: 0.8, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity, scaleTo]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={[{ transform: [{ scale }], opacity }, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function GlowPressable({ children, onPress, style, glowColor = '#b5b5b5', disabled }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const glowOpacity = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 5 }),
      Animated.timing(glowOpacity, { toValue: 0.4, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [scale, glowOpacity]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 5 }),
      Animated.timing(glowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [scale, glowOpacity]);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={[style, { transform: [{ scale }] }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: glowColor, opacity: glowOpacity, borderRadius: style.borderRadius || 0 }]} pointerEvents="none" />
      {children}
    </AnimatedPressable>
  );
}
