import React, { useRef } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const SWIPE_WIDTH = 160;

export default function SwipeableRow({ children, onDelete, onEdit }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  function open() {
    isOpen.current = true;
    Animated.spring(translateX, { toValue: -SWIPE_WIDTH, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  function close() {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  return (
    <View style={s.container}>
      <View style={s.actionsContainer} style={{ width: SWIPE_WIDTH, flexDirection: 'row' }}>
        {onEdit && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[s.action, s.editAction]}
            onPress={() => { close(); onEdit(); }}
          >
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[s.action, s.deleteAction]}
            onPress={() => { close(); onDelete(); }}
          >
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
      <Animated.View
        style={[s.contentContainer, { transform: [{ translateX }], width: '100%' }]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => { if (isOpen.current) close(); }}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
      <View style={s.swipeHints}>
        <TouchableOpacity style={s.hintBtn} onPress={open}>
          <Text style={s.hintText}>← Swipe</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 4, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  action: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAction: { backgroundColor: '#808080' },
  deleteAction: { backgroundColor: '#545454' },
  editText: { color: '#f0f0f0', fontWeight: '700', fontSize: 13 },
  deleteText: { color: '#f0f0f0', fontWeight: '700', fontSize: 13 },
  contentContainer: { backgroundColor: '#ffffff' },
  swipeHints: {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 0,
  },
  hintBtn: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hintText: { fontSize: 9, color: '#b5b5b5', fontWeight: '600' },
});
