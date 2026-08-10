import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Alert, TextInput, Switch,
} from 'react-native';
import { useClerk, useUser } from '@clerk/clerk-expo';
import { ScalePressable } from '../components/AnimatedPressable';
import { db } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function AccountScreen() {
  const { signOut, user } = useClerk();
  const { isDark, toggleTheme } = useTheme();
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.firstName || '');

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const [subjs, chaps, sched] = await Promise.all([
        db.getSubjects(),
        db.getChapters(),
        db.getSchedule(),
      ]);
      setSubjects(subjs || []);
      setChapters(chaps || []);
      setSchedule(sched || []);
    } catch (e) { console.log(e); }
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    try {
      await user?.update({ firstName: trimmed });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log(e);
    }
    setEditingName(false);
  }

  function handleSignOut() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  function handleResetOnboarding() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Reset Onboarding',
      'This will restart the onboarding process. Your data will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          await db.updateProfile?.({ onboarding_complete: false });
          Alert.alert('Done', 'Please restart the app.');
        }},
      ]
    );
  }

  const totalScheduled = schedule.length;
  const uniqueDates = [...new Set(schedule.map(s => s.date_key))].length;
  const th = isDark ? dark : light;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: th.bg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={[s.avatarLarge, { backgroundColor: th.primary }]}>
            <Text style={s.avatarText}>{user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          {editingName ? (
            <View style={s.nameEditRow}>
              <TextInput
                style={[s.nameInput, { borderColor: th.primary, color: th.text, backgroundColor: th.input }]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                onSubmitEditing={saveName}
              />
              <ScalePressable style={[s.nameSaveBtn, { backgroundColor: th.primary }]} onPress={saveName}>
                <Text style={s.nameSaveBtnText}>Save</Text>
              </ScalePressable>
            </View>
          ) : (
            <ScalePressable onPress={() => setEditingName(true)}>
              <Text style={[s.userName, { color: th.text }]}>{user?.firstName || 'Student'} ✏️</Text>
            </ScalePressable>
          )}
          <Text style={[s.userEmail, { color: th.textMuted }]}>{user?.emailAddresses?.[0]?.emailAddress || ''}</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { num: subjects.length, label: 'Subjects' },
            { num: chapters.length, label: 'Chapters' },
            { num: totalScheduled, label: 'Scheduled' },
            { num: uniqueDates, label: 'Study Days' },
          ].map((stat, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: th.card, shadowColor: th.shadow }]}>
              <Text style={[s.statNum, { color: th.primary }]}>{stat.num}</Text>
              <Text style={[s.statLabel, { color: th.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: th.textMuted }]}>SETTINGS</Text>
          <View style={[s.settingRow, { backgroundColor: th.card }]}>
            <Text style={[s.settingLabel, { color: th.text }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              trackColor={{ false: '#e2e8f0', true: th.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Subjects */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: th.textMuted }]}>SUBJECTS ({subjects.length})</Text>
          {subjects.map((subj, i) => {
            const chapCount = chapters.filter(c => c.subject_id === subj.id).length;
            return (
              <View key={subj.id || i} style={[s.listItem, { backgroundColor: th.card }]}>
                <View style={[s.listDot, { backgroundColor: subj.color || th.primary }]} />
                <Text style={[s.listItemText, { color: th.text }]}>{subj.name}</Text>
                <Text style={[s.listItemMeta, { color: th.textMuted }]}>{chapCount} ch</Text>
              </View>
            );
          })}
          {subjects.length === 0 && <Text style={[s.emptyText, { color: th.textMuted }]}>No subjects yet</Text>}
        </View>

        {/* Actions */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: th.textMuted }]}>QUICK ACTIONS</Text>
          <ScalePressable style={[s.actionBtn, { backgroundColor: th.card }]} onPress={handleResetOnboarding}>
            <Text style={[s.actionBtnText, { color: th.text }]}>🔄 Reset Onboarding</Text>
            <Text style={[s.actionBtnDesc, { color: th.textMuted }]}>Retake the subject/chapter setup</Text>
          </ScalePressable>
          <ScalePressable style={[s.actionBtn, { backgroundColor: th.dangerBg }]} onPress={handleSignOut}>
            <Text style={[s.actionBtnText, { color: th.danger }]}>🚪 Sign Out</Text>
            <Text style={[s.actionBtnDesc, { color: th.textMuted }]}>Sign out of your account</Text>
          </ScalePressable>
        </View>

        <Text style={[s.version, { color: th.textMuted }]}>The Comeback v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const light = { primary: '#3b82f6', text: '#0f172a', textMuted: '#94a3b8', bg: '#fafbfc', card: '#ffffff', input: '#f8fafc', shadow: '#000', danger: '#dc2626', dangerBg: '#fef2f2' };
const dark = { primary: '#60a5fa', text: '#f1f5f9', textMuted: '#64748b', bg: '#0f172a', card: '#1e293b', input: '#1e293b', shadow: '#000', danger: '#f87171', dangerBg: '#3b1111' };

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafbfc' },
  scroll: { paddingBottom: 40 },

  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  avatarLarge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  userEmail: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  nameInput: {
    fontSize: 18, fontWeight: '700', borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 180,
  },
  nameSaveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  nameSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#3b82f6' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginTop: 4 },

  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
  },
  listDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  listItemText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  listItemMeta: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },

  actionBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  actionBtnDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  emptyText: { fontSize: 13, color: '#cbd5e1', textAlign: 'center', paddingVertical: 12 },

  version: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 20,
  },
});
