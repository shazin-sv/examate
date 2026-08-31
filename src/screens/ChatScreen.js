import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, SafeAreaView,
  KeyboardAvoidingView, Platform, Alert, Animated,
} from 'react-native';
import { chat } from '../lib/ai';
import { ScalePressable, FadeScalePressable } from '../components/AnimatedPressable';
import { useTheme } from '../context/ThemeContext';

const QUICK_PROMPTS = [
  'Explain Chemical Kinetics in 5 points',
  'Give me Physics formulas for Current Electricity',
  'How to score high in Maths?',
  'Best revision strategy for Onam?',
  'Summarize Matrices chapter',
  'Tips for English writing section',
];

function formatTime(date) {
  const d = date instanceof Date ? date : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text) {
  if (!text) return null;
  const parts = [];
  const lines = text.split('\n');
  
  lines.forEach((line, lineIdx) => {
    if (line.startsWith('### ')) {
      parts.push(<Text key={`h3-${lineIdx}`} style={s.mdH3}>{line.slice(4)}</Text>);
    } else if (line.startsWith('## ')) {
      parts.push(<Text key={`h2-${lineIdx}`} style={s.mdH2}>{line.slice(3)}</Text>);
    } else if (line.startsWith('# ')) {
      parts.push(<Text key={`h1-${lineIdx}`} style={s.mdH1}>{line.slice(2)}</Text>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      parts.push(<Text key={`li-${lineIdx}`} style={s.mdListItem}>  {line.slice(2)}</Text>);
    } else if (/^\d+\.\s/.test(line)) {
      parts.push(<Text key={`ol-${lineIdx}`} style={s.mdListItem}>  {line}</Text>);
    } else {
      const rendered = renderInlineMarkdown(line, lineIdx);
      parts.push(rendered);
      if (lineIdx < lines.length - 1 && line !== '') {
        parts.push(<Text key={`br-${lineIdx}`}>{'\n'}</Text>);
      }
    }
  });
  return parts;
}

function renderInlineMarkdown(text, baseKey) {
  const segments = [];
  let remaining = text;
  let segIdx = 0;
  const boldRegex = /\*\*(.+?)\*\*/g;
  const italicRegex = /\*(.+?)\*/g;
  let match;

  let tempText = remaining;
  const tokens = [];
  while ((match = boldRegex.exec(tempText)) !== null) {
    tokens.push({ type: 'bold', text: match[1], index: match.index, length: match[0].length });
  }
  while ((match = italicRegex.exec(tempText)) !== null) {
    if (!tokens.find(t => t.index <= match.index && t.index + t.length > match.index)) {
      tokens.push({ type: 'italic', text: match[1], index: match.index, length: match[0].length });
    }
  }
  tokens.sort((a, b) => a.index - b.index);

  let cursor = 0;
  tokens.forEach((tok, ti) => {
    if (tok.index > cursor) {
      segments.push(<Text key={`${baseKey}-t${segIdx++}`}>{tempText.slice(cursor, tok.index)}</Text>);
    }
    if (tok.type === 'bold') {
      segments.push(<Text key={`${baseKey}-b${segIdx++}`} style={s.mdBold}>{tok.text}</Text>);
    } else {
      segments.push(<Text key={`${baseKey}-i${segIdx++}`} style={s.mdItalic}>{tok.text}</Text>);
    }
    cursor = tok.index + tok.length;
  });
  if (cursor < tempText.length) {
    segments.push(<Text key={`${baseKey}-e${segIdx++}`}>{tempText.slice(cursor)}</Text>);
  }

  return segments.length > 0 ? <Text key={baseKey} style={s.mdText}>{segments}</Text> : <Text key={baseKey} style={s.mdText}>{text}</Text>;
}

function TypingDots({ color }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: false }),
          Animated.timing(dot2, { toValue: 0.6, duration: 400, useNativeDriver: false }),
          Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: false }),
          Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: false }),
          Animated.timing(dot3, { toValue: 0.6, duration: 400, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.6, duration: 400, useNativeDriver: false }),
          Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: false }),
          Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: false }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={s.typingRow}>
      <Animated.View style={[s.typingDot, { opacity: dot1, backgroundColor: color || '#94a3b8' }]} />
      <Animated.View style={[s.typingDot, { opacity: dot2, backgroundColor: color || '#94a3b8' }]} />
      <Animated.View style={[s.typingDot, { opacity: dot3, backgroundColor: color || '#94a3b8' }]} />
    </View>
  );
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();
  const [timestamps, setTimestamps] = useState({});

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = {
        role: 'assistant',
        content: "Ask about a chapter, a formula, or how you'd like to revise. Type below or pick a prompt.",
      };
      setMessages([welcomeMsg]);
      setTimestamps({ 0: formatTime() });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    const newIdx = newMessages.length - 1;
    setMessages(newMessages);
    setTimestamps(prev => ({ ...prev, [newIdx]: formatTime() }));
    setInput('');
    setLoading(true);
    scrollToBottom();

    const reply = await chat(newMessages);
    const finalMessages = [...newMessages, { role: 'assistant', content: reply }];
    setMessages(finalMessages);
    setTimestamps(prev => ({ ...prev, [finalMessages.length - 1]: formatTime() }));
    setLoading(false);
    scrollToBottom();
  }

  function renderMessage(msg, i) {
    const isUser = msg.role === 'user';
    const ts = timestamps[i];
    return (
      <FadeScalePressable key={i} style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI, isUser && { backgroundColor: theme.primary }]}>
        {!isUser && (
          <View style={[s.aiLabelContainer, { backgroundColor: theme.input }]}>
            <Text style={[s.aiLabel, { color: theme.textSecondary }]}>AI</Text>
          </View>
        )}
        {isUser ? (
          <Text style={[s.bubbleText, { color: '#ffffff' }]}>{msg.content}</Text>
        ) : (
          <View>{renderMarkdown(msg.content)}</View>
        )}
        {ts && (
          <Text style={[s.timestamp, isUser ? s.timestampUser : { color: theme.textMuted }]}>
            {ts}
          </Text>
        )}
      </FadeScalePressable>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { backgroundColor: theme.bg, borderBottomColor: theme.borderLight }]}>
        <Text style={[s.headerTitle, { color: theme.text }]}>Ask</Text>
        {messages.length > 1 && (
          <ScalePressable
            style={s.clearBtn}
            onPress={() => {
              Alert.alert('Clear Chat', 'Delete all messages?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => {
                  setMessages([messages[0]]);
                  setTimestamps({ 0: timestamps[0] || formatTime() });
                }},
              ]);
            }}
          >
            <Text style={[s.clearBtnText, { color: theme.textMuted }]}>Clear</Text>
          </ScalePressable>
        )}
      </View>

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
            <View style={[s.bubble, s.bubbleAI, { backgroundColor: theme.card }, s.typingBubble]}>
              <View style={[s.aiLabelContainer, { backgroundColor: theme.input }]}>
                <Text style={[s.aiLabel, { color: theme.textSecondary }]}>AI</Text>
              </View>
              <TypingDots color={theme.textMuted} />
            </View>
          )}
        </ScrollView>

        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickBar} contentContainerStyle={s.quickBarContent}>
            {QUICK_PROMPTS.map((p, i) => (
              <ScalePressable key={i} style={[s.quickBtn, { backgroundColor: theme.input, borderColor: theme.border }]} onPress={() => sendMessage(p)}>
                <Text style={[s.quickBtnText, { color: theme.primary }]}>{p}</Text>
              </ScalePressable>
            ))}
          </ScrollView>
        )}

        <View style={[s.inputRow, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[s.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            placeholder="Ask about any chapter..."
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            editable={!loading}
            multiline
          />
          <ScalePressable
            style={[s.sendBtn, { backgroundColor: theme.primary }, (!input.trim() || loading) && { backgroundColor: theme.textMuted, shadowOpacity: 0 }]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </ScalePressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafbfc' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },
  
  chatArea: { flex: 1 },
  messages: { flex: 1 },
  messagesInner: { padding: 16, paddingBottom: 8 },
  
  bubble: {
    maxWidth: '82%',
    marginBottom: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  aiLabelContainer: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  aiLabel: { fontSize: 9, fontWeight: '700', color: '#64748b' },
  bubbleText: { fontSize: 14, lineHeight: 20, color: '#1e293b' },
  bubbleTextUser: { color: '#ffffff' },
  
  timestamp: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampUser: { color: 'rgba(255,255,255,0.6)' },
  
  mdText: { fontSize: 14, lineHeight: 21, color: '#1e293b' },
  mdBold: { fontWeight: '700' },
  mdItalic: { fontStyle: 'italic' },
  mdH1: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 4, marginBottom: 2 },
  mdH2: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 4, marginBottom: 2 },
  mdH3: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 4, marginBottom: 2 },
  mdListItem: { fontSize: 14, lineHeight: 20, color: '#1e293b' },
  
  typingBubble: { paddingVertical: 14 },
  typingRow: { flexDirection: 'row', gap: 4, marginLeft: 4 },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
  },
  
  quickBar: { paddingHorizontal: 16, maxHeight: 52 },
  quickBarContent: { gap: 8, paddingVertical: 4 },
  quickBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickBtnText: { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
  sendBtnText: { fontSize: 20, color: '#ffffff', fontWeight: '700', marginTop: -2 },
});
