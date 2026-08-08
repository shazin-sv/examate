import AsyncStorage from '@react-native-async-storage/async-storage';

const URL = 'https://ksqqfcqnpnyixsvwtcli.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcXFmY3FucG55aXhzdnd0Y2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwOTQzNDUsImV4cCI6MjEwMTY3MDM0NX0.6UiCRpBRbCMMGFG0BKpFN2osvKvubsT8J9Lbqndee40';

const USER_KEY = '@comeback_user';
const DEFAULT_USER_ID = '31f0ee46-1267-4d45-88b5-2bd3db5d81cb';

let _userId = null;
let _email = '';
let _listeners = [];

function getHeaders() {
  return {
    'apikey': KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function restGet(table, query = '') {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers: getHeaders() });
  return res.json();
}

async function restInsert(table, row) {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(row),
  });
  return res.json();
}

async function restUpdate(table, data, filter) {
  const res = await fetch(`${URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
}

async function restDelete(table, filter) {
  const res = await fetch(`${URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  return res.json();
}

function uid() {
  return _userId;
}

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

// ── AUTH (local only) ──
export const auth = {
  init: async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        _userId = stored.userId || DEFAULT_USER_ID;
        _email = stored.email || '';
        notifyListeners();
        return { userId: _userId, email: _email };
      }
    } catch (e) { console.log('Auth init error:', e); }
    return null;
  },

  signIn: async (email) => {
    _email = email;
    _userId = DEFAULT_USER_ID;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify({ userId: _userId, email }));
    notifyListeners();
    return { error: null };
  },

  signOut: async () => {
    _userId = null;
    _email = '';
    await AsyncStorage.removeItem(USER_KEY);
    notifyListeners();
  },

  onSessionChange: (fn) => {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(f => f !== fn); };
  },

  isAuthenticated: () => !!_userId,
  userId: uid,
  email: () => _email,
};

// ── PROFILE ──
export const profile = {
  get: async () => {
    const id = uid();
    if (!id) return null;
    const rows = await restGet('profiles', `select=*&id=eq.${id}`);
    return rows?.[0] || null;
  },
  update: async (data) => {
    const id = uid();
    if (!id) return;
    return restUpdate('profiles', data, `id=eq.${id}`);
  },
  setOnboardingComplete: async () => {
    return profile.update({ onboarding_complete: true });
  },
};

// ── DATA ──
export const db = {
  getSchedule: () => {
    const id = uid();
    return id ? restGet('schedule', `select=*&user_id=eq.${id}`) : Promise.resolve([]);
  },
  addSchedule: (row) => restInsert('schedule', { ...row, user_id: uid() }),
  deleteSchedule: (id) => restDelete('schedule', `id=eq.${id}`),

  getThemes: () => {
    const id = uid();
    return id ? restGet('themes', `select=*&user_id=eq.${id}`) : Promise.resolve([]);
  },
  upsertTheme: async (dateKey, text) => {
    const id = uid();
    if (!id) return;
    const existing = await restGet('themes', `select=id&date_key=eq.${dateKey}&user_id=eq.${id}`);
    if (existing.length > 0) {
      return restUpdate('themes', { theme_text: text }, `date_key=eq.${dateKey}&user_id=eq.${id}`);
    }
    return restInsert('themes', { date_key: dateKey, theme_text: text, user_id: id });
  },

  getRevisions: () => {
    const id = uid();
    return id ? restGet('revisions', `select=*&user_id=eq.${id}`) : Promise.resolve([]);
  },
  upsertRevision: async (tag, data) => {
    const id = uid();
    if (!id) return;
    const existing = await restGet('revisions', `select=id&tag=eq.${encodeURIComponent(tag)}&user_id=eq.${id}`);
    if (existing.length > 0) {
      return restUpdate('revisions', data, `tag=eq.${encodeURIComponent(tag)}&user_id=eq.${id}`);
    }
    return restInsert('revisions', { tag, ...data, user_id: id });
  },

  getCustomChapters: () => {
    const id = uid();
    return id ? restGet('custom_chapters', `select=*&user_id=eq.${id}`) : Promise.resolve([]);
  },
  addCustomChapter: (row) => restInsert('custom_chapters', { ...row, user_id: uid() }),
  deleteCustomChapter: (id) => restDelete('custom_chapters', `id=eq.${id}`),
  updateCustomChapter: (id, name) => restUpdate('custom_chapters', { chapter_name: name }, `id=eq.${id}`),

  // ── SUBJECTS ──
  getSubjects: () => {
    const id = uid();
    return id ? restGet('subjects', `select=*&user_id=eq.${id}&order=position`) : Promise.resolve([]);
  },
  addSubject: (row) => restInsert('subjects', { ...row, user_id: uid() }),
  deleteSubject: (id) => restDelete('subjects', `id=eq.${id}`),
  updateSubject: (id, data) => restUpdate('subjects', data, `id=eq.${id}`),

  // ── CHAPTERS ──
  getChapters: () => {
    const id = uid();
    return id ? restGet('chapters', `select=*&user_id=eq.${id}&order=position`) : Promise.resolve([]);
  },
  addChapter: (row) => restInsert('chapters', { ...row, user_id: uid() }),
  deleteChapter: (id) => restDelete('chapters', `id=eq.${id}`),
  updateChapter: (id, data) => restUpdate('chapters', data, `id=eq.${id}`),
  addChaptersBulk: async (rows) => {
    const id = uid();
    if (!id || !rows.length) return [];
    const withUser = rows.map(r => ({ ...r, user_id: id }));
    const res = await fetch(`${URL}/rest/v1/chapters`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(withUser),
    });
    return res.json();
  },

  // ── EXAMS ──
  getExams: () => {
    const id = uid();
    return id ? restGet('exams', `select=*&user_id=eq.${id}&order=position`) : Promise.resolve([]);
  },
  addExam: (row) => restInsert('exams', { ...row, user_id: uid() }),
  deleteExam: (id) => restDelete('exams', `id=eq.${id}`),
  updateExam: (id, data) => restUpdate('exams', data, `id=eq.${id}`),
};
