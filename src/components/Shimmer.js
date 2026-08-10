import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export function Shimmer({ width = '100%', height = 20, borderRadius = 8, style }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#e2e8f0', opacity },
        style,
      ]}
    />
  );
}

export function CalendarSkeleton() {
  return (
    <View style={skelStyles.calGrid}>
      {Array.from({ length: 35 }).map((_, i) => (
        <View key={i} style={skelStyles.calCell}>
          <Shimmer width={20} height={20} borderRadius={10} />
          {i % 5 === 0 && <Shimmer width={30} height={8} borderRadius={4} style={{ marginTop: 4 }} />}
        </View>
      ))}
    </View>
  );
}

export function ChapterListSkeleton() {
  return (
    <View style={skelStyles.listContainer}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={skelStyles.listRow}>
          <Shimmer width={8} height={8} borderRadius={4} />
          <Shimmer width={24} height={14} borderRadius={4} />
          <View style={skelStyles.listContent}>
            <Shimmer width="70%" height={14} borderRadius={4} />
            <Shimmer width="40%" height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ChatSkeleton() {
  return (
    <View style={skelStyles.chatContainer}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={[skelStyles.chatBubble, i % 2 === 0 ? skelStyles.chatBubbleLeft : skelStyles.chatBubbleRight]}>
          <Shimmer width={i % 2 === 0 ? '70%' : '50%'} height={16} borderRadius={12} />
          <Shimmer width={i % 2 === 0 ? '50%' : '30%'} height={16} borderRadius={12} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

const skelStyles = StyleSheet.create({
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
  },
  listContainer: { paddingHorizontal: 16 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    marginBottom: 4,
    borderRadius: 10,
    gap: 10,
  },
  listContent: { flex: 1 },
  chatContainer: { padding: 16 },
  chatBubble: { marginBottom: 12, maxWidth: '80%' },
  chatBubbleLeft: { alignSelf: 'flex-start' },
  chatBubbleRight: { alignSelf: 'flex-end' },
});
