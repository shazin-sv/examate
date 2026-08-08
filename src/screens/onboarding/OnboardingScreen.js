import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, FlatList, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db, profile } from '../../lib/supabase';
import { downloadTemplate, importFromExcel } from '../../lib/xlsx';

const STEP_TITLES = ['Study Rule', 'Subjects', 'Chapters', 'Exams'];
const TOTAL_STEPS = 4;

const RULES = [
  { id: '1-4-7', name: '1-4-7', desc: 'Study today, revise tomorrow, then day 4, then day 7. Best for long-term retention.' },
  { id: '1-3-7', name: '1-3-7', desc: 'Study today, revise day 3, then day 7. Good balance of spacing.' },
  { id: '1-2-4-7', name: '1-2-4-7', desc: 'Study today, revise day 1, 2, 4, 7. More frequent early reviews.' },
  { id: '2-5-10', name: '2-5-10', desc: 'Study today, revise day 2, 5, 10. More spread out for busy schedules.' },
  { id: 'daily', name: 'Daily', desc: 'Revise every single day until the exam. Maximum reinforcement.' },
];

const PRESET_SUBJECTS = [
  { name: 'Physics', color: '#3b82f6' },
  { name: 'CHE', color: '#ef4444' },
  { name: 'MATH', color: '#22c55e' },
  { name: 'Computer Science', color: '#06b6d4' },
  { name: 'English', color: '#a855f7' },
  { name: 'Hindi', color: '#f97316' },
];

const EXAM_PRESETS = [
  { name: '1st Term Exam' },
  { name: '2nd Term Exam' },
  { name: '3rd Term Exam' },
  { name: 'Public Exam' },
  { name: 'Mid Term' },
  { name: 'Model Exam' },
  { name: 'Revision Test' },
  { name: 'Unit Test' },
];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [selectedRule, setSelectedRule] = useState('1-4-7');
  const [subjects, setSubjects] = useState(PRESET_SUBJECTS.map(s => ({ ...s, selected: true })));
  const [newSubjectName, setNewSubjectName] = useState('');
  const [chaptersBySubject, setChaptersBySubject] = useState({});
  const [activeSubject, setActiveSubject] = useState(null);
  const [newChapter, setNewChapter] = useState('');
  const [exams, setExams] = useState(EXAM_PRESETS.slice(0, 2).map(e => ({ ...e, selected: true, date: '', tbd: false })));
  const [newExamName, setNewExamName] = useState('');
  const [datePickerIdx, setDatePickerIdx] = useState(null);
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  const selectedSubjects = subjects.filter(s => s.selected);
  const activeSubjectObj = subjects.find(s => s.name === activeSubject);

  // ── STEP 1: RULES ──
  function renderStep1() {
    return (
      <ScrollView style={s.stepScroll} showsVerticalScrollIndicator={false}>
        <Text style={s.stepDesc}>Choose how you want to space your revision sessions. You can change this later.</Text>
        {RULES.map(rule => (
          <TouchableOpacity
            key={rule.id}
            style={[s.ruleCard, selectedRule === rule.id && s.ruleCardSelected]}
            onPress={() => setSelectedRule(rule.id)}
          >
            <View style={s.ruleHeader}>
              <Text style={[s.ruleName, selectedRule === rule.id && s.ruleNameSelected]}>{rule.name}</Text>
              {selectedRule === rule.id && <Text style={s.ruleCheck}>✓</Text>}
            </View>
            <Text style={s.ruleDesc}>{rule.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  // ── STEP 2: SUBJECTS ──
  function renderStep2() {
    return (
      <ScrollView style={s.stepScroll} showsVerticalScrollIndicator={false}>
        <Text style={s.stepDesc}>Select the subjects you study. Toggle on/off, or add your own.</Text>
        {subjects.map((subj, idx) => (
          <TouchableOpacity
            key={idx}
            style={[s.subjectCard, subj.selected && { backgroundColor: subj.color + '15' }]}
            onPress={() => {
              const updated = [...subjects];
              updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
              setSubjects(updated);
            }}
          >
            <View style={[s.subjectDot, { backgroundColor: subj.color }]} />
            <Text style={s.subjectName}>{subj.name}</Text>
            <Text style={[s.subjectToggle, subj.selected && { color: '#22c55e' }]}>
              {subj.selected ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={s.addRow}>
          <TextInput
            style={s.addInput}
            placeholder="Add custom subject..."
            placeholderTextColor="#94a3b8"
            value={newSubjectName}
            onChangeText={setNewSubjectName}
          />
          <TouchableOpacity
            style={s.addBtnSmall}
            onPress={() => {
              const name = newSubjectName.trim();
              if (!name) return;
              if (subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) {
                Alert.alert('Exists', 'Subject already exists.');
                return;
              }
              const hue = Math.floor(Math.random() * 360);
              setSubjects([...subjects, { name, color: `hsl(${hue}, 60%, 50%)`, selected: true }]);
              setNewSubjectName('');
            }}
          >
            <Text style={s.addBtnSmallText}>Add</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── STEP 3: CHAPTERS ──
  function renderStep3() {
    if (!activeSubject) {
      return (
        <ScrollView style={s.stepScroll} showsVerticalScrollIndicator={false}>
          <Text style={s.stepDesc}>Tap a subject to add chapters. No presets — add what your board teaches.</Text>
          <View style={s.excelRow}>
            <TouchableOpacity style={s.excelBtn} onPress={async () => {
              try {
                const subjects = selectedSubjects.map(s => ({
                  name: s.name,
                  chapters: chaptersBySubject[s.name] || [],
                }));
                await downloadTemplate(subjects);
              } catch (e) {
                Alert.alert('Error', 'Could not create template: ' + e.message);
              }
            }}>
              <Text style={s.excelBtnText}>📥 Download Template</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.excelBtn, s.excelBtnAlt]} onPress={async () => {
              const imported = await importFromExcel();
              if (!imported) return;
              const updated = { ...chaptersBySubject };
              for (const [subjName, chapters] of Object.entries(imported)) {
                const existing = updated[subjName] || [];
                const merged = [...existing];
                chapters.forEach(ch => {
                  if (!merged.includes(ch)) merged.push(ch);
                });
                updated[subjName] = merged;
              }
              setChaptersBySubject(updated);
              Alert.alert('Imported', 'Chapters imported successfully.');
            }}>
              <Text style={s.excelBtnText}>📤 Upload Excel</Text>
            </TouchableOpacity>
          </View>
          {selectedSubjects.map(subj => {
            const chaps = chaptersBySubject[subj.name] || [];
            return (
              <TouchableOpacity
                key={subj.name}
                style={[s.subjectCard, { backgroundColor: subj.color + '10' }]}
                onPress={() => setActiveSubject(subj.name)}
              >
                <View style={[s.subjectDot, { backgroundColor: subj.color }]} />
                <Text style={s.subjectName}>{subj.name}</Text>
                <Text style={s.chapterCount}>{chaps.length} chapters</Text>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      );
    }

    const chaps = chaptersBySubject[activeSubject] || [];
    return (
      <View style={s.chapterEditor}>
        <TouchableOpacity onPress={() => setActiveSubject(null)} style={s.backBtn}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.chapterSubject}>{activeSubjectObj?.name}</Text>

        <View style={s.addRow}>
          <TextInput
            style={[s.addInput, { flex: 1 }]}
            placeholder="Chapter name..."
            placeholderTextColor="#94a3b8"
            value={newChapter}
            onChangeText={setNewChapter}
            onSubmitEditing={() => {
              const name = newChapter.trim();
              if (!name) return;
              if (chaps.includes(name)) {
                Alert.alert('Exists', 'Chapter already added.');
                return;
              }
              setChaptersBySubject({
                ...chaptersBySubject,
                [activeSubject]: [...chaps, name],
              });
              setNewChapter('');
            }}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.addBtnSmall, { backgroundColor: activeSubjectObj?.color || '#3b82f6' }]}
            onPress={() => {
              const name = newChapter.trim();
              if (!name) return;
              if (chaps.includes(name)) {
                Alert.alert('Exists', 'Chapter already added.');
                return;
              }
              setChaptersBySubject({
                ...chaptersBySubject,
                [activeSubject]: [...chaps, name],
              });
              setNewChapter('');
            }}
          >
            <Text style={s.addBtnSmallText}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {chaps.map((ch, i) => (
            <View key={i} style={[s.chapterRow, i % 2 === 0 && { backgroundColor: '#fafbfc' }]}>
              <Text style={s.chapterNum}>{i + 1}.</Text>
              <Text style={s.chapterName}>{ch}</Text>
              <TouchableOpacity onPress={() => {
                const updated = chaps.filter((_, j) => j !== i);
                setChaptersBySubject({ ...chaptersBySubject, [activeSubject]: updated });
              }}>
                <Text style={s.chapterDelete}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {chaps.length === 0 && (
            <Text style={s.emptyText}>No chapters yet. Add them above.</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── STEP 4: EXAMS ──
  function renderStep4() {
    return (
      <ScrollView style={s.stepScroll} showsVerticalScrollIndicator={false}>
        <Text style={s.stepDesc}>Add your upcoming exams. Toggle to include/exclude. First exam needs a date.</Text>
        {exams.map((exam, idx) => (
          <View key={idx} style={s.examCard}>
            <TouchableOpacity
              style={s.examToggle}
              onPress={() => {
                const updated = [...exams];
                updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
                setExams(updated);
              }}
            >
              <Text style={[s.examCheck, exam.selected && { color: '#22c55e' }]}>
                {exam.selected ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
            <View style={s.examInfo}>
              <Text style={s.examName}>{exam.name}</Text>
              {exam.selected && (
                <View style={s.examDateRow}>
                  {exam.tbd ? (
                    <Text style={s.examDateTbd}>Date not announced yet</Text>
                  ) : exam.date ? (
                    <Text style={s.examDateSet}>{exam.date}</Text>
                  ) : (
                    <Text style={s.examDateNeeded}>Date required</Text>
                  )}
                  <TouchableOpacity
                    style={s.examDateBtn}
                    onPress={() => {
                      Alert.alert('Set Date', 'Choose an option:', [
                        { text: 'Pick Date', onPress: () => {
                          setDatePickerIdx(idx);
                        }},
                        { text: 'Date not announced', onPress: () => {
                          const updated = [...exams];
                          updated[idx] = { ...updated[idx], tbd: true, date: '' };
                          setExams(updated);
                        }},
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }}
                  >
                    <Text style={s.examDateBtnText}>{exam.date || exam.tbd ? 'Edit' : 'Set'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
        <View style={s.addRow}>
          <TextInput
            style={s.addInput}
            placeholder="Add custom exam..."
            placeholderTextColor="#94a3b8"
            value={newExamName}
            onChangeText={setNewExamName}
          />
          <TouchableOpacity
            style={s.addBtnSmall}
            onPress={() => {
              const name = newExamName.trim();
              if (!name) return;
              setExams([...exams, { name, selected: true, date: '', tbd: false }]);
              setNewExamName('');
            }}
          >
            <Text style={s.addBtnSmallText}>Add</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── VALIDATION ──
  function canProceed() {
    if (step === 1) return true;
    if (step === 2) return selectedSubjects.length > 0;
    if (step === 3) {
      const totalChapters = Object.values(chaptersBySubject).reduce((sum, arr) => sum + arr.length, 0);
      return totalChapters > 0;
    }
    if (step === 4) {
      const selectedExams = exams.filter(e => e.selected);
      if (selectedExams.length === 0) return false;
      const firstSelected = selectedExams[0];
      return !!firstSelected.date || firstSelected.tbd;
    }
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await profile.update({ study_rule: selectedRule });

      const subjectIds = {};
      for (let i = 0; i < selectedSubjects.length; i++) {
        const s = selectedSubjects[i];
        const data = await db.addSubject({ name: s.name, color: s.color, position: i });
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) subjectIds[s.name] = row.id;
      }

      for (const [subjName, chapters] of Object.entries(chaptersBySubject)) {
        const subjectId = subjectIds[subjName];
        if (!subjectId || chapters.length === 0) continue;
        const rows = chapters.map((name, i) => ({
          subject_id: subjectId,
          name,
          position: i,
        }));
        await db.addChaptersBulk(rows);
      }

      for (let i = 0; i < exams.length; i++) {
        const exam = exams[i];
        if (!exam.selected) continue;
        await db.addExam({
          name: exam.name,
          exam_date: exam.date || null,
          date_tbd: exam.tbd,
          position: i,
        });
      }

      await profile.setOnboardingComplete();
      onComplete();
    } catch (e) {
      console.log('Onboarding save error:', e);
      Alert.alert('Error', 'Something went wrong saving your setup. Please try again.');
    }
    setSaving(false);
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>The Comeback</Text>
        <Text style={s.stepIndicator}>Step {step} of {TOTAL_STEPS} — {STEP_TITLES[step - 1]}</Text>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>
      </View>

      <View style={s.body}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>

      {datePickerIdx !== null && (
        <DateTimePicker
          value={datePickerValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setDatePickerIdx(null);
            }
            if (event.type === 'dismissed') {
              setDatePickerIdx(null);
              return;
            }
            if (selectedDate) {
              setDatePickerValue(selectedDate);
              const y = selectedDate.getFullYear();
              const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const d = String(selectedDate.getDate()).padStart(2, '0');
              const dateStr = `${y}-${m}-${d}`;
              const updated = [...exams];
              updated[datePickerIdx] = { ...updated[datePickerIdx], date: dateStr, tbd: false };
              setExams(updated);
              if (Platform.OS === 'ios') {
                setDatePickerIdx(null);
              }
            }
          }}
        />
      )}

      <View style={s.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={s.backFooterBtn}
            onPress={() => { setStep(step - 1); setActiveSubject(null); }}
            disabled={saving}
          >
            <Text style={s.backFooterBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[s.nextBtn, !canProceed() && s.nextBtnDisabled]}
            onPress={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            <Text style={s.nextBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.nextBtn, (!canProceed() || saving) && s.nextBtnDisabled]}
            onPress={handleFinish}
            disabled={!canProceed() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.nextBtnText}>Start Learning</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  stepIndicator: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  progressBg: { height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginTop: 12 },
  progressFill: { height: 4, backgroundColor: '#3b82f6', borderRadius: 2 },
  body: { flex: 1 },
  stepScroll: { flex: 1, paddingHorizontal: 24 },
  stepDesc: { fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  backFooterBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9' },
  backFooterBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  nextBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  ruleCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 10 },
  ruleCardSelected: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ruleName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ruleNameSelected: { color: '#3b82f6' },
  ruleCheck: { fontSize: 18, fontWeight: '700', color: '#3b82f6' },
  ruleDesc: { fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 18 },

  subjectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 8 },
  subjectDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  subjectName: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
  subjectToggle: { fontSize: 12, fontWeight: '800', color: '#cbd5e1', letterSpacing: 1 },
  chapterCount: { fontSize: 12, color: '#94a3b8', marginRight: 8 },
  arrow: { fontSize: 18, color: '#94a3b8' },

  excelRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  excelBtn: { flex: 1, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  excelBtnAlt: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  excelBtnText: { fontSize: 12, fontWeight: '700', color: '#166534' },

  addRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  addInput: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  addBtnSmall: { backgroundColor: '#3b82f6', paddingHorizontal: 18, borderRadius: 10, justifyContent: 'center' },
  addBtnSmallText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  chapterEditor: { flex: 1, paddingHorizontal: 24 },
  backBtn: { marginTop: 8, marginBottom: 4 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  chapterSubject: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  chapterNum: { fontSize: 14, fontWeight: '700', color: '#94a3b8', width: 30 },
  chapterName: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1 },
  chapterDelete: { fontSize: 14, color: '#ef4444', fontWeight: '700', paddingHorizontal: 8 },
  emptyText: { fontSize: 13, color: '#cbd5e1', textAlign: 'center', marginTop: 24 },

  examCard: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 8 },
  examToggle: { marginRight: 12, justifyContent: 'center' },
  examCheck: { fontSize: 20, color: '#cbd5e1' },
  examInfo: { flex: 1 },
  examName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  examDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  examDateSet: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  examDateTbd: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  examDateNeeded: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  examDateBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  examDateBtnText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
});
