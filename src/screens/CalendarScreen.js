import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput,
  StyleSheet, SafeAreaView, Alert, Animated, Dimensions,
  RefreshControl, PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { formatDate, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from '../lib/dateUtils';
import { SUBJECT_COLORS } from '../data/chapters';
import { db } from '../lib/supabase';
import { ScalePressable, FadeScalePressable } from '../components/AnimatedPressable';
import AnimatedBottomSheet from '../components/AnimatedBottomSheet';
import { CalendarSkeleton } from '../components/Shimmer';
import { useTheme } from '../context/ThemeContext';

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAL_WIDTH = Math.min(SCREEN_WIDTH, 720);
const CELL_SIZE = CAL_WIDTH / 7;

export default function CalendarScreen() {
  const { theme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 7, 1));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [themes, setThemes] = useState({});
  const [revisions, setRevisions] = useState({});
  const [customChapters, setCustomChapters] = useState({});
  const [showAssign, setShowAssign] = useState(false);
  const [assignSubject, setAssignSubject] = useState('PHYSICS');
  const [assignChapter, setAssignChapter] = useState('');
  const [assignDate, setAssignDate] = useState(new Date());
  const [themeText, setThemeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const panelOrder = ['todayPlan', 'theme', 'topics', 'revisions'];
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});
  const [chaptersMap, setChaptersMap] = useState({});

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 50 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 60) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCurrentMonth(prev => subMonths(prev, 1));
        } else if (gestureState.dx < -60) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCurrentMonth(prev => addMonths(prev, 1));
        }
      },
    })
  ).current;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  useEffect(() => { loadAll(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  async function loadAll() {
    try {
      const [schedRes, themeRes, revRes, customRes, subjectsRes, chaptersRes] = await Promise.all([
        db.getSchedule(), db.getThemes(), db.getRevisions(), db.getCustomChapters(),
        db.getSubjects(), db.getChapters(),
      ]);

      const schedMap = {};
      (schedRes || []).forEach(row => {
        if (!schedMap[row.date_key]) schedMap[row.date_key] = [];
        schedMap[row.date_key].push({ subject: row.subject, name: row.chapter_name, id: row.id });
      });

      const themeMap = {};
      (themeRes || []).forEach(row => { themeMap[row.date_key] = row.theme_text; });

      const revMap = {};
      (revRes || []).forEach(row => { revMap[row.tag] = { rev1: row.rev1, rev4: row.rev4, rev7: row.rev7 }; });

      const customMap = {};
      (customRes || []).forEach(row => {
        if (!customMap[row.subject]) customMap[row.subject] = [];
        customMap[row.subject].push(row.chapter_name);
      });

      const subjs = (subjectsRes || []).sort((a, b) => a.position - b.position);
      const subjsMap = {};
      subjs.forEach(s => { subjsMap[s.id] = s; });

      const chapsMap = {};
      (chaptersRes || []).forEach(c => {
        if (!chapsMap[c.subject_id]) chapsMap[c.subject_id] = [];
        chapsMap[c.subject_id].push(c);
      });

      setSchedule(schedMap);
      setThemes(themeMap);
      setRevisions(revMap);
      setCustomChapters(customMap);
      setAllSubjects(subjs);
      setSubjectsMap(subjsMap);
      setChaptersMap(chapsMap);
    } catch (e) { console.log('Load error:', e); }
    setLoading(false);
  }

  const dateKey = (d) => formatDate(d, 'yyyy-MM-dd');
  const todayKey = dateKey(new Date());

  function getTodayPlan() {
    const studyToday = schedule[todayKey] || [];
    const reviseToday = [];
    [
      { label: '+1', offset: 1, key: 'rev1' },
      { label: '+4', offset: 4, key: 'rev4' },
      { label: '+7', offset: 7, key: 'rev7' },
    ].forEach(({ label, offset, key }) => {
      const pastDate = addDays(new Date(), -offset);
      const pastKey = dateKey(pastDate);
      const pastTopics = schedule[pastKey] || [];
      pastTopics.forEach((t, idx) => {
        const tag = `${pastKey}_${idx}`;
        const rev = revisions[tag] || {};
        if (!rev[key]) {
          reviseToday.push({ ...t, revisionType: label, from: pastKey });
        }
      });
    });
    return { studyToday, reviseToday };
  }

  function getRevisionsDue(dk) {
    const due = [];
    [
      { label: '+1', offset: 1, key: 'rev1' },
      { label: '+4', offset: 4, key: 'rev4' },
      { label: '+7', offset: 7, key: 'rev7' },
    ].forEach(({ label, offset, key }) => {
      const pastDate = addDays(new Date(dk), -offset);
      const pastKey = dateKey(pastDate);
      const pastTopics = schedule[pastKey] || [];
      pastTopics.forEach((t, idx) => {
        const tag = `${pastKey}_${idx}`;
        const rev = revisions[tag] || {};
        if (!rev[key]) {
          due.push({ ...t, revisionType: label, from: pastKey });
        }
      });
    });
    return due;
  }

  function getSubjectDisplayName(subj) {
    return subj.name || 'Unknown';
  }

  function getSubjectColor(subj) {
    return { bg: '#e8e8e8', fg: '#545454', dot: '#b5b5b5', light: '#e8e8e8' };
  }

  function getChaptersForSubject(subjId) {
    return chaptersMap[subjId] || [];
  }

  const assignSubjectList = allSubjects.length > 0 ? allSubjects : [];
  const assignChapterList = (() => {
    const subj = assignSubjectList.find(s => s.id === assignSubject);
    if (!subj) return [...(customChapters['PHYSICS'] || [])];
    return getChaptersForSubject(subj.id).map(c => c.name);
  })();

  async function doAssign() {
    if (!assignChapter) return;
    const dk = dateKey(assignDate);
    const existing = schedule[dk] || [];
    if (existing.find(t => t.name === assignChapter)) {
      Alert.alert('Already assigned', `${assignChapter} is already on ${dk}`);
      return;
    }
    const subjObj = assignSubjectList.find(s => s.id === assignSubject);
    const subjName = subjObj ? getSubjectDisplayName(subjObj) : 'PHYSICS';
    const data = await db.addSchedule({ date_key: dk, subject: subjName, chapter_name: assignChapter });
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSchedule(prev => ({
        ...prev,
        [dk]: [...(prev[dk] || []), { subject: subjName, name: assignChapter, id: row.id }],
      }));
    }
    setShowAssign(false);
  }

  async function removeTopic(dk, idx) {
    const items = schedule[dk] || [];
    const item = items[idx];
    if (!item) return;
    Alert.alert('Remove', `Remove "${item.name}"?`, [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await db.deleteSchedule(item.id);
        const updated = [...items];
        updated.splice(idx, 1);
        setSchedule(prev => ({ ...prev, [dk]: updated }));
      }},
    ]);
  }

  async function toggleRev(tag, key) {
    const current = revisions[tag] || { rev1: false, rev4: false, rev7: false };
    const newVal = !current[key];
    const updated = { ...current, [key]: newVal };
    setRevisions(prev => ({ ...prev, [tag]: updated }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await db.upsertRevision(tag, updated);
  }

  async function saveTheme(dk) {
    const text = themeText;
    setThemes(prev => ({ ...prev, [dk]: text }));
    await db.upsertTheme(dk, text);
  }

  const selKey = dateKey(selectedDate);
  const selTopics = schedule[selKey] || [];
  const selRevisions = getRevisionsDue(selKey);
  const { studyToday, reviseToday } = getTodayPlan();
  const isTodaySelected = selKey === todayKey;

  const assignPreview = assignDate ? [
    { label: 'Study', date: assignDate },
    { label: '+1', date: addDays(assignDate, 1) },
    { label: '+4', date: addDays(assignDate, 4) },
    { label: '+7', date: addDays(assignDate, 7) },
  ] : [];

  function renderPanel(key) {
    switch (key) {
      case 'todayPlan':
        return (
          <View key="todayPlan">
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>TODAY</Text>
              {isTodaySelected && (studyToday.length + reviseToday.length) > 0 && (
                <Text style={[s.sectionCount, { backgroundColor: 'transparent', color: theme.textMuted }]}>
                  {studyToday.length + reviseToday.length}
                </Text>
              )}
            </View>
            {!isTodaySelected ? (
              <View style={s.emptyPlanBox}>
                <Text style={s.emptyPlanText}>Tap today ({formatDate(new Date(), 'MMM d')}) to see plan</Text>
              </View>
            ) : (
              <>
                {studyToday.length > 0 && (
                  <View style={s.planSection}>
                    {studyToday.map((t, i) => (
                      <FadeScalePressable key={i} style={[s.planCard, { borderLeftColor: theme.border }]}>
                        <View style={s.planCardHeader}>
                          <View style={[s.planDot, { backgroundColor: theme.border }]} />
                          <Text style={[s.planSubj, { color: theme.textSecondary }]}>{t.subject}</Text>
                        </View>
                        <Text style={[s.planName, { color: theme.text }]}>{t.name}</Text>
                      </FadeScalePressable>
                    ))}
                  </View>
                )}
                {reviseToday.length > 0 && (
                  <View style={s.planSection}>
                    {reviseToday.map((t, i) => (
                      <FadeScalePressable key={i} style={[s.planCard, { borderLeftColor: theme.border }]}>
                        <View style={s.planCardHeader}>
                          <View style={[s.revBadge, { backgroundColor: theme.cardAlt }]}>
                            <Text style={[s.revBadgeText, { color: theme.textSecondary }]}>{t.revisionType}</Text>
                          </View>
                        </View>
                        <Text style={[s.planName, { color: theme.text }]}>{t.name}</Text>
                      </FadeScalePressable>
                    ))}
                  </View>
                )}
                {studyToday.length === 0 && reviseToday.length === 0 && (
                  <View style={s.emptyPlanBox}>
                    <Text style={s.emptyPlanText}>Nothing scheduled</Text>
                  </View>
                )}
              </>
            )}
          </View>
        );

      case 'theme':
        return (
          <View key="theme">
            <Text style={s.sectionLabel}>FOCUS</Text>
            <View style={[s.themeBox, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
              <TextInput
                style={[s.themeInput, { color: theme.text }]}
                placeholder="Today's focus (e.g. Physics Marathon)"
                placeholderTextColor={theme.textMuted}
                value={themeText}
                onChangeText={setThemeText}
                onBlur={() => saveTheme(selKey)}
                multiline
              />
            </View>
          </View>
        );

      case 'topics':
        return (
          <View key="topics">
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>CHAPTERS</Text>
              <Text style={s.sectionCount}>{selTopics.length}</Text>
            </View>
            {selTopics.length === 0 ? (
              <View style={s.emptyPlanBox}>
                <Text style={s.emptyPlanText}>Tap + to assign chapters</Text>
              </View>
            ) : (
              <View style={s.topicsGrid}>
                {selTopics.map((item, idx) => {
                  const tag = `${selKey}_${idx}`;
                  const rev = revisions[tag] || { rev1: false, rev4: false, rev7: false };
                  return (
                    <FadeScalePressable key={idx} style={[s.topicCard, { backgroundColor: theme.cardAlt }]}>
                      <View style={s.topicHeader}>
                        <View style={[s.topicDot, { backgroundColor: theme.border }]} />
                        <Text style={[s.topicSubject, { color: theme.textSecondary }]}>{item.subject}</Text>
                        <ScalePressable onPress={() => removeTopic(selKey, idx)} style={s.removeBtn}>
                          <Text style={[s.removeBtnText, { color: theme.textMuted }]}>✕</Text>
                        </ScalePressable>
                      </View>
                      <Text style={[s.topicName, { color: theme.text }]}>{item.name}</Text>
                      <View style={s.revRow}>
                        {[
                          { label: '+1', key: 'rev1', days: 1 },
                          { label: '+4', key: 'rev4', days: 4 },
                          { label: '+7', key: 'rev7', days: 7 },
                        ].map(r => {
                          const rdate = addDays(selectedDate, r.days);
                          return (
                            <ScalePressable
                              key={r.key}
                              style={[s.revChip, rev[r.key] && { backgroundColor: theme.border }]}
                              onPress={() => toggleRev(tag, r.key)}
                            >
                              <Text style={[s.revChipText, rev[r.key] && { color: theme.text, fontWeight: '700' }, { color: theme.textSecondary }]}>
                                {rev[r.key] ? '✓' : '○'} {r.label}
                              </Text>
                            </ScalePressable>
                          );
                        })}
                      </View>
                    </FadeScalePressable>
                  );
                })}
              </View>
            )}
          </View>
        );

      case 'revisions':
        return (
          <View key="revisions">
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>REVISIONS</Text>
              <Text style={s.sectionCount}>{selRevisions.length}</Text>
            </View>
            {selRevisions.length === 0 ? (
              <View style={s.emptyPlanBox}>
                <Text style={s.emptyPlanText}>Nothing due</Text>
              </View>
            ) : (
              <View style={s.revList}>
                {selRevisions.map((t, i) => (
                  <FadeScalePressable key={i} style={[s.revCard, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                    <View style={s.revCardHeader}>
                      <View style={[s.revCardBadge, { backgroundColor: theme.border }]}>
                        <Text style={[s.revCardBadgeText, { color: theme.text }]}>{t.revisionType}</Text>
                      </View>
                      <Text style={[s.revCardFrom, { color: theme.textSecondary }]}>from {formatDate(new Date(t.from), 'MMM d')}</Text>
                    </View>
                    <Text style={[s.revCardName, { color: theme.text }]}>{t.name}</Text>
                    <Text style={[s.revCardSubj, { color: theme.textSecondary }]}>{t.subject}</Text>
                  </FadeScalePressable>
                ))}
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      {loading ? (
        <View style={s.loadingContainer}>
          <CalendarSkeleton />
        </View>
      ) : (
      <ScrollView
        style={s.scrollContainer}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
            colors={[theme.textSecondary]}
          />
        }
        {...panResponder.panHandlers}
      >
        <View style={s.monthNav}>
          <ScalePressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={s.navBtn}>
            <Text style={[s.navBtnText, { color: theme.textSecondary }]}>‹</Text>
          </ScalePressable>
          <View style={s.monthTitleBox}>
            <Text style={[s.monthTitle, { color: theme.text }]}>{formatDate(currentMonth, 'MMMM yyyy')}</Text>
            <ScalePressable onPress={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }} style={s.todayBtn}>
              <Text style={[s.todayBtnText, { color: theme.textSecondary }]}>Today</Text>
            </ScalePressable>
          </View>
          <ScalePressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={s.navBtn}>
            <Text style={[s.navBtnText, { color: theme.textSecondary }]}>›</Text>
          </ScalePressable>
        </View>

        <View style={s.dayHeaders}>
          {DAY_NAMES.map((d, i) => (
            <View key={i} style={s.dayHeaderCell}>
              <Text style={[s.dayHeader, { color: theme.textMuted }]}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={s.calGrid}>
          {days.map((day, i) => {
            const dk = dateKey(day);
            const inMonth = isSameMonth(day, currentMonth);
            const selected = isSameDay(day, selectedDate);
            const todayMark = isToday(day);
            const topics = schedule[dk] || [];
            const hasTheme = themes[dk] && themes[dk].trim().length > 0;
            const revDue = getRevisionsDue(dk);
            const hasRevDue = revDue.length > 0;
            return (
              <ScalePressable
                key={i}
                onPress={() => { setSelectedDate(day); setThemeText(themes[dateKey(day)] || ''); }}
                style={[
                  s.dayCell,
                  { borderColor: theme.borderLight },
                  !inMonth && s.dayCellOutside,
                  selected && [s.dayCellSelected, { backgroundColor: theme.cardAlt, borderColor: theme.border }],
                  todayMark && s.dayCellToday,
                ]}
              >
                <View style={s.dayNumRow}>
                  <View style={[s.dayNum, todayMark && { backgroundColor: theme.text }]}>
                    <Text style={[
                      s.dayNumText,
                      { color: theme.textSecondary },
                      todayMark && { color: theme.bg, fontWeight: '600' },
                      !inMonth && { color: theme.textMuted },
                    ]}>
                      {formatDate(day, 'd')}
                    </Text>
                  </View>
                  {(hasTheme || hasRevDue) && (
                    <View style={s.dotsRow}>
                      {hasTheme && <View style={[s.themeDot, { backgroundColor: theme.textMuted }]} />}
                      {hasRevDue && <View style={[s.revDot, { backgroundColor: theme.border }]} />}
                    </View>
                  )}
                </View>
                {topics.slice(0, 2).map((t, j) => (
                  <View key={j} style={[s.chip, { backgroundColor: theme.cardAlt }]}>
                    <View style={[s.chipDot, { backgroundColor: theme.border }]} />
                    <Text style={[s.chipText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {t.name.length > 12 ? t.name.slice(0, 10) + '…' : t.name}
                    </Text>
                  </View>
                ))}
                {topics.length > 2 && (
                  <View style={[s.moreChip, { backgroundColor: theme.cardAlt }]}>
                    <Text style={[s.moreText, { color: theme.textSecondary }]}>+{topics.length - 2}</Text>
                  </View>
                )}
              </ScalePressable>
            );
          })}
        </View>

        <View style={[s.dateInfoBar, { borderTopColor: theme.borderLight }]}>
          <View style={s.dateInfoLeft}>
            <Text style={[s.sideDate, { color: theme.text }]}>{formatDate(selectedDate, 'EEE, MMM d')}</Text>
          </View>
        </View>

        {panelOrder.map((key) => (
          <View key={key} style={s.panelBlock}>
            {renderPanel(key)}
          </View>
        ))}

        <View style={s.bottomPadding} />
      </ScrollView>
      )}

      <AnimatedBottomSheet visible={showAssign} onClose={() => setShowAssign(false)}>
        <View style={s.modalContent}>
          <Text style={[s.modalTitle, { color: theme.text }]}>Assign Chapter</Text>
          <Text style={[s.modalDate, { color: theme.textMuted }]}>{formatDate(assignDate, 'MMM d, yyyy')}</Text>

          <Text style={[s.modalLabel, { color: theme.textSecondary }]}>SUBJECT</Text>
          <View style={s.subjectRow}>
            {assignSubjectList.map(subj => {
              const isActive = subj.id === assignSubject;
              return (
                <ScalePressable
                  key={subj.id}
                  style={[s.subjectBtn, { backgroundColor: theme.cardAlt }, isActive && { backgroundColor: theme.text }]}
                  onPress={() => { setAssignSubject(subj.id); setAssignChapter(''); }}
                >
                  <Text style={[s.subjectBtnText, { color: theme.textSecondary }, isActive && { color: theme.bg }]}>
                    {getSubjectDisplayName(subj).slice(0, 8)}
                  </Text>
                </ScalePressable>
              );
            })}
            {assignSubjectList.length === 0 && (
              <Text style={[s.emptyText, { color: theme.textMuted }]}>Add subjects in onboarding first</Text>
            )}
          </View>

          <Text style={[s.modalLabel, { color: theme.textSecondary }]}>CHAPTER</Text>
          <ScrollView style={[s.chapterList, { borderColor: theme.border }]} nestedScrollEnabled>
            {assignChapterList.map(ch => (
              <ScalePressable
                key={ch}
                style={[s.chapterOption, assignChapter === ch && { backgroundColor: theme.cardAlt }]}
                onPress={() => setAssignChapter(ch)}
              >
                <Text style={[s.chapterOptionText, { color: theme.text }, assignChapter === ch && { fontWeight: '700' }]}>
                  {ch}
                </Text>
              </ScalePressable>
            ))}
            {assignChapterList.length === 0 && (
              <Text style={[s.emptyText, { color: theme.textMuted }]}>No chapters available</Text>
            )}
          </ScrollView>

          {assignChapter ? (
            <View style={s.previewSection}>
              <Text style={[s.modalLabel, { color: theme.textSecondary }]}>SCHEDULE</Text>
              <View style={s.previewRow}>
                {assignPreview.map((p, i) => (
                  <View key={i} style={[s.previewItem, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                    <Text style={[s.previewLabel, { color: theme.textSecondary }]}>{p.label}</Text>
                    <Text style={[s.previewDate, { color: theme.text }]}>{formatDate(p.date, 'MMM d')}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={s.modalBtns}>
            <ScalePressable onPress={() => setShowAssign(false)} style={s.cancelBtn}>
              <Text style={[s.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </ScalePressable>
            <ScalePressable onPress={doAssign} style={[s.assignBtn, { backgroundColor: theme.text }, !assignChapter && { opacity: 0.5 }]}>
              <Text style={[s.assignBtnText, { color: theme.bg }]}>Assign</Text>
            </ScalePressable>
          </View>
        </View>
      </AnimatedBottomSheet>

      <ScalePressable
        style={[s.fab, { backgroundColor: theme.text }]}
        onPress={() => { setAssignDate(selectedDate); setShowAssign(true); }}
      >
        <Text style={[s.fabText, { color: theme.bg }]}>+</Text>
      </ScalePressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', paddingTop: 100 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  monthTitleBox: { alignItems: 'center', gap: 4 },
  navBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  navBtnText: { fontSize: 18, fontWeight: '400' },
  monthTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  todayBtnText: { fontSize: 12, fontWeight: '500' },

  dayHeaders: { flexDirection: 'row', marginTop: 6, marginBottom: 2 },
  dayHeaderCell: { flex: 1, alignItems: 'center' },
  dayHeader: { fontSize: 11, fontWeight: '600' },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 16,
    borderWidth: 0.5,
    padding: 3,
    borderRadius: 4,
  },
  dayCellOutside: { opacity: 0.3 },
  dayCellSelected: { borderWidth: 1 },
  dayCellToday: { backgroundColor: 'transparent' },
  dayNumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 },
  dayNum: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  dayNumText: { fontSize: 11, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 2 },
  themeDot: { width: 4, height: 4, borderRadius: 2 },
  revDot: { width: 4, height: 4, borderRadius: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1, marginBottom: 1 },
  chipDot: { width: 3, height: 3, borderRadius: 1.5, marginRight: 2 },
  chipText: { fontSize: 7, fontWeight: '600', flex: 1 },
  moreChip: { borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1, alignItems: 'center' },
  moreText: { fontSize: 6, fontWeight: '600' },

  dateInfoBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, paddingTop: 16, paddingBottom: 4, marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dateInfoLeft: {},
  sideDate: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },

  panelBlock: { paddingHorizontal: 4, marginBottom: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sectionCount: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },

  emptyPlanBox: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 8 },
  emptyPlanText: { fontSize: 13 },

  planSection: { gap: 4 },
  planCard: { borderLeftWidth: 3, borderRadius: 6, padding: 8 },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planDot: { width: 6, height: 6, borderRadius: 3 },
  planSubj: { fontSize: 9, fontWeight: '700' },
  planName: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  revBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  revBadgeText: { fontSize: 9, fontWeight: '700' },

  themeBox: { borderRadius: 8, padding: 10, borderWidth: 1 },
  themeInput: { fontSize: 13, minHeight: 32, padding: 0 },

  topicsGrid: { gap: 4 },
  topicCard: { borderRadius: 8, padding: 10 },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topicDot: { width: 6, height: 6, borderRadius: 3 },
  topicSubject: { fontSize: 10, fontWeight: '700', flex: 1 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  removeBtnText: { fontSize: 14, fontWeight: '700' },
  topicName: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  revRow: { flexDirection: 'row', marginTop: 6, gap: 4 },
  revChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  revChipText: { fontSize: 10, fontWeight: '500' },

  revList: { gap: 4 },
  revCard: { borderRadius: 8, padding: 10, borderWidth: 1 },
  revCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revCardBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  revCardBadgeText: { fontSize: 9, fontWeight: '700' },
  revCardFrom: { fontSize: 10 },
  revCardName: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  revCardSubj: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  bottomPadding: { height: 80 },

  fab: {
    position: 'absolute', right: 20, bottom: 72,
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  fabText: { fontSize: 24, fontWeight: '300', marginTop: -1 },

  modalContent: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalDate: { fontSize: 14, marginTop: 2, marginBottom: 20 },
  modalLabel: { fontSize: 11, fontWeight: '800', marginBottom: 8, marginTop: 12, letterSpacing: 0.5 },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  subjectBtnText: { fontSize: 12, fontWeight: '600' },
  chapterList: { maxHeight: 180, borderWidth: 1, borderRadius: 12, marginTop: 4 },
  chapterOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5 },
  chapterOptionText: { fontSize: 14 },
  previewSection: { marginTop: 12 },
  previewRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  previewItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  previewLabel: { fontSize: 10, fontWeight: '700' },
  previewDate: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  assignBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  assignBtnText: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 12 },
});
