import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Alert, TextInput, Platform,
} from 'react-native';
import { ScalePressable } from '../components/AnimatedPressable';
import { db, auth, supabase, profile } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  scheduleDailyReminder,
  cancelAllReminders,
  getScheduledReminders,
  requestNotificationPermission,
} from '../lib/notifications';

export default function AccountScreen() {
  const { theme } = useTheme();
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [dailyReminder, setDailyReminder] = useState(false);
  const [reminderHour, setReminderHour] = useState('09');
  const [reminderMinute, setReminderMinute] = useState('00');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    loadUser();
    loadStats();
    loadNotificationSettings();
  }, []);

  async function loadUser() {
    const u = await auth.getUser();
    setUser(u);
    setNameInput(u?.user_metadata?.display_name || '');
  }

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

  async function loadNotificationSettings() {
    if (Platform.OS === 'web') return;
    try {
      const reminders = await getScheduledReminders();
      setNotificationCount(reminders.length);
      const hasDaily = reminders.some(r => r.content?.title === 'Time to study');
      setDailyReminder(hasDaily);
      if (hasDaily) {
        const daily = reminders.find(r => r.content?.title === 'Time to study');
        if (daily?.trigger) {
          setReminderHour(String(daily.trigger.hour || 9).padStart(2, '0'));
          setReminderMinute(String(daily.trigger.minute || 0).padStart(2, '0'));
        }
      }
    } catch (e) { console.log(e); }
  }

  async function toggleDailyReminder() {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Notifications are not available on web');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (dailyReminder) {
      await cancelAllReminders();
      setDailyReminder(false);
      setNotificationCount(0);
      Alert.alert('Off', 'Daily reminder disabled');
    } else {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Permission needed', 'Enable notifications in your device settings');
        return;
      }
      const hour = parseInt(reminderHour) || 9;
      const minute = parseInt(reminderMinute) || 0;
      await scheduleDailyReminder(hour, minute);
      setDailyReminder(true);
      setNotificationCount(1);
      Alert.alert('On', `Daily reminder set for ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }

  async function updateReminderTime() {
    if (Platform.OS === 'web' || !dailyReminder) return;
    const hour = parseInt(reminderHour) || 9;
    const minute = parseInt(reminderMinute) || 0;
    await scheduleDailyReminder(hour, minute);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    try {
      await supabase.auth.updateUser({ data: { display_name: trimmed } });
      await profile?.update?.({ display_name: trimmed });
      setUser({ ...user, user_metadata: { ...user?.user_metadata, display_name: trimmed } });
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
      { text: 'Sign Out', style: 'destructive', onPress: () => auth.signOut() },
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

  const displayName = user?.user_metadata?.display_name || 'Student';
  const email = user?.email || '';
  const initial = displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || '?';

  const totalScheduled = schedule.length;
  const uniqueDates = [...new Set(schedule.map(s => s.date_key))].length;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={[s.avatarLarge, { backgroundColor: theme.text }]}>
            <Text style={[s.avatarText, { color: theme.bg }]}>{initial}</Text>
          </View>
          {editingName ? (
            <View style={s.nameEditRow}>
              <TextInput
                style={[s.nameInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.input }]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                onSubmitEditing={saveName}
              />
              <ScalePressable style={[s.nameSaveBtn, { backgroundColor: theme.text }]} onPress={saveName}>
                <Text style={[s.nameSaveBtnText, { color: theme.bg }]}>Save</Text>
              </ScalePressable>
            </View>
          ) : (
            <ScalePressable onPress={() => setEditingName(true)}>
              <Text style={[s.userName, { color: theme.text }]}>{displayName}</Text>
            </ScalePressable>
          )}
          <Text style={[s.userEmail, { color: theme.textMuted }]}>{email}</Text>
        </View>

        <View style={s.statsRow}>
          {[
            { num: subjects.length, label: 'Subjects' },
            { num: chapters.length, label: 'Chapters' },
            { num: totalScheduled, label: 'Scheduled' },
            { num: uniqueDates, label: 'Study Days' },
          ].map((stat, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: theme.card }]}>
              <Text style={[s.statNum, { color: theme.text }]}>{stat.num}</Text>
              <Text style={[s.statLabel, { color: theme.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.textMuted }]}>SUBJECTS ({subjects.length})</Text>
          {subjects.map((subj, i) => {
            const chapCount = chapters.filter(c => c.subject_id === subj.id).length;
            return (
              <View key={subj.id || i} style={[s.listItem, { backgroundColor: theme.card }]}>
                <View style={[s.listDot, { backgroundColor: theme.border }]} />
                <Text style={[s.listItemText, { color: theme.text }]}>{subj.name}</Text>
                <Text style={[s.listItemMeta, { color: theme.textMuted }]}>{chapCount} ch</Text>
              </View>
            );
          })}
          {subjects.length === 0 && <Text style={[s.emptyText, { color: theme.textMuted }]}>No subjects yet</Text>}
        </View>

        {Platform.OS !== 'web' && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.textMuted }]}>NOTIFICATIONS</Text>
            <ScalePressable
              style={[s.actionBtn, { backgroundColor: theme.card }]}
              onPress={toggleDailyReminder}
            >
              <View style={s.toggleRow}>
                <View style={s.toggleLeft}>
                  <Text style={[s.actionBtnText, { color: theme.text }]}>Daily Study Reminder</Text>
                  <Text style={[s.actionBtnDesc, { color: theme.textMuted }]}>
                    {dailyReminder ? 'Enabled' : 'Tap to enable'}
                  </Text>
                </View>
                <View style={[s.toggle, dailyReminder && { backgroundColor: theme.text }]}>
                  <View style={[s.toggleKnob, dailyReminder && { alignSelf: 'flex-end' }]} />
                </View>
              </View>
            </ScalePressable>
            {dailyReminder && (
              <View style={[s.timePickerRow, { backgroundColor: theme.card }]}>
                <Text style={[s.timeLabel, { color: theme.textSecondary }]}>Reminder time</Text>
                <View style={s.timeInputs}>
                  <TextInput
                    style={[s.timeInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.input }]}
                    value={reminderHour}
                    onChangeText={(t) => { setReminderHour(t); }}
                    onBlur={updateReminderTime}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="09"
                    placeholderTextColor={theme.textMuted}
                  />
                  <Text style={[s.timeSep, { color: theme.text }]}>:</Text>
                  <TextInput
                    style={[s.timeInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.input }]}
                    value={reminderMinute}
                    onChangeText={(t) => { setReminderMinute(t); }}
                    onBlur={updateReminderTime}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>
            )}
            {notificationCount > 0 && (
              <Text style={[s.notificationInfo, { color: theme.textMuted }]}>
                {notificationCount} notification{notificationCount > 1 ? 's' : ''} scheduled
              </Text>
            )}
          </View>
        )}

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.textMuted }]}>QUICK ACTIONS</Text>
          <ScalePressable style={[s.actionBtn, { backgroundColor: theme.card }]} onPress={handleResetOnboarding}>
            <Text style={[s.actionBtnText, { color: theme.text }]}>Reset Onboarding</Text>
            <Text style={[s.actionBtnDesc, { color: theme.textMuted }]}>Retake the subject/chapter setup</Text>
          </ScalePressable>
          <ScalePressable style={[s.actionBtn, { backgroundColor: theme.cardAlt }]} onPress={handleSignOut}>
            <Text style={[s.actionBtnText, { color: theme.text }]}>Sign Out</Text>
            <Text style={[s.actionBtnDesc, { color: theme.textMuted }]}>Sign out of your account</Text>
          </ScalePressable>
        </View>

        <Text style={[s.version, { color: theme.textMuted }]}>The Comeback v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },

  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  avatarLarge: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800' },
  userName: { fontSize: 22, fontWeight: '800', marginTop: 12 },
  userEmail: { fontSize: 14, marginTop: 2 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  nameInput: {
    fontSize: 18, fontWeight: '700', borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 180,
  },
  nameSaveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  nameSaveBtnText: { fontSize: 13, fontWeight: '700' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  listItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 14, marginBottom: 4 },
  listDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  listItemText: { flex: 1, fontSize: 14, fontWeight: '600' },
  listItemMeta: { fontSize: 12, fontWeight: '600' },

  actionBtn: { borderRadius: 12, padding: 16, marginBottom: 8 },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  actionBtnDesc: { fontSize: 12, marginTop: 2 },

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLeft: { flex: 1 },
  toggle: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: '#b5b5b5',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignSelf: 'flex-start' },
  timePickerRow: { borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeLabel: { fontSize: 13, fontWeight: '600' },
  timeInputs: { flexDirection: 'row', alignItems: 'center' },
  timeInput: { width: 40, height: 32, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  timeSep: { fontSize: 16, fontWeight: '700', marginHorizontal: 4 },
  notificationInfo: { fontSize: 11, marginTop: 4, textAlign: 'center' },

  version: { fontSize: 12, textAlign: 'center', marginTop: 20 },
});
