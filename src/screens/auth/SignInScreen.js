import React from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { auth } from '../../lib/supabase';

export default function SignInScreen({ onAuthChange }) {
  const [mode, setMode] = React.useState('signin');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setLoading(true);
    const { data, error } = await auth.signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', error);
      return;
    }
    if (onAuthChange) onAuthChange();
  }

  async function handleSignUp() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter your name.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { data, error } = await auth.signUp(email.trim().toLowerCase(), password, name.trim());
    console.log('SIGNUP RESULT:', JSON.stringify({ error, hasData: !!data, hasSession: !!data?.session, identities: data?.user?.identities?.length }));
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error);
      return;
    }
    if (data?.session) {
      if (onAuthChange) onAuthChange();
      return;
    }
    setPendingVerification(true);
  }

  async function handleResendCode() {
    const { error } = await auth.signIn(email.trim().toLowerCase(), password);
    if (error && !error.includes('Email not confirmed')) {
      Alert.alert('Resend failed', error);
    } else {
      Alert.alert('Code sent', 'Check your email for a new verification code.');
    }
  }

  if (pendingVerification) {
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.header}>
            <Text style={s.logo}>The Comeback</Text>
            <Text style={s.subtitle}>Check your email and tap the confirmation link, or enter the code below.</Text>
          </View>
          <Pressable style={({ pressed }) => [s.btn, pressed && s.btnPressed]} onPress={async () => {
            setLoading(true);
            const { data, error } = await auth.signIn(email.trim().toLowerCase(), password);
            setLoading(false);
            if (error) {
              Alert.alert('Not confirmed yet', 'Please check your email and tap the confirmation link first, then try again.');
              return;
            }
            if (onAuthChange) onAuthChange();
          }}>
            <Text style={s.btnText}>{loading ? 'Signing in...' : "I've confirmed my email"}</Text>
          </Pressable>
          <Pressable onPress={handleResendCode} style={({ pressed }) => [s.linkBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.linkText}>Didn't get it? <Text style={s.linkBold}>Resend</Text></Text>
          </Pressable>
          <Pressable onPress={() => setPendingVerification(false)} style={({ pressed }) => [s.linkBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.linkText}>Use a different email</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.logo}>The Comeback</Text>
          <Text style={s.subtitle}>{mode === 'signin' ? 'Sign in to continue.' : 'Create your account.'}</Text>
        </View>

        {mode === 'signup' && (
          <>
            <Text style={s.label}>NAME</Text>
            <TextInput
              style={s.input}
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </>
        )}

        <Text style={s.label}>EMAIL</Text>
        <TextInput
          style={s.input}
          placeholder="you@example.com"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={s.label}>PASSWORD</Text>
        <TextInput
          style={s.input}
          placeholder="At least 8 characters"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={({ pressed }) => [s.btn, loading && s.btnDisabled, pressed && s.btnPressed]}
          onPress={mode === 'signin' ? handleSignIn : handleSignUp}
          disabled={loading}
        >
          <Text style={s.btnText}>
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={({ pressed }) => [s.linkBtn, pressed && { opacity: 0.6 }]}>
          <Text style={s.linkText}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={s.linkBold}>{mode === 'signin' ? 'Sign Up' : 'Sign In'}</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, maxWidth: 420, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 32 },
  logo: { fontSize: 24, fontWeight: '600', color: '#0f172a', letterSpacing: -0.4 },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 8, lineHeight: 22 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  btn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.7 },
  btnText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14, color: '#64748b' },
  linkBold: { color: '#0f172a', fontWeight: '600' },
});
