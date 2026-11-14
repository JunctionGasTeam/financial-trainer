import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatSuggestions } from '@/components/chat-suggestions';
import { InvestBento } from '@/components/invest-bento';
import { fallbackSuggestions, sendChatMessage, type ChatMessage } from '@/features/chat/api';
import { useRecentFinanceData } from '@/hooks/use-recent-finance-data';
import { CloseButton } from '@/components/ui/close-button';
import { useWipe, WipeScreen } from '@/components/ui/wipe-screen';

const lightGreen = '#e2f3e8';
const bankGreen = '#008044';
const ink = '#10201B';
const inkMuted = '#4f615b';

const suggestions = [
  'Where did my money go last month?',
  'How did my income change?',
  'Am I spending more than I earn?',
  'Where should I invest spare money?',
];

let nextId = 0;
const makeId = () => `msg-${Date.now()}-${(nextId += 1)}`;

export function FinanceChatScreen() {
  return (
    <WipeScreen color={lightGreen}>
      <FinanceChat />
    </WipeScreen>
  );
}

function FinanceChat() {
  const { close, opened } = useWipe();
  const { data, error: loadError } = useRecentFinanceData();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const ready = Boolean(data && Object.keys(data.monthlyData).length);
  const canSend = ready && !pending && draft.trim().length > 0;

  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Focus once the wipe has finished and the data has loaded (the input is disabled until then).
  useEffect(() => {
    if (opened && ready) inputRef.current?.focus();
  }, [opened, ready]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [messages, pending, error]);

  async function send(text: string) {
    const trimmed = text.trim().slice(0, 1000);
    if (!trimmed || pending || !data) return;
    const history: ChatMessage[] = [...messages, { id: makeId(), role: 'user', text: trimmed }];
    setMessages(history);
    setDraft('');
    setError('');
    setPending(true);
    try {
      const { reply, suggestions: followUps, shortcut, invest } = await sendChatMessage(history, data.monthlyData, data.window);
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: 'assistant',
          text: reply,
          suggestions: followUps.length ? followUps : fallbackSuggestions(history),
          shortcut,
          invest: invest ?? undefined,
        },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The coach could not answer. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.flex} edges={keyboardShown ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <View style={styles.header}>
            <CloseButton accessibilityLabel="Close chat" onPress={close} />
            <View style={styles.headerTitle}>
              <Text style={styles.title}>Coach</Text>
              <View style={styles.coachDot}>
                <SymbolView
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                  tintColor={bankGreen}
                  size={18}
                />
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive">
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.intro}>Ask anything about your own money.</Text>
                <Text style={styles.introSub}>
                  I answer from your last 12 months of transactions.
                </Text>
                {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
                {opened && (
                  <ChatSuggestions suggestions={suggestions} disabled={!ready || pending} onPick={send} />
                )}
              </View>
            )}

            {messages.map((message, index) =>
              message.role === 'user' ? (
                <View key={message.id} style={[styles.bubble, styles.userBubble]}>
                  <Text style={styles.userText}>{message.text}</Text>
                </View>
              ) : (
                <View key={message.id} style={styles.coachTurn}>
                  <View style={[styles.bubble, styles.coachBubble]}>
                    <Text style={styles.coachText}>{message.text}</Text>
                  </View>
                  {message.invest && <InvestBento advice={message.invest} />}
                  {/* Only the latest answer offers follow-ups; they vanish once a new question is sent. */}
                  {index === messages.length - 1 && !pending && (
                    <ChatSuggestions
                      suggestions={message.suggestions ?? []}
                      shortcut={message.shortcut}
                      onPick={send}
                      onShortcut={(href) => router.push(href)}
                    />
                  )}
                </View>
              ),
            )}

            {pending && (
              <View style={[styles.bubble, styles.coachBubble]}>
                <ActivityIndicator size="small" color={bankGreen} />
              </View>
            )}

            {error ? (
              <View style={[styles.bubble, styles.coachBubble]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.dock}>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder={ready ? 'Ask about your money…' : 'Loading your data…'}
                placeholderTextColor={inkMuted}
                editable={ready}
                multiline
                maxLength={1000}
                style={styles.input}
                accessibilityLabel="Message to your finance coach"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                disabled={!canSend}
                onPress={() => send(draft)}
                style={({ pressed }) => [styles.sendButton, (!canSend || pressed) && styles.dimmed]}>
                <SymbolView
                  name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
                  tintColor="#ffffff"
                  size={20}
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coachDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    color: ink,
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  emptyState: {
    gap: 8,
  },
  intro: {
    color: ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  introSub: {
    color: inkMuted,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  coachTurn: {
    gap: 10,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: bankGreen,
    borderBottomRightRadius: 6,
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
  },
  userText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 21,
  },
  coachText: {
    color: ink,
    fontSize: 15,
    lineHeight: 21,
  },
  errorText: {
    color: '#b3261e',
    fontSize: 14,
    lineHeight: 20,
  },
  dock: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    color: ink,
    fontSize: 15,
    minHeight: 36,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bankGreen,
  },
  dimmed: {
    opacity: 0.5,
  },
});
