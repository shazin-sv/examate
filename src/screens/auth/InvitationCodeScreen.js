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
              placeholderTextColor="#b5b5b5"
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
              placeholderTextColor="#b5b5b5"
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
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { marginBottom: 36 },
  logoContainer: {
    backgroundColor: '#545454',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  logo: { fontSize: 28, fontWeight: '900', color: '#f0f0f0', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#808080', marginTop: 16, lineHeight: 22 },
  form: {},
  label: { fontSize: 11, fontWeight: '700', color: '#808080', marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#545454',
  },
  btn: {
    backgroundColor: '#545454',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#f0f0f0' },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14, color: '#808080' },
});
