import { apiUrl } from '@/features/api-url';
import type { AnalysisWindow, MonthlyTransactionSummary } from '@/data/transactions';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export async function sendChatMessage(
  messages: ChatMessage[],
  monthlyData: Record<string, MonthlyTransactionSummary>,
  window: AnalysisWindow,
): Promise<string> {
  const response = await fetch(`${apiUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.slice(-20).map(({ role, text }) => ({ role, text })),
      monthlyData,
      window,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Chat server returned HTTP ${response.status}.`);
  if (typeof result.reply !== 'string' || !result.reply.trim()) {
    throw new Error('The chat server returned an invalid response.');
  }
  return result.reply.trim();
}
