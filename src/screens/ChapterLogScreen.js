import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { SUBJECT_COLORS } from '../data/chapters';
import { db } from '../lib/supabase';

export default function ChapterLogScreen() {
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

  function getSubjectColor(subj) {
    if (subj.color) return { bg: subj.color + '30', fg: subj.color, dot: subj.color };
    return SUBJECT_COLORS[subj.name] || { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8' };
  }

  function getChaptersForActive() {
    return (chaptersMap[activeSubjectId] || []).sort((a, b) => a.position - b.position);
  }

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const activeChapters = getChaptersForActive();
  const sc = activeSubject ? getSubjectColor(activeSubject) : { dot: '#94a3b8', fg: '#475569' };

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
        setChaptersMap(prev => ({
          ...prev,
          [activeSubjectId]: (prev[activeSubjectId] || []).filter(c => c.id !== id),
        }));
      }},
    ]);
  }

  if (subjects.length === 0 && !loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>📖 Chapter Log</Text>
          <Text style={s.subtitle}>No subjects yet</Text>
        </View>
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No subjects found</Text>
          <Text style={s.emptyDesc}>Complete the onboarding to add subjects and chapters.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>📖 Chapter Log</Text>
        <Text style={s.subtitle}>Master list of all chapters</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
        {subjects.map(subj => {
          const c = getSubjectColor(subj);
          const isActive = subj.id === activeSubjectId;
          return (
            <TouchableOpacity
              key={subj.id}
              style={[s.tab, isActive && { backgroundColor: c.dot }]}
              onPress={() => setActiveSubjectId(subj.id)}
            >
              <Text style={[s.tabText, isActive && { color: '#fff' }]}>{subj.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeSubject && (
        <TouchableOpacity style={[s.addBtn, { backgroundColor: sc.dot }]} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add Chapter</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {activeChapters.map((ch, i) => {
          const dates = schedule[activeSubject?.name]?.[ch.name] || [];
          return (
            <View key={ch.id} style={[s.row, i % 2 === 1 && s.rowAlt]}>
              <View style={[s.rowDot, { backgroundColor: sc.dot }]} />
              <View style={s.rowNum}>
                <Text style={[s.rowNumText, { color: sc.fg }]}>{i + 1}</Text>
              </View>
              <View style={s.rowContent}>
                <Text style={[s.rowText, { color: sc.fg }]}>{ch.name}</Text>
                {dates.length > 0 ? (
                  <Text style={s.rowDates}>✓ {dates.sort().join(', ')}</Text>
                ) : (
                  <Text style={s.rowUnscheduled}>Not scheduled</Text>
                )}
              </View>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => { setEditChapterId(ch.id); setEditChapter(ch.name); setShowEdit(true); }}
              >
                <Text style={s.editBtnText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => doDelete(ch.id, ch.name)}>
                <Text style={s.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        {activeChapters.length === 0 && (
          <Text style={s.emptyText}>No chapters yet. Tap + Add Chapter.</Text>
        )}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Chapter</Text>
            <Text style={s.modalSub}>{activeSubject?.name}</Text>
            <TextInput
              style={s.input}
              placeholder="Chapter name"
              placeholderTextColor="#94a3b8"
              value={newChapter}
              onChangeText={setNewChapter}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doAdd} style={[s.confirmBtn, { backgroundColor: sc.dot }]}>
                <Text style={s.confirmBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEdit} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Edit Chapter</Text>
            <TextInput
              style={s.input}
              placeholder="Chapter name"
              placeholderTextColor="#94a3b8"
              value={editChapter}
              onChangeText={setEditChapter}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity onPress={() => setShowEdit(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doEdit} style={[s.confirmBtn, { backgroundColor: sc.dot }]}>
                <Text style={s.confirmBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  tabBar: { paddingHorizontal: 16, maxHeight: 48 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  addBtn: { marginHorizontal: 16, marginTop: 10, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  rowAlt: { backgroundColor: '#fafbfc' },
  rowDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  rowNum: { width: 24, alignItems: 'center', marginRight: 8 },
  rowNumText: { fontSize: 13, fontWeight: '700' },
  rowContent: { flex: 1 },
  rowText: { fontSize: 14, fontWeight: '600' },
  rowDates: { fontSize: 11, color: '#16a346', marginTop: 2 },
  rowUnscheduled: { fontSize: 11, color: '#cbd5e1', marginTop: 2 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  editBtnText: { fontSize: 16 },
  delBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  delBtnText: { fontSize: 14, color: '#ef4444', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 13, color: '#94a3b8', marginTop: 2, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', marginBottom: 8 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  cancelBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  confirmBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  emptyText: { fontSize: 13, color: '#cbd5e1', textAlign: 'center', marginTop: 24 },
});
