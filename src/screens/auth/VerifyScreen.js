import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  SafeAreaView, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { auth } from '../../lib/supabase';
import { ScalePressable } from '../../components/AnimatedPressable';

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
          <View style={s.logoContainer}>
            <Text style={s.logo}>Verify Email</Text>
          </View>
          <Text style={s.subtitle}>Enter the 6-digit code sent to{'\n'}{email}</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>VERIFICATION CODE</Text>
          <TextInput
            style={[s.input, s.codeInput]}
            placeholder="000000"
            placeholderTextColor="#b5b5b5"
            value={token}
            onChangeText={setToken}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <ScalePressable
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#f0f0f0" />
            ) : (
              <Text style={s.btnText}>Verify</Text>
            )}
          </ScalePressable>

          <ScalePressable onPress={handleResend} disabled={resendLoading} style={s.linkBtn}>
            <Text style={[s.linkText, resendLoading && { opacity: 0.5 }]}>
              {resendLoading ? 'Sending...' : "Didn't get a code? Resend"}
            </Text>
          </ScalePressable>

          <ScalePressable onPress={() => navigation.goBack()} style={s.linkBtn}>
            <Text style={s.linkText}>Back to Sign Up</Text>
          </ScalePressable>
        </View>
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
  logo: { fontSize: 24, fontWeight: '900', color: '#f0f0f0', letterSpacing: -0.5 },
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
  codeInput: { fontSize: 28, fontWeight: '700', letterSpacing: 12, paddingVertical: 20 },
  btn: {
    backgroundColor: '#545454',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#f0f0f0' },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { fontSize: 14, color: '#545454', fontWeight: '600' },
});
