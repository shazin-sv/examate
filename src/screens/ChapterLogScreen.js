import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { CHAPTERS, SUBJECT_COLORS } from '../data/chapters';
import { db } from '../lib/supabase';

const ALL_SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'MATHS', 'COMPUTER SCIENCE', 'ENGLISH', 'HINDI'];

export default function ChapterLogScreen() {
  const [activeTab, setActiveTab] = useState('PHYSICS');
  const [customChapters, setCustomChapters] = useState({});
  const [schedule, setSchedule] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newChapter, setNewChapter] = useState('');
  const [editChapter, setEditChapter] = useState('');
  const [editOldName, setEditOldName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [customRes, schedRes] = await Promise.all([
        db.getCustomChapters(),
        db.getSchedule(),
      ]);

      const customMap = {};
      (customRes || []).forEach(row => {
        if (!customMap[row.subject]) customMap[row.subject] = [];
        customMap[row.subject].push({ name: row.chapter_name, id: row.id });
      });
      setCustomChapters(customMap);

      const schedMap = {};
      (schedRes || []).forEach(row => {
        if (!schedMap[row.subject]) schedMap[row.subject] = {};
        if (!schedMap[row.subject][row.chapter_name]) schedMap[row.subject][row.chapter_name] = [];
        schedMap[row.subject][row.chapter_name].push(row.date_key);
      });
      setSchedule(schedMap);
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  }

  function getAllChapters(subj) {
    return [...(CHAPTERS[subj] || []), ...(customChapters[subj] || []).map(c => c.name)];
  }

  // ── ADD CHAPTER ──
  async function doAdd() {
    const name = newChapter.trim();
    if (!name) return;
    const all = getAllChapters(activeTab);
    if (all.includes(name)) {
      Alert.alert('Exists', `"${name}" already exists.`);
      return;
    }
    const data = await db.addCustomChapter({ subject: activeTab, chapter_name: name });
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.id) {
      setCustomChapters(prev => ({
        ...prev,
        [activeTab]: [...(prev[activeTab] || []), { name, id: row.id }],
      }));
    }
    setNewChapter('');
    setShowAdd(false);
  }

  // ── EDIT CHAPTER ──
  async function doEdit() {
    const newName = editChapter.trim();
    if (!newName || newName === editOldName) { setShowEdit(false); return; }

    const custom = customChapters[activeTab] || [];
    const found = custom.find(c => c.name === editOldName);
    if (found) {
      await db.updateCustomChapter(found.id, newName);
    }
    // Update schedule entries
    const schedForSubj = schedule[activeTab] || {};
    if (schedForSubj[editOldName]) {
      const dates = schedForSubj[editOldName];
      for (const dk of dates) {
        const items = await db.getSchedule(); // re-fetch to find and update
      }
    }

    setCustomChapters(prev => {
      const updated = { ...prev };
      if (updated[activeTab]) {
        updated[activeTab] = updated[activeTab].map(c =>
          c.name === editOldName ? { ...c, name: newName } : c
        );
      }
      return updated;
    });
    setSchedule(prev => {
      const updated = { ...prev };
      if (updated[activeTab] && updated[activeTab][editOldName]) {
        updated[activeTab][newName] = updated[activeTab][editOldName];
        delete updated[activeTab][editOldName];
      }
      return updated;
    });
    setShowEdit(false);
  }

  // ── DELETE CHAPTER ──
  async function doDelete(name) {
    Alert.alert('Delete', `Delete "${name}"?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const custom = customChapters[activeTab] || [];
        const found = custom.find(c => c.name === name);
        if (found) {
          await db.deleteCustomChapter(found.id);
        }
        setCustomChapters(prev => ({
          ...prev,
          [activeTab]: (prev[activeTab] || []).filter(c => c.name !== name),
        }));
        setSchedule(prev => {
          const updated = { ...prev };
          if (updated[activeTab]) {
            delete updated[activeTab][name];
          }
          return updated;
        });
      }},
    ]);
  }

  const chapters = getAllChapters(activeTab);
  const sc = SUBJECT_COLORS[activeTab];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>📖 Chapter Log</Text>
        <Text style={s.subtitle}>Master list of all chapters</Text>
      </View>

      {/* Subject Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
        {ALL_SUBJECTS.map(subj => {
          const c = SUBJECT_COLORS[subj];
          const isActive = subj === activeTab;
          return (
            <TouchableOpacity
              key={subj}
              style={[s.tab, isActive && { backgroundColor: c.dot }]}
              onPress={() => setActiveTab(subj)}
            >
              <Text style={[s.tabText, isActive && { color: '#fff' }]}>{subj}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={[s.addBtn, { backgroundColor: sc.dot }]} onPress={() => setShowAdd(true)}>
        <Text style={s.addBtnText}>+ Add Chapter</Text>
      </TouchableOpacity>

      {/* Chapter List */}
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {chapters.map((ch, i) => {
          const dates = schedule[activeTab]?.[ch] || [];
          const isCustom = !(CHAPTERS[activeTab] || []).includes(ch);
          return (
            <View key={ch} style={[s.row, i % 2 === 1 && s.rowAlt]}>
              <View style={[s.rowDot, { backgroundColor: sc.dot }]} />
              <View style={s.rowContent}>
                <Text style={[s.rowText, { color: sc.fg }]}>{ch}</Text>
                {dates.length > 0 ? (
                  <Text style={s.rowDates}>✓ {dates.sort().join(', ')}</Text>
                ) : (
                  <Text style={s.rowUnscheduled}>Not scheduled</Text>
                )}
              </View>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => { setEditOldName(ch); setEditChapter(ch); setShowEdit(true); }}
              >
                <Text style={s.editBtnText}>✏️</Text>
              </TouchableOpacity>
              {isCustom && (
                <TouchableOpacity style={s.delBtn} onPress={() => doDelete(ch)}>
                  <Text style={s.delBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ── ADD MODAL ── */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Chapter</Text>
            <Text style={s.modalSub}>{activeTab}</Text>
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

      {/* ── EDIT MODAL ── */}
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
  rowDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
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
});
