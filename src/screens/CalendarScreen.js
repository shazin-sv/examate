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
    const name = getSubjectDisplayName(subj);
    if (subj.color) return { bg: subj.color + '18', fg: subj.color, dot: subj.color, light: subj.color + '30' };
    return SUBJECT_COLORS[name] || { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8', light: '#f1f5f9' };
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
    { label: 'Study', date: assignDate, color: '#3b82f6' },
    { label: '+1', date: addDays(assignDate, 1), color: '#f59e0b' },
    { label: '+4', date: addDays(assignDate, 4), color: '#8b5cf6' },
    { label: '+7', date: addDays(assignDate, 7), color: '#22c55e' },
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
                    {studyToday.map((t, i) => {
                      const sc = SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.PHYSICS;
                      return (
                        <FadeScalePressable key={i} style={[s.planCard, { borderLeftColor: sc.dot }]}>
                          <View style={s.planCardHeader}>
                            <View style={[s.planDot, { backgroundColor: sc.dot }]} />
                            <Text style={[s.planSubj, { color: sc.fg }]}>{t.subject}</Text>
                          </View>
                          <Text style={[s.planName, { color: sc.fg }]}>{t.name}</Text>
                        </FadeScalePressable>
                      );
                    })}
                  </View>
                )}
                {reviseToday.length > 0 && (
                  <View style={s.planSection}>
                    {reviseToday.map((t, i) => {
                      const sc = SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.PHYSICS;
                      return (
                        <FadeScalePressable key={i} style={[s.planCard, { borderLeftColor: '#f59e0b' }]}>
                          <View style={s.planCardHeader}>
                            <View style={[s.revBadge]}>
                              <Text style={s.revBadgeText}>{t.revisionType}</Text>
                            </View>
                          </View>
                          <Text style={[s.planName, { color: '#92400e' }]}>{t.name}</Text>
                        </FadeScalePressable>
                      );
                    })}
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
            <View style={s.themeBox}>
              <TextInput
                style={s.themeInput}
                placeholder="Today's focus (e.g. Physics Marathon)"
                placeholderTextColor="#c4b5fd"
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
                  const sc = SUBJECT_COLORS[item.subject] || SUBJECT_COLORS.PHYSICS;
                  const tag = `${selKey}_${idx}`;
                  const rev = revisions[tag] || { rev1: false, rev4: false, rev7: false };
                  return (
                    <FadeScalePressable key={idx} style={[s.topicCard, { backgroundColor: sc.bg }]}>
                      <View style={s.topicHeader}>
                        <View style={[s.topicDot, { backgroundColor: sc.dot }]} />
                        <Text style={[s.topicSubject, { color: sc.fg }]}>{item.subject}</Text>
                        <ScalePressable onPress={() => removeTopic(selKey, idx)} style={s.removeBtn}>
                          <Text style={s.removeBtnText}>✕</Text>
                        </ScalePressable>
                      </View>
                      <Text style={[s.topicName, { color: sc.fg }]}>{item.name}</Text>
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
                              style={[s.revChip, rev[r.key] && s.revChipDone]}
                              onPress={() => toggleRev(tag, r.key)}
                            >
                              <Text style={[s.revChipText, rev[r.key] && s.revChipTextDone]}>
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
                  <FadeScalePressable key={i} style={s.revCard}>
                    <View style={s.revCardHeader}>
                      <View style={s.revCardBadge}>
                        <Text style={s.revCardBadgeText}>{t.revisionType}</Text>
                      </View>
                      <Text style={s.revCardFrom}>from {formatDate(new Date(t.from), 'MMM d')}</Text>
                    </View>
                    <Text style={s.revCardName}>{t.name}</Text>
                    <Text style={s.revCardSubj}>{t.subject}</Text>
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
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        {...panResponder.panHandlers}
      >
        {/* MONTH NAV */}
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

        {/* DAY HEADERS */}
        <View style={s.dayHeaders}>
          {DAY_NAMES.map((d, i) => (
            <View key={i} style={s.dayHeaderCell}>
              <Text style={s.dayHeader}>{d}</Text>
            </View>
          ))}
        </View>

        {/* CALENDAR GRID */}
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
                  !inMonth && s.dayCellOutside,
                  selected && s.dayCellSelected,
                  todayMark && s.dayCellToday,
                ]}
              >
                <View style={s.dayNumRow}>
                  <View style={[s.dayNum, todayMark && s.dayNumToday]}>
                    <Text style={[
                      s.dayNumText,
                      todayMark && s.dayNumTextToday,
                      !inMonth && s.dayNumTextOutside,
                    ]}>
                      {formatDate(day, 'd')}
                    </Text>
                  </View>
                  {(hasTheme || hasRevDue) && (
                    <View style={s.dotsRow}>
                      {hasTheme && <View style={s.themeDot} />}
                      {hasRevDue && <View style={s.revDot} />}
                    </View>
                  )}
                </View>
                {topics.slice(0, 2).map((t, j) => {
                  const sc = SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.PHYSICS;
                  return (
                    <View key={j} style={[s.chip, { backgroundColor: sc.bg }]}>
                      <View style={[s.chipDot, { backgroundColor: sc.dot }]} />
                      <Text style={[s.chipText, { color: sc.fg }]} numberOfLines={1}>
                        {t.name.length > 12 ? t.name.slice(0, 10) + '…' : t.name}
                      </Text>
                    </View>
                  );
                })}
                {topics.length > 2 && (
                  <View style={s.moreChip}>
                    <Text style={s.moreText}>+{topics.length - 2}</Text>
                  </View>
                )}
              </ScalePressable>
            );
          })}
        </View>

        {/* SELECTED DATE HEADER */}
        <View style={s.dateInfoBar}>
          <View style={s.dateInfoLeft}>
            <Text style={[s.sideDate, { color: theme.text }]}>{formatDate(selectedDate, 'EEE, MMM d')}</Text>
          </View>
        </View>

        {/* PANELS */}
        {panelOrder.map((key) => (
          <View key={key} style={s.panelBlock}>
            {renderPanel(key)}
          </View>
        ))}

        <View style={s.bottomPadding} />
      </ScrollView>
      )}

      {/* ASSIGN MODAL */}
      <AnimatedBottomSheet visible={showAssign} onClose={() => setShowAssign(false)}>
        <View style={s.modalContent}>
          <Text style={s.modalTitle}>Assign Chapter</Text>
          <Text style={s.modalDate}>{formatDate(assignDate, 'MMM d, yyyy')}</Text>

          <Text style={s.modalLabel}>SUBJECT</Text>
          <View style={s.subjectRow}>
            {assignSubjectList.map(subj => {
              const sc = getSubjectColor(subj);
              const isActive = subj.id === assignSubject;
              return (
                <ScalePressable
                  key={subj.id}
                  style={[s.subjectBtn, isActive && { backgroundColor: sc.dot }]}
                  onPress={() => { setAssignSubject(subj.id); setAssignChapter(''); }}
                >
                  <Text style={[s.subjectBtnText, isActive && { color: '#fff' }]}>
                    {getSubjectDisplayName(subj).slice(0, 8)}
                  </Text>
                </ScalePressable>
              );
            })}
            {assignSubjectList.length === 0 && (
              <Text style={s.emptyText}>Add subjects in onboarding first</Text>
            )}
          </View>

          <Text style={s.modalLabel}>CHAPTER</Text>
          <ScrollView style={s.chapterList} nestedScrollEnabled>
            {assignChapterList.map(ch => (
              <ScalePressable
                key={ch}
                style={[s.chapterOption, assignChapter === ch && s.chapterOptionSelected]}
                onPress={() => setAssignChapter(ch)}
              >
                <Text style={[s.chapterOptionText, assignChapter === ch && s.chapterOptionTextSelected]}>
                  {ch}
                </Text>
              </ScalePressable>
            ))}
            {assignChapterList.length === 0 && (
              <Text style={s.emptyText}>No chapters available</Text>
            )}
          </ScrollView>

          {assignChapter ? (
            <View style={s.previewSection}>
              <Text style={s.modalLabel}>SCHEDULE</Text>
              <View style={s.previewRow}>
                {assignPreview.map((p, i) => (
                  <View key={i} style={[s.previewItem, { backgroundColor: p.color + '15', borderColor: p.color + '40' }]}>
                    <Text style={[s.previewLabel, { color: p.color }]}>{p.label}</Text>
                    <Text style={[s.previewDate, { color: p.color }]}>{formatDate(p.date, 'MMM d')}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={s.modalBtns}>
            <ScalePressable onPress={() => setShowAssign(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </ScalePressable>
            <ScalePressable onPress={doAssign} style={[s.assignBtn, !assignChapter && { opacity: 0.5 }]}>
              <Text style={s.assignBtnText}>Assign</Text>
            </ScalePressable>
          </View>
        </View>
      </AnimatedBottomSheet>

      {/* FAB */}
      <ScalePressable
        style={[s.fab, { backgroundColor: theme.text }]}
        onPress={() => { setAssignDate(selectedDate); setShowAssign(true); }}
      >
        <Text style={s.fabText}>+</Text>
      </ScalePressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafbfc', width: '100%', maxWidth: 720, alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', paddingTop: 100 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 1 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  monthTitleBox: {
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  navBtnText: { fontSize: 18, color: '#334155', fontWeight: '400' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  todayBtnText: { fontSize: 12, fontWeight: '500', color: '#64748b' },

  legendWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  legendScrollInner: {
    gap: 6,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  legendDot: { width: 5, height: 5, borderRadius: 2.5 },
  legendText: { fontSize: 9, fontWeight: '600' },

  dayHeaders: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 2,
  },
  dayHeaderCell: { flex: 1, alignItems: 'center' },
  dayHeader: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },

  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 16,
    borderWidth: 0.5,
    borderColor: '#e8e8e8',
    padding: 3,
    borderRadius: 4,
  },
  dayCellOutside: { opacity: 0.3 },
  dayCellSelected: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  dayCellToday: {
    backgroundColor: 'transparent',
  },
  dayNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  dayNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumToday: { backgroundColor: '#0f172a' },
  dayNumText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  dayNumTextToday: { color: '#fff', fontWeight: '600' },
  dayNumTextOutside: { color: '#cbd5e1' },
  dotsRow: { flexDirection: 'row', gap: 2 },
  themeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#a78bfa' },
  revDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#f59e0b' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginBottom: 1,
  },
  chipDot: { width: 3, height: 3, borderRadius: 1.5, marginRight: 2 },
  chipText: { fontSize: 7, fontWeight: '600', flex: 1 },
  moreChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    alignItems: 'center',
  },
  moreText: { fontSize: 6, color: '#64748b', fontWeight: '600' },

  dateInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 4,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  dateInfoLeft: {},
  sideDate: { fontSize: 16, fontWeight: '600', color: '#0f172a', letterSpacing: -0.3 },

  panelBlock: { paddingHorizontal: 4, marginBottom: 2 },
  panelReorderRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 4, gap: 4 },
  arrowBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  arrowBtnText: { fontSize: 14, color: '#94a3b8' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  sectionCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },

  emptyPlanBox: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  emptyPlanText: { fontSize: 13, color: '#94a3b8' },

  planSection: { gap: 4 },
  planCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planDot: { width: 6, height: 6, borderRadius: 3 },
  planSubj: { fontSize: 9, fontWeight: '700' },
  planName: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  revBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  revBadgeText: { fontSize: 9, fontWeight: '700', color: '#92400e' },

  themeBox: {
    backgroundColor: '#faf5ff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  themeInput: { fontSize: 13, color: '#7c3aed', minHeight: 32, padding: 0 },

  topicsGrid: { gap: 4 },
  topicCard: {
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topicDot: { width: 6, height: 6, borderRadius: 3 },
  topicSubject: { fontSize: 10, fontWeight: '700', flex: 1 },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  removeBtnText: { fontSize: 14, color: '#ef4444', fontWeight: '700' },
  topicName: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  revRow: { flexDirection: 'row', marginTop: 6, gap: 4 },
  revChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  revChipDone: { backgroundColor: '#dcfce7' },
  revChipText: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  revChipTextDone: { color: '#166534', fontWeight: '700' },

  revList: { gap: 4 },
  revCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  revCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revCardBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  revCardBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  revCardFrom: { fontSize: 10, color: '#92400e' },
  revCardName: { fontSize: 12, fontWeight: '700', color: '#92400e', marginTop: 4 },
  revCardSubj: { fontSize: 10, fontWeight: '600', color: '#b45309', marginTop: 1 },

  bottomPadding: { height: 80 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 72,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { fontSize: 24, color: '#fff', fontWeight: '300', marginTop: -1 },

  modalContent: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  modalDate: { fontSize: 14, color: '#94a3b8', marginTop: 2, marginBottom: 20 },
  modalLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, marginTop: 12, letterSpacing: 0.5 },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  subjectBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chapterList: { maxHeight: 180, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginTop: 4 },
  chapterOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  chapterOptionSelected: { backgroundColor: '#eff6ff' },
  chapterOptionText: { fontSize: 14, color: '#334155' },
  chapterOptionTextSelected: { color: '#3b82f6', fontWeight: '700' },
  previewSection: { marginTop: 12 },
  previewRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  previewItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewLabel: { fontSize: 10, fontWeight: '700' },
  previewDate: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  cancelBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  assignBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  assignBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
});
