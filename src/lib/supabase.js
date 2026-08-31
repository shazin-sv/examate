import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const URL = 'https://ksqqfcqnpnyixsvwtcli.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcXFmY3FucG55aXhzdnd0Y2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwOTQzNDUsImV4cCI6MjEwMTY3MDM0NX0.6UiCRpBRbCMMGFG0BKpFN2osvKvubsT8J9Lbqndee40';

const webStorage = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
};

let storage = webStorage;
if (Platform.OS !== 'web') {
  try {
    const SecureStore = require('expo-secure-store');
    storage = {
      getItem: async (key) => SecureStore.getItemAsync(key),
      setItem: async (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: async (key) => SecureStore.deleteItemAsync(key),
    };
  } catch (e) {
    storage = webStorage;
  }
}

export const supabase = createClient(URL, KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const auth = {
  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    return { data, error: error?.message || null };
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error: error?.message || null };
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  },
  getUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
};

export const profile = {
  get: async () => {
    const user = await auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) return data;
    await supabase.from('profiles').insert({ id: user.id, email: user.email, onboarding_complete: false });
    const { data: retry } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return retry || null;
  },
  update: async (data) => {
    const user = await auth.getUser();
    if (!user) return;
    return supabase.from('profiles').update(data).eq('id', user.id);
  },
  setOnboardingComplete: async () => {
    return profile.update({ onboarding_complete: true });
  },
};

export const db = {
  getSchedule: async () => {
    const user = await auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('schedule').select('*').eq('user_id', user.id);
    return data || [];
  },
  addSchedule: async (row) => {
    const user = await auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('schedule').insert({ ...row, user_id: user.id }).select();
    return data;
  },
  deleteSchedule: async (id) => {
    await supabase.from('schedule').delete().eq('id', id);
  },

  getThemes: async () => {
    const user = await auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('themes').select('*').eq('user_id', user.id);
    return data || [];
  },
  upsertTheme: async (dateKey, text) => {
    const user = await auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from('themes').select('id').eq('date_key', dateKey).eq('user_id', user.id);
    if (existing?.length > 0) {
      return supabase.from('themes').update({ theme_text: text }).eq('date_key', dateKey).eq('user_id', user.id);
    }
    return supabase.from('themes').insert({ date_key: dateKey, theme_text: text, user_id: user.id });
  },

  getRevisions: async () => {
    const user = await auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('revisions').select('*').eq('user_id', user.id);
    return data || [];
  },
  upsertRevision: async (tag, data) => {
    const user = await auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from('revisions').select('id').eq('tag', tag).eq('user_id', user.id);
    if (existing?.length > 0) {
      return supabase.from('revisions').update(data).eq('tag', tag).eq('user_id', user.id);
    }
    return supabase.from('revisions').insert({ tag, ...data, user_id: user.id });
  },

  getCustomChapters: async () => {
    const user = await auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('custom_chapters').select('*').eq('user_id', user.id);
    return data || [];
  },
  addCustomChapter: async (row) => {
    const user = await auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('custom_chapters').insert({ ...row, user_id: user.id }).select();
    return data;
  },
  deleteCustomChapter: async (id) => {
    await supabase.from('custom_chapters').delete().eq('id', id);
  },
  updateCustomChapter: async (id, name) => {
    await supabase.from('custom_chapters').update({ chapter_name: name }).eq('id', id);
  },

  getSubjects: async () => {
    const user = await auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('subjects').select('*').eq('user_id', user.id).order('position');
    return data || [];
  },
  addSubject: async (row) => {
    const user = await auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('subjects').insert({ ...row, user_id: user.id }).select();
    return data;
  },
  deleteSubject: async (id) => {
    await supabase.from('subjects').delete().eq('id', id);
  },
  updateSubject: async (id, data) => {
    await supabase.from('subjects').update(data).eq('id', id);
  },

  getChapters: async () => {
    const user = await auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('chapters').select('*').eq('user_id', user.id).order('position');
    return data || [];
  },
  addChapter: async (row) => {
    const user = await auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('chapters').insert({ ...row, user_id: user.id }).select();
    return data;
  },
  deleteChapter: async (id) => {
    await supabase.from('chapters').delete().eq('id', id);
  },
  updateChapter: async (id, data) => {
    await supabase.from('chapters').update(data).eq('id', id);
  },
  addChaptersBulk: async (rows) => {
    const user = await auth.getUser();
    if (!user || !rows.length) return [];
    const withUser = rows.map(r => ({ ...r, user_id: user.id }));
    const { data } = await supabase.from('chapters').insert(withUser).select();
    return data || [];
  },

  getExams: async () => {
    const user = await auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('exams').select('*').eq('user_id', user.id).order('position');
    return data || [];
  },
  addExam: async (row) => {
    const user = await auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('exams').insert({ ...row, user_id: user.id }).select();
    return data;
  },
  deleteExam: async (id) => {
    await supabase.from('exams').delete().eq('id', id);
  },
  updateExam: async (id, data) => {
    await supabase.from('exams').update(data).eq('id', id);
  },

  getProfile: async () => {
    const user = await auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return data || null;
  },
  updateProfile: async (data) => {
    const user = await auth.getUser();
    if (!user) return;
    return supabase.from('profiles').update(data).eq('id', user.id);
  },
};
