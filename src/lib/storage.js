import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'examate:';

const KEYS = {
  profile: `${PREFIX}profile`,
  schedule: `${PREFIX}schedule`,
  themes: `${PREFIX}themes`,
  revisions: `${PREFIX}revisions`,
  customChapters: `${PREFIX}custom_chapters`,
  subjects: `${PREFIX}subjects`,
  chapters: `${PREFIX}chapters`,
  exams: `${PREFIX}exams`,
};

let idCounter = 0;
function genId() {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}`;
}

async function readList(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log('Storage read error:', key, e);
    return [];
  }
}

async function writeList(key, rows) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(rows));
  } catch (e) {
    console.log('Storage write error:', key, e);
  }
}

function sortByPosition(rows) {
  return [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function collection(key, { byPosition = false } = {}) {
  return {
    list: async () => {
      const rows = await readList(key);
      return byPosition ? sortByPosition(rows) : rows;
    },
    insert: async (row) => {
      const rows = await readList(key);
      const newRow = { id: genId(), created_at: new Date().toISOString(), ...row };
      rows.push(newRow);
      await writeList(key, rows);
      return [newRow];
    },
    insertBulk: async (items) => {
      const rows = await readList(key);
      const newRows = items.map((row, i) => ({
        id: genId(),
        created_at: new Date().toISOString(),
        position: i,
        ...row,
      }));
      rows.push(...newRows);
      await writeList(key, rows);
      return newRows;
    },
    remove: async (id) => {
      const rows = await readList(key);
      await writeList(key, rows.filter((r) => r.id !== id));
    },
    update: async (id, data) => {
      const rows = await readList(key);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      rows[idx] = { ...rows[idx], ...data };
      await writeList(key, rows);
      return rows[idx];
    },
    find: async (predicate) => {
      const rows = await readList(key);
      return rows.find(predicate) || null;
    },
    upsertBy: async (match, data) => {
      const rows = await readList(key);
      const idx = rows.findIndex(match);
      if (idx !== -1) {
        rows[idx] = { ...rows[idx], ...data };
        await writeList(key, rows);
        return rows[idx];
      }
      const newRow = { id: genId(), created_at: new Date().toISOString(), ...data };
      rows.push(newRow);
      await writeList(key, rows);
      return newRow;
    },
  };
}

const scheduleCol = collection(KEYS.schedule);
const themesCol = collection(KEYS.themes);
const revisionsCol = collection(KEYS.revisions);
const customChaptersCol = collection(KEYS.customChapters);
const subjectsCol = collection(KEYS.subjects, { byPosition: true });
const chaptersCol = collection(KEYS.chapters, { byPosition: true });
const examsCol = collection(KEYS.exams, { byPosition: true });

const DEFAULT_PROFILE = {
  display_name: '',
  email: '',
  onboarding_complete: false,
  study_rule: '1-4-7',
};

async function readProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.profile);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch (e) {
    console.log('Profile read error:', e);
    return { ...DEFAULT_PROFILE };
  }
}

async function writeProfile(data) {
  try {
    await AsyncStorage.setItem(KEYS.profile, JSON.stringify(data));
  } catch (e) {
    console.log('Profile write error:', e);
  }
}

export const profile = {
  get: async () => {
    const p = await readProfile();
    if (!p.display_name) await writeProfile(p);
    return p;
  },
  update: async (data) => {
    const p = await readProfile();
    const next = { ...p, ...data };
    await writeProfile(next);
    return next;
  },
  setOnboardingComplete: async () => {
    return profile.update({ onboarding_complete: true });
  },
};

export const db = {
  getSchedule: async () => scheduleCol.list(),
  addSchedule: async (row) => scheduleCol.insert(row),
  deleteSchedule: async (id) => scheduleCol.remove(id),

  getThemes: async () => themesCol.list(),
  upsertTheme: async (dateKey, text) =>
    themesCol.upsertBy((r) => r.date_key === dateKey, { date_key: dateKey, theme_text: text }),

  getRevisions: async () => revisionsCol.list(),
  upsertRevision: async (tag, data) =>
    revisionsCol.upsertBy((r) => r.tag === tag, { tag, ...data }),

  getCustomChapters: async () => customChaptersCol.list(),
  addCustomChapter: async (row) => customChaptersCol.insert(row),
  deleteCustomChapter: async (id) => customChaptersCol.remove(id),
  updateCustomChapter: async (id, name) => customChaptersCol.update(id, { chapter_name: name }),

  getSubjects: async () => subjectsCol.list(),
  addSubject: async (row) => subjectsCol.insert(row),
  deleteSubject: async (id) => {
    await subjectsCol.remove(id);
    const chapters = await readList(KEYS.chapters);
    await writeList(KEYS.chapters, chapters.filter((c) => c.subject_id !== id));
  },
  updateSubject: async (id, data) => subjectsCol.update(id, data),

  getChapters: async () => chaptersCol.list(),
  addChapter: async (row) => chaptersCol.insert(row),
  deleteChapter: async (id) => chaptersCol.remove(id),
  updateChapter: async (id, data) => chaptersCol.update(id, data),
  addChaptersBulk: async (rows) => chaptersCol.insertBulk(rows),

  getExams: async () => examsCol.list(),
  addExam: async (row) => examsCol.insert(row),
  deleteExam: async (id) => examsCol.remove(id),
  updateExam: async (id, data) => examsCol.update(id, data),

  getProfile: async () => profile.get(),
  updateProfile: async (data) => profile.update(data),
};
