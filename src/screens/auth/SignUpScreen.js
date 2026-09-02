import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  SafeAreaView, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { auth } from '../../lib/supabase';
import { ScalePressable } from '../../components/AnimatedPressable';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error, data } = await auth.signUp(email.trim().toLowerCase(), password, name.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error);
      return;
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View style={s.logoContainer}>
            <Text style={s.logo}>The Comeback</Text>
          </View>
          <Text style={s.subtitle}>Start your journey. It takes 2 minutes.</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>FULL NAME</Text>
          <TextInput
            style={s.input}
            placeholder="Your name"
            placeholderTextColor="#b5b5b5"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

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
            placeholder="At least 6 characters"
            placeholderTextColor="#b5b5b5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <ScalePressable
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#f0f0f0" />
            ) : (
              <Text style={s.btnText}>Create Account</Text>
            )}
          </ScalePressable>

          <ScalePressable onPress={() => navigation.navigate('Login')} style={s.linkBtn}>
            <Text style={s.linkText}>Already have an account? <Text style={s.linkBold}>Log In</Text></Text>
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
