import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, SafeAreaView, Alert, Animated, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SUBJECT_COLORS } from '../data/chapters';
import { db } from '../lib/supabase';
import { ScalePressable, FadeScalePressable } from '../components/AnimatedPressable';
import AnimatedBottomSheet from '../components/AnimatedBottomSheet';
import { ChapterListSkeleton } from '../components/Shimmer';
import { useTheme } from '../context/ThemeContext';

export default function ChapterLogScreen() {
  const { theme } = useTheme();
  const [subjects, setSubjects] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [schedule, setSchedule] = useState({});
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newChapter, setNewChapter] = useState('');
  const [editChapter, setEditChapter] = useState('');
  const [editChapterId, setEditChapterId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [subjs, chaps, schedRes] = await Promise.all([
        db.getSubjects(),
        db.getChapters(),
        db.getSchedule(),
      ]);

      const sorted = (subjs || []).sort((a, b) => a.position - b.position);
      setSubjects(sorted);

      const chapsMap = {};
      (chaps || []).forEach(c => {
        if (!chapsMap[c.subject_id]) chapsMap[c.subject_id] = [];
        chapsMap[c.subject_id].push(c);
      });
      setChaptersMap(chapsMap);

      const schedMap = {};
      (schedRes || []).forEach(row => {
        if (!schedMap[row.subject]) schedMap[row.subject] = {};
        if (!schedMap[row.subject][row.chapter_name]) schedMap[row.subject][row.chapter_name] = [];
        schedMap[row.subject][row.chapter_name].push(row.date_key);
      });
      setSchedule(schedMap);

      if (sorted.length > 0 && !activeSubjectId) {
        setActiveSubjectId(sorted[0].id);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function getSubjectColor(subj) {
    if (subj.color) return { bg: subj.color + '18', fg: subj.color, dot: subj.color, light: subj.color + '30' };
    return SUBJECT_COLORS[subj.name] || { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8', light: '#f1f5f9' };
  }

  function getChaptersForActive() {
    return (chaptersMap[activeSubjectId] || []).sort((a, b) => a.position - b.position);
  }

  function getSubjectProgress(subj) {
    const chaps = chaptersMap[subj.id] || [];
    const schedForSubj = schedule[subj.name] || {};
    const scheduledCount = Object.keys(schedForSubj).length;
    return { total: chaps.length, scheduled: scheduledCount };
  }

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const activeChapters = getChaptersForActive();
  const sc = activeSubject ? getSubjectColor(activeSubject) : { dot: '#94a3b8', fg: '#475569', light: '#f1f5f9' };

  async function doAdd() {
    const name = newChapter.trim();
    if (!name) return;
    const existing = activeChapters.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      Alert.alert('Exists', `"${name}" already exists.`);
      return;
    }
    const data = await db.addChapter({
      subject_id: activeSubjectId,
      name,
      position: activeChapters.length,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setChaptersMap(prev => ({
        ...prev,
        [activeSubjectId]: [...(prev[activeSubjectId] || []), row],
      }));
    }
    setNewChapter('');
    setShowAdd(false);
  }

  async function doEdit() {
    const newName = editChapter.trim();
    if (!newName) { setShowEdit(false); return; }
    await db.updateChapter(editChapterId, { name: newName });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setChaptersMap(prev => {
      const updated = { ...prev };
      if (updated[activeSubjectId]) {
        updated[activeSubjectId] = updated[activeSubjectId].map(c =>
          c.id === editChapterId ? { ...c, name: newName } : c
        );
      }
      return updated;
    });
    setShowEdit(false);
  }

  async function doDelete(id, name) {
    Alert.alert('Delete', `Delete "${name}"?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await db.deleteChapter(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setChaptersMap(prev => ({
          ...prev,
          [activeSubjectId]: (prev[activeSubjectId] || []).filter(c => c.id !== id),
        }));
      }},
    ]);
  }

  if (subjects.length === 0 && !loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
        <View style={s.header}>
          <Text style={[s.title, { color: theme.text }]}>Chapters</Text>
          <Text style={[s.subtitle, { color: theme.textMuted }]}>No subjects yet</Text>
        </View>
        <View style={s.emptyState}>
          <Text style={s.emptyStateEmoji}>📚</Text>
          <Text style={[s.emptyTitle, { color: theme.text }]}>No subjects found</Text>
          <Text style={[s.emptyDesc, { color: theme.textMuted }]}>Complete onboarding to add subjects and chapters.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>Chapters</Text>
        <Text style={[s.subtitle, { color: theme.textMuted }]}>{activeChapters.length} chapters in {activeSubject?.name || '...'}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {subjects.map(subj => {
          const c = getSubjectColor(subj);
          const isActive = subj.id === activeSubjectId;
          const progress = getSubjectProgress(subj);
          return (
            <ScalePressable
              key={subj.id}
              style={[s.tab, isActive && { backgroundColor: c.dot }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveSubjectId(subj.id);
              }}
            >
              <Text style={[s.tabText, isActive && { color: '#fff' }]}>{subj.name}</Text>
              {progress.total > 0 && (
                <View style={[s.tabProgress, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : c.light }]}>
                  <View style={[s.tabProgressFill, { width: `${(progress.scheduled / progress.total) * 100}%`, backgroundColor: isActive ? '#fff' : c.dot }]} />
                </View>
              )}
            </ScalePressable>
          );
        })}
      </ScrollView>

      {activeSubject && (
        <ScalePressable style={[s.addBtn, { backgroundColor: sc.dot }]} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add Chapter</Text>
        </ScalePressable>
      )}

      {loading ? (
        <ChapterListSkeleton />
      ) : (
        <ScrollView
          style={s.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {activeChapters.map((ch, i) => {
            const dates = schedule[activeSubject?.name]?.[ch.name] || [];
            const isScheduled = dates.length > 0;
            return (
              <FadeScalePressable key={ch.id} style={[s.row, i % 2 === 1 && { backgroundColor: theme.cardAlt }]}>
                <View style={[s.rowDot, { backgroundColor: isScheduled ? '#22c55e' : sc.dot }]} />
                <View style={s.rowNum}>
                  <Text style={[s.rowNumText, { color: sc.fg }]}>{i + 1}</Text>
                </View>
                <View style={s.rowContent}>
                  <Text style={[s.rowText, { color: theme.text }]}>{ch.name}</Text>
                  {isScheduled ? (
                    <Text style={[s.rowDates, { color: '#16a346' }]}>✓ {dates.sort().join(', ')}</Text>
                  ) : (
                    <Text style={[s.rowUnscheduled, { color: theme.textMuted }]}>Not scheduled</Text>
                  )}
                </View>
                <ScalePressable
                  style={s.editBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditChapterId(ch.id);
                    setEditChapter(ch.name);
                    setShowEdit(true);
                  }}
                >
                  <Text style={s.editBtnText}>✏️</Text>
                </ScalePressable>
                <ScalePressable style={s.delBtn} onPress={() => doDelete(ch.id, ch.name)}>
                  <Text style={s.delBtnText}>✕</Text>
                </ScalePressable>
              </FadeScalePressable>
            );
          })}
          {activeChapters.length === 0 && (
            <View style={[s.emptyChapters, { backgroundColor: theme.card }]}>
              <Text style={[s.emptyChaptersText, { color: theme.textSecondary }]}>No chapters yet</Text>
              <Text style={[s.emptyChaptersSubtext, { color: theme.textMuted }]}>Tap + Add Chapter to get started</Text>
            </View>
          )}
        </ScrollView>
      )}

      <AnimatedBottomSheet visible={showAdd} onClose={() => setShowAdd(false)} height="50%">
        <View style={s.modalContent}>
          <Text style={[s.modalTitle, { color: theme.text }]}>Add Chapter</Text>
          <Text style={[s.modalSub, { color: theme.textMuted }]}>{activeSubject?.name}</Text>
          <TextInput
            style={[s.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.input }]}
            placeholder="Chapter name"
            placeholderTextColor={theme.textMuted}
            value={newChapter}
            onChangeText={setNewChapter}
            autoFocus
          />
          <View style={s.modalBtns}>
            <ScalePressable onPress={() => setShowAdd(false)} style={s.cancelBtn}>
              <Text style={[s.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </ScalePressable>
            <ScalePressable onPress={doAdd} style={[s.confirmBtn, { backgroundColor: sc.dot }]}>
              <Text style={s.confirmBtnText}>Add</Text>
            </ScalePressable>
          </View>
        </View>
      </AnimatedBottomSheet>

      <AnimatedBottomSheet visible={showEdit} onClose={() => setShowEdit(false)} height="50%">
        <View style={s.modalContent}>
          <Text style={[s.modalTitle, { color: theme.text }]}>Edit Chapter</Text>
          <TextInput
            style={[s.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.input }]}
            placeholder="Chapter name"
            placeholderTextColor={theme.textMuted}
            value={editChapter}
            onChangeText={setEditChapter}
            autoFocus
          />
          <View style={s.modalBtns}>
            <ScalePressable onPress={() => setShowEdit(false)} style={s.cancelBtn}>
              <Text style={[s.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </ScalePressable>
            <ScalePressable onPress={doEdit} style={[s.confirmBtn, { backgroundColor: sc.dot }]}>
              <Text style={s.confirmBtnText}>Save</Text>
            </ScalePressable>
          </View>
        </View>
      </AnimatedBottomSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafbfc' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  
  tabBar: { paddingHorizontal: 16, maxHeight: 60 },
  tabBarContent: { gap: 8, paddingVertical: 4 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 80,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: '#475569', textAlign: 'center' },
  tabProgress: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  tabProgressFill: {
    height: 3,
    borderRadius: 1.5,
  },
  
  addBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  
  list: { flex: 1, marginTop: 12 },
  listContent: { paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
    marginBottom: 4,
    borderRadius: 10,
  },
  rowDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  rowNum: { width: 28, alignItems: 'center', marginRight: 10 },
  rowNumText: { fontSize: 13, fontWeight: '700' },
  rowContent: { flex: 1 },
  rowText: { fontSize: 14, fontWeight: '600' },
  rowDates: { fontSize: 11, color: '#16a346', marginTop: 3 },
  rowUnscheduled: { fontSize: 11, color: '#cbd5e1', marginTop: 3 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  editBtnText: { fontSize: 16 },
  delBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fef2f2' },
  delBtnText: { fontSize: 14, color: '#ef4444', fontWeight: '700' },
  
  modalContent: { padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 14, color: '#94a3b8', marginTop: 2, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 12,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  cancelBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  confirmBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyStateEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  
  emptyChapters: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyChaptersText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  emptyChaptersSubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
});
