import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { auth } from '../../lib/supabase';

export default function VerifyScreen({ route, navigation }) {
  const { email } = route.params || {};
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function handleVerify() {
    if (!token.trim()) {
      Alert.alert('Enter code', 'Enter the verification code from your email.');
      return;
    }
    setLoading(true);
    const { error } = await auth.verifyOtp(email, token.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Verification failed', error);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    const { error } = await auth.resendOtp(email);
    setResendLoading(false);
    if (error) {
      Alert.alert('Resend failed', error);
    } else {
      Alert.alert('Code sent', `A new code was sent to ${email}`);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.logo}>Verify Email</Text>
          <Text style={s.subtitle}>Enter the 6-digit code sent to{'\n'}{email}</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Verification Code</Text>
          <TextInput
            style={[s.input, s.codeInput]}
            placeholder="000000"
            placeholderTextColor="#94a3b8"
            value={token}
            onChangeText={setToken}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} disabled={resendLoading} style={s.linkBtn}>
            <Text style={[s.linkText, resendLoading && { opacity: 0.5 }]}>
              {resendLoading ? 'Sending...' : "Didn't get a code? Resend"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={s.linkBtn}>
            <Text style={s.linkText}>Back to Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { marginBottom: 40 },
  logo: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 8, lineHeight: 22 },
  form: {},
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0f172a' },
  codeInput: { fontSize: 24, fontWeight: '700', letterSpacing: 8, paddingVertical: 18 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
});
