import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { chat } from '../lib/ai';

const QUICK_PROMPTS = [
  'Explain Chemical Kinetics in 5 points',
  'Give me Physics formulas for Current Electricity',
  'How to score high in Maths?',
  'Best revision strategy for Onam?',
  'Summarize Matrices chapter',
  'Tips for English writing section',
];

export default function ChatScreen() {
  const { signOut } = useClerk();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hey! I'm **TheComebackAI** 🤖\n\nAsk me anything about your exam prep — chapter summaries, formulas, study tips, or revision strategies.\n\nTap a quick prompt below or type your own question!",
      }]);
    }
  }, []);

  function scrollToBottom() {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    scrollToBottom();

    const reply = await chat(newMessages);
    setMessages([...newMessages, { role: 'assistant', content: reply }]);
    setLoading(false);
    scrollToBottom();
  }

  function renderMessage(msg, i) {
    const isUser = msg.role === 'user';
    return (
      <View key={i} style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        {!isUser && <Text style={s.aiLabel}>AI</Text>}
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>
          {msg.content}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>TheComebackAI</Text>
        <View style={s.headerDot} />
        <Text style={s.headerStatus}>Online</Text>
        <View style={{ flex: 1 }} />
        {messages.length > 1 && (
          <TouchableOpacity
            style={s.clearBtn}
            onPress={() => {
              Alert.alert('Clear Chat', 'Delete all messages?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => {
                  setMessages([messages[0]]);
                }},
              ]);
            }}
          >
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.clearBtn, { marginLeft: 8 }]}
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
            ]);
          }}
        >
          <Text style={s.clearBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={s.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={s.messages}
          contentContainerStyle={s.messagesInner}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => renderMessage(m, i))}
          {loading && (
            <View style={[s.bubble, s.bubbleAI]}>
              <Text style={s.aiLabel}>AI</Text>
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 4 }} />
            </View>
          )}
        </ScrollView>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickBar}>
            {QUICK_PROMPTS.map((p, i) => (
              <TouchableOpacity key={i} style={s.quickBtn} onPress={() => sendMessage(p)}>
                <Text style={s.quickBtnText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Ask about any chapter..."
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            editable={!loading}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginLeft: 8 },
  headerStatus: { fontSize: 12, color: '#22c55e', marginLeft: 4, fontWeight: '600' },
  clearBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  clearBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  chatArea: { flex: 1 },
  messages: { flex: 1 },
  messagesInner: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '82%', marginBottom: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: '#f1f5f9', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  aiLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 2 },
  bubbleText: { fontSize: 14, lineHeight: 20, color: '#1e293b' },
  bubbleTextUser: { color: '#ffffff' },
  quickBar: { paddingHorizontal: 16, maxHeight: 50, marginBottom: 8 },
  quickBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  quickBtnText: { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingBottom: 28, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 8 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0f172a', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
  sendBtnText: { fontSize: 20, color: '#ffffff', fontWeight: '700', marginTop: -2 },
});
