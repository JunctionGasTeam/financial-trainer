import { apiUrl } from '@/features/api-url';
import type { AnalysisWindow, MonthlyTransactionSummary } from '@/data/transactions';

export type ChatShortcut = 'spending' | 'anomaly' | 'savings' | 'none';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  shortcut?: ChatShortcut;
  invest?: InvestAdvice;
};

export type InvestAsset = 'stocks' | 'bonds' | 'gold';

export type InvestAllocation = { asset: InvestAsset; share: number; amount: number };

export type InvestAdvice = { total: number; allocations: InvestAllocation[] };

export type ChatReply = {
  reply: string;
  suggestions: string[];
  shortcut: ChatShortcut;
  invest: InvestAdvice | null;
};

const investAssets: readonly InvestAsset[] = ['stocks', 'bonds', 'gold'];

function parseInvest(value: unknown): InvestAdvice | null {
  if (!value || typeof value !== 'object') return null;
  const { total, allocations } = value as { total?: unknown; allocations?: unknown };
  if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0 || !Array.isArray(allocations)) return null;
  const parsed = allocations.flatMap((item): InvestAllocation[] => {
    if (!item || typeof item !== 'object') return [];
    const { asset, share, amount } = item as Record<string, unknown>;
    if (!investAssets.includes(asset as InvestAsset) || typeof share !== 'number' || typeof amount !== 'number' ||
      !Number.isFinite(share) || !Number.isFinite(amount)) return [];
    return [{ asset: asset as InvestAsset, share, amount }];
  });
  return parsed.length === investAssets.length ? { total, allocations: parsed } : null;
}

const shortcuts: readonly ChatShortcut[] = ['spending', 'anomaly', 'savings', 'none'];

// Used when the model returns no usable follow-ups: one chip per kind (dig deeper → compare → act).
const fallbackPool = [
  ['What was my biggest category?', 'Which month cost the most?', 'What grew the most?'],
  ['How does this compare to average?', 'Is my income stable?', 'Was last month higher?'],
  ['Where can I cut back?', 'How much can I save monthly?', 'Am I spending more than I earn?'],
];

export function fallbackSuggestions(messages: ChatMessage[]): string[] {
  const asked = new Set(messages.filter((m) => m.role === 'user').map((m) => m.text.trim().toLowerCase()));
  return fallbackPool.flatMap((pool) => {
    const fresh = pool.find((question) => !asked.has(question.toLowerCase()));
    return fresh ? [fresh] : [];
  });
}

export async function sendChatMessage(
  messages: ChatMessage[],
  monthlyData: Record<string, MonthlyTransactionSummary>,
  window: AnalysisWindow,
): Promise<ChatReply> {
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
  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
    : [];
  const shortcut: ChatShortcut = shortcuts.includes(result.shortcut) ? result.shortcut : 'none';
  return { reply: result.reply.trim(), suggestions, shortcut, invest: parseInvest(result.invest) };
}
