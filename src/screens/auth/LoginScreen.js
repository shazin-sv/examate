import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  SafeAreaView, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { auth } from '../../lib/supabase';
import { ScalePressable } from '../../components/AnimatedPressable';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setLoading(true);
    const { error } = await auth.signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Login failed', error);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View style={s.logoContainer}>
            <Text style={s.logo}>The Comeback</Text>
          </View>
          <Text style={s.subtitle}>Welcome back. Let's keep going.</Text>
        </View>

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

          <Text style={s.label}>PASSWORD</Text>
          <TextInput
            style={s.input}
            placeholder="Your password"
            placeholderTextColor="#b5b5b5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <ScalePressable
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#f0f0f0" />
            ) : (
              <Text style={s.btnText}>Log In</Text>
            )}
          </ScalePressable>

          <ScalePressable onPress={() => navigation.navigate('SignUp')} style={s.linkBtn}>
            <Text style={s.linkText}>Don't have an account? <Text style={s.linkBold}>Sign Up</Text></Text>
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
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#f0f0f0' },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14, color: '#808080' },
  linkBold: { color: '#545454', fontWeight: '700' },
});
