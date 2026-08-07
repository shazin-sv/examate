import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { formatDate, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths,
  getWeek } from '../lib/dateUtils';
import { CHAPTERS, SUBJECT_COLORS, EXAM_START } from '../data/chapters';
import { db } from '../lib/supabase';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'MATHS', 'COMPUTER SCIENCE', 'ENGLISH', 'HINDI'];

export default function CalendarScreen() {
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

  const [panelOrder, setPanelOrder] = useState(['todayPlan', 'theme', 'topics', 'revisions']);

  const [splitRatio, setSplitRatio] = useState(0.55);
  const mainAreaHeight = useRef(0);
  const lastTouchY = useRef(0);
  const dragging = useRef(false);

  const examDate = new Date(2026, 7, 14);
  const daysLeft = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function onDividerPressIn(e) {
    dragging.current = true;
    lastTouchY.current = e.nativeEvent.pageY;
  }

  function onDividerMove(e) {
    if (!dragging.current) return;
    const h = mainAreaHeight.current;
    if (h <= 0) return;
    const y = e.nativeEvent.pageY;
    const dy = y - lastTouchY.current;
    lastTouchY.current = y;
    const delta = dy / h;
    setSplitRatio(prev => Math.max(0.25, Math.min(0.8, prev + delta)));
  }

  function onDividerPressOut() {
    dragging.current = false;
  }

  function resetSplit() {
    setSplitRatio(0.5);
  }

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [schedRes, themeRes, revRes, customRes] = await Promise.all([
        db.getSchedule(), db.getThemes(), db.getRevisions(), db.getCustomChapters(),
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
      setSchedule(schedMap);
      setThemes(themeMap);
      setRevisions(revMap);
      setCustomChapters(customMap);
    } catch (e) { console.log('Load error:', e); }
    setLoading(false);
  }

  const dateKey = (d) => formatDate(d, 'yyyy-MM-dd');
  const todayKey = dateKey(new Date());

  function getTodayPlan() {
    const studyToday = schedule[todayKey] || [];
    const reviseToday = [];
    [
      { label: '+1 Revision', offset: 1, key: 'rev1' },
      { label: '+4 Revision', offset: 4, key: 'rev4' },
      { label: '+7 Revision', offset: 7, key: 'rev7' },
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

  function movePanel(idx, dir) {
    const newOrder = [...panelOrder];
    const swap = idx + dir;
    if (swap < 0 || swap >= newOrder.length) return;
    [newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]];
    setPanelOrder(newOrder);
  }

  async function doAssign() {
    if (!assignChapter) return;
    const dk = dateKey(assignDate);
    const existing = schedule[dk] || [];
    if (existing.find(t => t.subject === assignSubject && t.name === assignChapter)) {
      Alert.alert('Already assigned', `${assignChapter} is already on ${dk}`);
      return;
    }
    const data = await db.addSchedule({ date_key: dk, subject: assignSubject, chapter_name: assignChapter });
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.id) {
      setSchedule(prev => ({
        ...prev,
        [dk]: [...(prev[dk] || []), { subject: assignSubject, name: assignChapter, id: row.id }],
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
    { label: '+1 Rev', date: addDays(assignDate, 1), color: '#f59e0b' },
    { label: '+4 Rev', date: addDays(assignDate, 4), color: '#8b5cf6' },
    { label: '+7 Rev', date: addDays(assignDate, 7), color: '#22c55e' },
  ] : [];

  function renderPanel(key) {
    switch (key) {
      case 'todayPlan':
        return (
          <View key="todayPlan">
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>TODAY'S PLAN</Text>
              {isTodaySelected && (
                <Text style={s.planBadge}>{studyToday.length + reviseToday.length} tasks</Text>
              )}
            </View>
            {!isTodaySelected ? (
              <Text style={s.emptyText}>Select today ({formatDate(new Date(), 'dd MMM')}) to see your plan</Text>
            ) : (
              <>
                {studyToday.length > 0 && (
                  <>
                    <Text style={s.planSubLabel}>Study New</Text>
                    {studyToday.map((t, i) => {
                      const sc = SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.PHYSICS;
                      return (
                        <View key={i} style={[s.planItem, { borderLeftColor: sc.dot }]}>
                          <Text style={[s.planItemSubj, { color: sc.fg }]}>{t.subject}</Text>
                          <Text style={[s.planItemName, { color: sc.fg }]}>{t.name}</Text>
                        </View>
                      );
                    })}
                  </>
                )}
                {reviseToday.length > 0 && (
                  <>
                    <Text style={s.planSubLabel}>Revise</Text>
                    {reviseToday.map((t, i) => {
                      const sc = SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.PHYSICS;
                      return (
                        <View key={i} style={[s.planItem, { borderLeftColor: '#f59e0b' }]}>
                          <Text style={s.planItemRevBadge}>{t.revisionType}</Text>
                          <Text style={[s.planItemName, { color: sc.fg }]}>{t.name}</Text>
                        </View>
                      );
                    })}
                  </>
                )}
                {studyToday.length === 0 && reviseToday.length === 0 && (
                  <Text style={s.emptyText}>Nothing scheduled for today.</Text>
                )}
              </>
            )}
          </View>
        );

      case 'theme':
        return (
          <View key="theme">
            <Text style={s.sectionLabel}>DAILY THEME</Text>
            <View style={s.themeBox}>
              <TextInput
                style={s.themeInput}
                placeholder="Focus for today (e.g. Maths Day)"
                placeholderTextColor="#b8a44c"
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
            <Text style={s.sectionLabel}>TOPICS · {selTopics.length}</Text>
            {selTopics.length === 0 ? (
              <Text style={s.emptyText}>No topics. Tap + to assign.</Text>
            ) : selTopics.map((item, idx) => {
              const sc = SUBJECT_COLORS[item.subject] || SUBJECT_COLORS.PHYSICS;
              const tag = `${selKey}_${idx}`;
              const rev = revisions[tag] || { rev1: false, rev4: false, rev7: false };
              return (
                <View key={idx} style={[s.topicCard, { backgroundColor: sc.bg }]}>
                  <View style={s.topicHeader}>
                    <View style={[s.topicDot, { backgroundColor: sc.dot }]} />
                    <Text style={[s.topicSubject, { color: sc.fg }]}>{item.subject}</Text>
                    <TouchableOpacity onPress={() => removeTopic(selKey, idx)}>
                      <Text style={s.removeBtn}>✕</Text>
                    </TouchableOpacity>
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
                        <TouchableOpacity
                          key={r.key}
                          style={[s.revCb, rev[r.key] && s.revCbDone]}
                          onPress={() => toggleRev(tag, r.key)}
                        >
                          <Text style={[s.revCbText, rev[r.key] && s.revCbTextDone]}>
                            {rev[r.key] ? '✓' : '○'} {r.label} ({formatDate(rdate, 'dd MMM')})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        );

      case 'revisions':
        return (
          <View key="revisions">
            <Text style={s.sectionLabel}>REVISIONS DUE · {selRevisions.length}</Text>
            {selRevisions.length === 0 ? (
              <Text style={s.emptyText}>No pending revisions for this date</Text>
            ) : selRevisions.map((t, i) => (
              <View key={i} style={[s.revDueCard, { backgroundColor: '#fef3c7' }]}>
                <View style={s.revDueHeader}>
                  <Text style={s.revDueBadge}>{t.revisionType}</Text>
                  <Text style={s.revDueFrom}>from {t.from}</Text>
                </View>
                <Text style={[s.revDueName, { color: '#92400e' }]}>{t.name}</Text>
                <Text style={[s.revDueSubj, { color: '#b45309' }]}>{t.subject}</Text>
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topBar}>
        <Text style={s.title}>Onam 2026</Text>
        <View style={s.countdownBox}>
          <Text style={s.countdownText}>
            {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'TODAY' : 'Ongoing'}
          </Text>
        </View>
      </View>

      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={s.navBtn}>
          <Text style={s.navBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.monthTitle}>{formatDate(currentMonth, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={s.navBtn}>
          <Text style={s.navBtnText}>{'>'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }} style={s.todayBtn}>
          <Text style={s.todayBtnText}>Today</Text>
        </TouchableOpacity>
      </View>

      <View style={s.legend}>
        {ALL_SUBJECTS.map(subj => (
          <View key={subj} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: SUBJECT_COLORS[subj].dot }]} />
            <Text style={s.legendText}>{subj.slice(0, 3)}</Text>
          </View>
        ))}
      </View>

      <View
        style={s.mainArea}
        onLayout={(e) => { mainAreaHeight.current = e.nativeEvent.layout.height; }}
      >
        {/* CALENDAR GRID */}
        <View style={[s.calendarSection, { flex: splitRatio }]}>
          <View style={s.dayHeaders}>
            {DAY_NAMES.map(d => (
              <Text key={d} style={s.dayHeader}>{d}</Text>
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
                <TouchableOpacity
                  key={i}
                  style={[s.dayCell, !inMonth && s.dayCellOutside, selected && s.dayCellSelected]}
                  onPress={() => { setSelectedDate(day); setThemeText(themes[dateKey(day)] || ''); }}
                  activeOpacity={0.7}
                >
                  <View style={s.dayNumRow}>
                    <View style={[s.dayNum, todayMark && s.dayNumToday]}>
                      <Text style={[s.dayNumText, todayMark && s.dayNumTextToday]}>{formatDate(day, 'd')}</Text>
                    </View>
                    <View style={s.dotsRow}>
                      {hasTheme && <View style={s.themeDot} />}
                      {hasRevDue && <View style={s.revDot} />}
                    </View>
                  </View>
                  {topics.slice(0, 2).map((t, j) => {
                    const sc = SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.PHYSICS;
                    return (
                      <View key={j} style={[s.chip, { backgroundColor: sc.bg }]}>
                        <View style={[s.chipDot, { backgroundColor: sc.dot }]} />
                        <Text style={[s.chipText, { color: sc.fg }]} numberOfLines={1}>
                          {t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name}
                        </Text>
                      </View>
                    );
                  })}
                  {topics.length > 2 && <Text style={s.moreText}>+{topics.length - 2}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* DRAGGABLE DIVIDER */}
        <View
          style={s.divider}
          onTouchStart={onDividerPressIn}
          onTouchMove={onDividerMove}
          onTouchEnd={onDividerPressOut}
          onTouchCancel={onDividerPressOut}
        >
          <TouchableOpacity onPress={resetSplit} style={s.dividerInner}>
            <View style={s.dividerHandle} />
          </TouchableOpacity>
        </View>

        {/* BOTTOM PANEL */}
        <View style={[s.panelSection, { flex: 1 - splitRatio }]}>
          <View style={s.sideHeader}>
            <Text style={s.sideDate}>{formatDate(selectedDate, 'MMMM d, yyyy')}</Text>
            <Text style={s.sideDay}>{formatDate(selectedDate, 'EEEE')} · Wk {getWeek(selectedDate)}</Text>
          </View>

          <ScrollView style={s.sideScroll} showsVerticalScrollIndicator={false}>
            {panelOrder.map((key, idx) => (
              <View key={key} style={s.panelBlock}>
                <View style={s.panelReorderRow}>
                  {idx > 0 && (
                    <TouchableOpacity onPress={() => movePanel(idx, -1)} style={s.arrowBtn}>
                      <Text style={s.arrowBtnText}>▲</Text>
                    </TouchableOpacity>
                  )}
                  {idx < panelOrder.length - 1 && (
                    <TouchableOpacity onPress={() => movePanel(idx, 1)} style={s.arrowBtn}>
                      <Text style={s.arrowBtnText}>▼</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {renderPanel(key)}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ASSIGN MODAL */}
      <Modal visible={showAssign} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Assign Chapter</Text>
            <Text style={s.modalDate}>Date: {formatDate(assignDate, 'MMMM d, yyyy')}</Text>

            <Text style={s.modalLabel}>Subject</Text>
            <View style={s.subjectRow}>
              {ALL_SUBJECTS.map(subj => (
                <TouchableOpacity
                  key={subj}
                  style={[s.subjectBtn, assignSubject === subj && { backgroundColor: SUBJECT_COLORS[subj].dot }]}
                  onPress={() => { setAssignSubject(subj); setAssignChapter(''); }}
                >
                  <Text style={[s.subjectBtnText, assignSubject === subj && { color: '#fff' }]}>
                    {subj.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.modalLabel}>Chapter</Text>
            <ScrollView style={s.chapterList} nestedScrollEnabled>
              {[...CHAPTERS[assignSubject], ...(customChapters[assignSubject] || [])].map(ch => (
                <TouchableOpacity
                  key={ch}
                  style={[s.chapterOption, assignChapter === ch && s.chapterOptionSelected]}
                  onPress={() => setAssignChapter(ch)}
                >
                  <Text style={[s.chapterOptionText, assignChapter === ch && s.chapterOptionTextSelected]}>
                    {ch}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {assignChapter ? (
              <View style={s.previewSection}>
                <Text style={s.modalLabel}>1-4-7 Schedule</Text>
                <View style={s.previewRow}>
                  {assignPreview.map((p, i) => (
                    <View key={i} style={[s.previewItem, { backgroundColor: p.color + '20', borderColor: p.color }]}>
                      <Text style={[s.previewLabel, { color: p.color }]}>{p.label}</Text>
                      <Text style={[s.previewDate, { color: p.color }]}>{formatDate(p.date, 'dd MMM')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={s.modalBtns}>
              <TouchableOpacity onPress={() => setShowAssign(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doAssign} style={[s.assignBtn, !assignChapter && { opacity: 0.5 }]}>
                <Text style={s.assignBtnText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={s.fab} onPress={() => { setAssignDate(selectedDate); setShowAssign(true); }}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  countdownBox: { backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  countdownText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 12 },
  navBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  navBtnText: { fontSize: 16, color: '#334155', fontWeight: '600' },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', minWidth: 160, textAlign: 'center' },
  todayBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  todayBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#64748b' },
  mainArea: { flex: 1 },
  calendarSection: {},
  dayHeaders: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 6 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#64748b' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, borderWidth: 0.5, borderColor: '#e2e8f0', padding: 3 },
  dayCellOutside: { opacity: 0.3 },
  dayCellSelected: { backgroundColor: '#eff6ff' },
  dayNumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  dayNum: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  dayNumToday: { backgroundColor: '#3b82f6' },
  dayNumText: { fontSize: 11, fontWeight: '600', color: '#0f172a' },
  dayNumTextToday: { color: '#fff' },
  dotsRow: { flexDirection: 'row', gap: 2 },
  themeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#f59e0b' },
  revDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#ef4444' },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, marginBottom: 1 },
  chipDot: { width: 4, height: 4, borderRadius: 2, marginRight: 3 },
  chipText: { fontSize: 7, fontWeight: '500', flex: 1 },
  moreText: { fontSize: 7, color: '#94a3b8', paddingLeft: 3 },

  divider: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  dividerInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
  },

  panelSection: {},
  sideHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  sideDate: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sideDay: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  sideScroll: { flex: 1, paddingHorizontal: 16 },
  panelBlock: { marginBottom: 8 },
  panelReorderRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 4, gap: 8 },
  arrowBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  arrowBtnText: { fontSize: 14, color: '#94a3b8' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 10, marginBottom: 6, letterSpacing: 0.5 },
  planBadge: { fontSize: 10, fontWeight: '700', color: '#fff', backgroundColor: '#3b82f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  planSubLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 6, marginBottom: 4 },
  planItem: { backgroundColor: '#ffffff', borderLeftWidth: 3, borderRadius: 6, padding: 10, marginBottom: 4 },
  planItemSubj: { fontSize: 10, fontWeight: '700' },
  planItemName: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  planItemRevBadge: { fontSize: 10, fontWeight: '700', color: '#f59e0b', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start' },
  themeBox: { backgroundColor: '#fffbd0', borderRadius: 10, padding: 12, marginBottom: 4 },
  themeInput: { fontSize: 14, color: '#92400e', minHeight: 36, padding: 0 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  topicCard: { borderRadius: 10, padding: 12, marginBottom: 6 },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topicDot: { width: 8, height: 8, borderRadius: 4 },
  topicSubject: { fontSize: 11, fontWeight: '700', flex: 1 },
  removeBtn: { fontSize: 14, color: '#ef4444', fontWeight: '700', paddingHorizontal: 6 },
  topicName: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  revRow: { flexDirection: 'row', marginTop: 8, gap: 6, flexWrap: 'wrap' },
  revCb: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  revCbDone: { backgroundColor: '#dcfce7' },
  revCbText: { fontSize: 11, color: '#475569' },
  revCbTextDone: { color: '#166534', fontWeight: '700' },
  revDueCard: { borderRadius: 8, padding: 10, marginBottom: 4 },
  revDueHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revDueBadge: { fontSize: 10, fontWeight: '700', color: '#92400e', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  revDueFrom: { fontSize: 10, color: '#b45309' },
  revDueName: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  revDueSubj: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  fab: { position: 'absolute', right: 20, bottom: 180, width: 52, height: 52, borderRadius: 26, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalDate: { fontSize: 13, color: '#94a3b8', marginTop: 2, marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6, marginTop: 8 },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subjectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  subjectBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chapterList: { maxHeight: 200, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 4 },
  chapterOption: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  chapterOptionSelected: { backgroundColor: '#eff6ff' },
  chapterOptionText: { fontSize: 14, color: '#334155' },
  chapterOptionTextSelected: { color: '#3b82f6', fontWeight: '700' },
  previewSection: { marginTop: 8 },
  previewRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  previewItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  previewLabel: { fontSize: 10, fontWeight: '700' },
  previewDate: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  cancelBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  assignBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  assignBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
