import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { auth } from '../../lib/supabase';

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
          <Text style={s.logo}>The Comeback</Text>
          <Text style={s.subtitle}>
            {step === 'code' ? 'Enter your invitation code to continue.' : 'Now enter your email.'}
          </Text>
        </View>

        {step === 'code' ? (
          <View style={s.form}>
            <Text style={s.label}>Invitation Code</Text>
            <TextInput
              style={s.input}
              placeholder="Enter code"
              placeholderTextColor="#94a3b8"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity style={s.btn} onPress={handleCodeSubmit}>
              <Text style={s.btnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.form}>
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

            <TouchableOpacity style={s.btn} onPress={handleEmailSubmit}>
              <Text style={s.btnText}>Enter The Comeback</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep('code'); setCode(''); }} style={s.linkBtn}>
              <Text style={s.linkText}>← Back to code</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { marginBottom: 40 },
  logo: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 8 },
  form: {},
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0f172a' },
  btn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14, color: '#64748b' },
});
