import React from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { ScalePressable } from '../../components/AnimatedPressable';

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
            <View style={s.logoContainer}>
              <Text style={s.logo}>The Comeback</Text>
            </View>
            <Text style={s.subtitle}>Check your email for a verification code.</Text>
          </View>
          <Text style={s.label}>Verification Code</Text>
          <TextInput
            style={s.input}
            placeholder="Enter 6-digit code"
            placeholderTextColor="#94a3b8"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <ScalePressable style={s.btn} onPress={handleVerify} disabled={loading}>
            <Text style={s.btnText}>{loading ? 'Verifying...' : 'Verify'}</Text>
          </ScalePressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View style={s.logoContainer}>
            <Text style={s.logo}>The Comeback</Text>
          </View>
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

        <ScalePressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSignIn} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Loading...' : 'Continue'}</Text>
        </ScalePressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafbfc' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { marginBottom: 36 },
  logoContainer: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logo: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 16, lineHeight: 22 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
