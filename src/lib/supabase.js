// Lightweight Supabase REST client — no SDK needed
const URL = 'https://ksqqfcqnpnyixsvwtcli.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcXFmY3FucG55aXhzdnd0Y2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwOTQzNDUsImV4cCI6MjEwMTY3MDM0NX0.6UiCRpBRbCMMGFG0BKpFN2osvKvubsT8J9Lbqndee40';

const headers = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function restGet(table, query = '') {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers });
  return res.json();
}

async function restInsert(table, row) {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST', headers, body: JSON.stringify(row),
  });
  return res.json();
}

async function restUpdate(table, data, filter) {
  const res = await fetch(`${URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH', headers, body: JSON.stringify(data),
  });
  return res.json();
}

async function restDelete(table, filter) {
  const res = await fetch(`${URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE', headers,
  });
  return res.json();
}

// ── Typed helpers ──
export const db = {
  // schedule
  getSchedule: () => restGet('schedule', 'select=*'),
  addSchedule: (row) => restInsert('schedule', row),
  deleteSchedule: (id) => restDelete('schedule', `id=eq.${id}`),

  // themes
  getThemes: () => restGet('themes', 'select=*'),
  upsertTheme: async (dateKey, text) => {
    const existing = await restGet('themes', `select=id&date_key=eq.${dateKey}`);
    if (existing.length > 0) {
      return restUpdate('themes', { theme_text: text }, `date_key=eq.${dateKey}`);
    }
    return restInsert('themes', { date_key: dateKey, theme_text: text });
  },

  // revisions
  getRevisions: () => restGet('revisions', 'select=*'),
  upsertRevision: async (tag, data) => {
    const existing = await restGet('revisions', `select=id&tag=eq.${encodeURIComponent(tag)}`);
    if (existing.length > 0) {
      return restUpdate('revisions', data, `tag=eq.${encodeURIComponent(tag)}`);
    }
    return restInsert('revisions', { tag, ...data });
  },

  // custom chapters
  getCustomChapters: () => restGet('custom_chapters', 'select=*'),
  addCustomChapter: (row) => restInsert('custom_chapters', row),
  deleteCustomChapter: (id) => restDelete('custom_chapters', `id=eq.${id}`),
  updateCustomChapter: (id, name) => restUpdate('custom_chapters', { chapter_name: name }, `id=eq.${id}`),
};
