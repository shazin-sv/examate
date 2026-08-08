import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSignIn() {
    if (!signInLoaded || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email.trim().toLowerCase(), password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      }
    } catch (e) {
      if (e.errors?.[0]?.code === 'form_identifier_not_found') {
        await handleSignUp();
      } else {
        Alert.alert('Sign in failed', e.errors?.[0]?.message || e.message);
      }
    }
    setLoading(false);
  }

  async function handleSignUp() {
    if (!signUpLoaded) return;
    try {
      const result = await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (e) {
      Alert.alert('Sign up failed', e.errors?.[0]?.message || e.message);
    }
  }

  async function handleVerify() {
    if (!signUpLoaded || !code) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      }
    } catch (e) {
      Alert.alert('Verification failed', e.errors?.[0]?.message || e.message);
    }
    setLoading(false);
  }

  if (pendingVerification) {
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.header}>
            <Text style={s.logo}>The Comeback</Text>
            <Text style={s.subtitle}>Check your email for a verification code.</Text>
          </View>
          <TextInput
            style={s.input}
            placeholder="Verification code"
            placeholderTextColor="#94a3b8"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={s.btn} onPress={handleVerify} disabled={loading}>
            <Text style={s.btnText}>{loading ? 'Verifying...' : 'Verify'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.logo}>The Comeback</Text>
          <Text style={s.subtitle}>Sign in or create an account to start.</Text>
        </View>

        <Text style={s.label}>Email</Text>
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

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          placeholder="At least 6 characters"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSignIn} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Loading...' : 'Continue'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { marginBottom: 30 },
  logo: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0f172a' },
  btn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
