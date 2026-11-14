import { apiUrl } from '@/features/api-url';
import type { AnalysisWindow, MonthlyTransactionSummary } from '@/data/transactions';
import type { QueryResult } from '@/features/query/run';

export type ChatShortcut = 'spending' | 'anomaly' | 'savings' | 'none';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  shortcut?: ChatShortcut;
  invest?: InvestAdvice;
  /** Figures the app computed for this answer, so the user can see what it is based on. */
  lookups?: QueryResult[];
};

export type InvestAsset = 'stocks' | 'bonds' | 'gold';

export type InvestAllocation = { asset: InvestAsset; share: number; amount: number };

export type InvestAdvice = { total: number; allocations: InvestAllocation[] };

export type ChatReply = {
  reply: string;
  suggestions: string[];
  shortcut: ChatShortcut;
  invest: InvestAdvice | null;
  lookups: QueryResult[];
};

/** One query form the model asked for, with what the app computed (or why it could not). */
export type LookupOutcome = { form: unknown; result?: QueryResult; error?: string };

export type LookupRunner = (forms: unknown[]) => Promise<LookupOutcome[]>;

export type ChatData = {
  monthlyData: Record<string, MonthlyTransactionSummary>;
  window: AnalysisWindow;
  asOf: string | null;
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

async function postChat(messages: ChatMessage[], data: ChatData, queryResults?: LookupOutcome[]) {
  const response = await fetch(`${apiUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.slice(-20).map(({ role, text }) => ({ role, text })),
      monthlyData: data.monthlyData,
      window: data.window,
      asOf: data.asOf,
      queryResults,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Chat server returned HTTP ${response.status}.`);
  return result;
}

/**
 * Asks the coach. When monthly totals are not enough, the model returns query forms instead of
 * an answer; the app runs them on the device and asks again with the exact results.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  data: ChatData,
  runLookups: LookupRunner,
  onLookup?: () => void,
): Promise<ChatReply> {
  let result = await postChat(messages, data);
  let outcomes: LookupOutcome[] = [];
  if (Array.isArray(result.queries) && result.queries.length > 0) {
    onLookup?.();
    outcomes = await runLookups(result.queries.slice(0, 3));
    result = await postChat(messages, data, outcomes);
  }

  if (typeof result.reply !== 'string' || !result.reply.trim()) {
    throw new Error('The chat server returned an invalid response.');
  }
  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
    : [];
  const shortcut: ChatShortcut = shortcuts.includes(result.shortcut) ? result.shortcut : 'none';
  return {
    reply: result.reply.trim(),
    suggestions,
    shortcut,
    invest: parseInvest(result.invest),
    lookups: outcomes.flatMap((outcome) => (outcome.result ? [outcome.result] : [])),
  };
}
