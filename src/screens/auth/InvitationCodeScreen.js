import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { auth } from '../../lib/supabase';
import { ScalePressable } from '../../components/AnimatedPressable';

const VALID_CODE = 'FUCKAI';

export default function InvitationCodeScreen() {
  const [step, setStep] = useState('code');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');

  function handleCodeSubmit() {
    if (code.trim().toUpperCase() !== VALID_CODE) {
      Alert.alert('Invalid code', 'That invitation code is not valid.');
      return;
    }
    setStep('email');
  }

  async function handleEmailSubmit() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter your email address.');
      return;
    }
    await auth.signIn(email.trim().toLowerCase());
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View style={s.logoContainer}>
            <Text style={s.logo}>The Comeback</Text>
          </View>
          <Text style={s.subtitle}>
            {step === 'code' ? 'Enter your invitation code to continue.' : 'Now enter your email.'}
          </Text>
        </View>

        {step === 'code' ? (
          <View style={s.form}>
            <Text style={s.label}>INVITATION CODE</Text>
            <TextInput
              style={s.input}
              placeholder="Enter code"
              placeholderTextColor="#94a3b8"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <ScalePressable style={s.btn} onPress={handleCodeSubmit}>
              <Text style={s.btnText}>Continue</Text>
            </ScalePressable>
          </View>
        ) : (
          <View style={s.form}>
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

            <ScalePressable style={s.btn} onPress={handleEmailSubmit}>
              <Text style={s.btnText}>Enter The Comeback</Text>
            </ScalePressable>

            <ScalePressable onPress={() => { setStep('code'); setCode(''); }} style={s.linkBtn}>
              <Text style={s.linkText}>← Back to code</Text>
            </ScalePressable>
          </View>
        )}
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
  form: {},
  label: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
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
  btnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14, color: '#64748b' },
});
