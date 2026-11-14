import { createServer } from 'node:http';

const host = process.env.GEMINI_SERVER_HOST || '0.0.0.0';
const port = Number(process.env.GEMINI_SERVER_PORT || 8787);
const model = 'gemini-4-hydrogen';
const maxBodyBytes = 256 * 1024;
const rateLimits = new Map();

const roles = [
  {
    agent: 'Spending trend',
    focus: 'Find unusual changes in total spending over time. Compare months with the broader history, and distinguish clear deviations from normal variation.',
  },
  {
    agent: 'Category shifts',
    focus: 'Find unusual changes in individual spending categories. Compare each category across months, noting new, sharply increased, or repeatedly changing categories.',
  },
  {
    agent: 'Cash flow',
    focus: 'Compare income with spending over time. Identify unusual changes in the monthly balance or months where spending is close to or greater than income.',
  },
];

function send(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(body));
}

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (rateLimits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 8) return false;
  recent.push(now);
  rateLimits.set(ip, recent);
  return true;
}

function validateMonthlyData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const months = Object.entries(data);
  if (months.length < 1 || months.length > 60) return false;
  return months.every(([month, value]) => {
    if (!/^\d{4}-\d{2}$/.test(month) || !value || typeof value !== 'object') return false;
    return ['spending', 'income'].every((flowName) => {
      const flow = value[flowName];
      return flow && Number.isFinite(flow.total) && Array.isArray(flow.categories) &&
        flow.categories.length <= 40 && flow.categories.every((item) =>
          typeof item.category === 'string' && item.category.length <= 80 && Number.isFinite(item.amount));
    });
  });
}

function validateSavingsCoachInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  if (!Number.isFinite(input.goalAmount) || input.goalAmount <= 0 || input.goalAmount > 1_000_000_000) return false;
  if (typeof input.profileType !== 'string' || input.profileType.length > 80) return false;
  if (typeof input.profileDescription !== 'string' || input.profileDescription.length > 600) return false;
  if (!Number.isFinite(input.averageMonthlyIncome) || input.averageMonthlyIncome < 0) return false;
  if (!Number.isFinite(input.averageMonthlySpending) || input.averageMonthlySpending < 0) return false;
  if (!Number.isFinite(input.medianMonthlySurplus)) return false;
  if (!Number.isFinite(input.balancedMonthlyContribution) || input.balancedMonthlyContribution < 0) return false;
  if (!Number.isInteger(input.targetMonths) || input.targetMonths < 1 || input.targetMonths > 600 ||
    !Number.isFinite(input.monthlyTarget) || input.monthlyTarget < 0 ||
    !Number.isFinite(input.additionalCutNeeded) || input.additionalCutNeeded < 0 ||
    typeof input.selectedScenario !== 'string' || input.selectedScenario.length > 80 ||
    !Number.isFinite(input.plannedMonthlySaving) || input.plannedMonthlySaving < 0) return false;
  if (!Array.isArray(input.recommendedCuts) || input.recommendedCuts.length > 8 ||
    !input.recommendedCuts.every((item) => item && typeof item.category === 'string' && item.category.length <= 80 &&
      Number.isFinite(item.amount) && item.amount >= 0)) return false;
  if (!Array.isArray(input.timelineOptions) || input.timelineOptions.length < 1 || input.timelineOptions.length > 8 ||
    input.timelineOptions.some((item) => !item || !Number.isInteger(item.months) || item.months < 1 || item.months > 600 ||
      !Number.isFinite(item.requiredMonthlySaving) || item.requiredMonthlySaving < 0 ||
      typeof item.coveredByTypicalBalance !== 'boolean' || typeof item.coveredByBalancedPlan !== 'boolean')) return false;
  if (!Array.isArray(input.topCategories) || input.topCategories.length > 8) return false;
  return input.topCategories.every((item) => item && typeof item.category === 'string' && item.category.length <= 80 &&
    Number.isFinite(item.averageMonthly) && item.averageMonthly >= 0 && Number.isFinite(item.share) && item.share >= 0 && item.share <= 1);
}

async function runSavingsCoach(input) {
  const safeInput = {
    goalAmount: Math.round(input.goalAmount),
    profileType: input.profileType,
    profileDescription: input.profileDescription,
    averageMonthlyIncome: Math.round(input.averageMonthlyIncome),
    averageMonthlySpending: Math.round(input.averageMonthlySpending),
    medianMonthlySurplus: Math.round(input.medianMonthlySurplus),
    balancedMonthlyContribution: Math.round(input.balancedMonthlyContribution),
    targetMonths: input.targetMonths,
    monthlyTarget: Math.round(input.monthlyTarget),
    additionalCutNeeded: Math.round(input.additionalCutNeeded),
    selectedScenario: input.selectedScenario,
    plannedMonthlySaving: Math.round(input.plannedMonthlySaving),
    recommendedCuts: input.recommendedCuts.map((item) => ({ category: item.category, amount: Math.round(item.amount) })),
    timelineOptions: input.timelineOptions.map((item) => ({
      months: item.months,
      requiredMonthlySaving: Math.round(item.requiredMonthlySaving),
      coveredByTypicalBalance: item.coveredByTypicalBalance,
      coveredByBalancedPlan: item.coveredByBalancedPlan,
    })),
    topCategories: input.topCategories.map((item) => ({
      category: item.category,
      averageMonthly: Math.round(item.averageMonthly),
      sharePercent: Math.round(item.share * 100),
    })),
  };
  const text = await callHydrogen([
    'You are a practical personal-finance coach. Give the user a clear, specific recommendation for reaching their savings goal.',
    'Use only supplied figures. Never invent transactions, dates, categories, or amounts. Do not promise an outcome.',
    'Choose a recommendedMonths value from timelineOptions. Prefer the shortest timeline covered by the typical monthly balance; if none is covered, choose the shortest covered by the balanced plan. If none is covered by either, choose the longest available option and explain the monthly shortfall plainly.',
    'The user is currently viewing a specific target deadline and selected scenario. Write insight as two short sentences that directly address targetMonths: state monthlyTarget, compare it with plannedMonthlySaving, and clearly say whether the selected scenario is on track or short by the exact difference. Write action as one concrete adjustment using recommendedCuts and the matching category names. Do not recommend numbers that conflict with those supplied. If the required cuts exceed flexible spending, say the deadline is not achievable through those cuts alone. If essentials dominate, advise protecting essentials and only adjusting flexible categories. Keep AI advice specific and useful; no generic transfer tips.',
    'Return valid JSON only in this shape: {"recommendedMonths":18,"insight":"two specific, concise sentences","action":"one concrete suggestion"}. Use an integer for recommendedMonths and an available timeline option.',
    `Savings and spending summary:\n${JSON.stringify(safeInput)}`,
  ].join('\n\n'), { json: true, label: 'Savings goal coach', maxOutputTokens: 4096, thinkingLevel: 'LOW' });

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Savings coach returned incomplete JSON. Try again.');
  }
  const availableTimelines = new Set(input.timelineOptions.map((item) => item.months));
  if (!parsed || typeof parsed.insight !== 'string' || typeof parsed.action !== 'string' ||
    !Number.isInteger(parsed.recommendedMonths) || !availableTimelines.has(parsed.recommendedMonths)) {
    throw new Error('Savings coach returned an unexpected response.');
  }
  return {
    recommendedMonths: parsed.recommendedMonths,
    insight: parsed.insight.slice(0, 500),
    action: parsed.action.slice(0, 260),
  };
}

async function callHydrogen(prompt, {
  json = false,
  label = 'Hydrogen request',
  maxOutputTokens = 4096,
  thinkingLevel = 'LOW',
} = {}) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        ...(json ? { responseMimeType: 'application/json' } : {}),
        maxOutputTokens,
        thinkingConfig: { thinkingLevel },
      },
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result?.error?.message || `Gemini returned HTTP ${response.status}`;
    throw new Error(message);
  }

  const candidate = result?.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (candidate?.finishReason === 'MAX_TOKENS') throw new Error(`${label} reached its output limit. Try again.`);
  if (!text) throw new Error(`${label} returned an empty response.`);
  return text;
}

async function runOrchestrator(monthlyData, window) {
  const prompt = [
    'You are the coordinator for a financial anomaly analysis using three specialized Gemini Hydrogen agents.',
    `Plan a concise review of the available transaction data from ${window.startMonth} through ${window.endMonth}.`,
    `Data months available: ${window.availableMonths.join(', ')}. Missing months: ${window.missingMonths.join(', ') || 'none'}. Missing months are unknown, not zero.`,
    'Give each specialist a distinct focus: total spending trends, category-level shifts, and income versus spending. Tell them to compare across the full available period, avoid unsupported conclusions, and return only the strongest findings. Do not produce findings yourself. Output a short plain-text task plan for the specialists.',
    `Monthly data:\n${JSON.stringify(monthlyData)}`,
  ].join('\n\n');

  return callHydrogen(prompt, { label: 'Hydrogen coordinator plan', maxOutputTokens: 2048, thinkingLevel: 'LOW' });
}

async function runAgent(role, monthlyData, window, orchestrationPlan) {
  const prompt = [
    `You are the ${role.agent} analyst in a personal finance app.`,
    role.focus,
    `Coordinator plan for this review:\n${orchestrationPlan}`,
    `Analyze the available transaction data in the rolling 12-calendar-month window ${window.startMonth} through ${window.endMonth}. The available data months are ${window.availableMonths.join(', ')}.`,
    `The following months have no transaction data in the app: ${window.missingMonths.join(', ') || 'none'}. Missing months are unknown, not zero spending; do not infer values for them.`,
    'The supplied values are EUR totals grouped by month and category.',
    'Return valid JSON only, with this exact shape: {"agent":"role name","summary":"one or two clear sentences","findings":[{"month":"YYYY-MM","title":"short title","detail":"briefly explain the comparison using exact values from the data","severity":"low|medium|high"}]}.',
    'Only report patterns supported by the supplied data. Do not invent transactions, merchants, or numbers. Treat findings as unusual behavior, not fraud. Include at most 3 of the clearest findings. Keep each detail to one short sentence. If no clear unusual patterns exist, return an empty findings array.',
    `Monthly data:\n${JSON.stringify(monthlyData)}`,
  ].join('\n\n');

  const text = await callHydrogen(prompt, {
    json: true,
    label: `${role.agent} analyst`,
    maxOutputTokens: 4096,
    thinkingLevel: 'MEDIUM',
  });

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${role.agent} returned incomplete JSON. Try again.`);
  }
  if (!parsed || !Array.isArray(parsed.findings) || typeof parsed.summary !== 'string') {
    throw new Error(`${role.agent} returned an unexpected response.`);
  }

  const allowedMonths = new Set(Object.keys(monthlyData));
  return {
    agent: role.agent,
    summary: parsed.summary.slice(0, 600),
    findings: parsed.findings.slice(0, 6).flatMap((finding, index) => {
      if (!finding || !allowedMonths.has(finding.month) || typeof finding.title !== 'string' || typeof finding.detail !== 'string') return [];
      const severity = ['low', 'medium', 'high'].includes(finding.severity) ? finding.severity : 'medium';
      return [{
        id: `${role.agent}-${finding.month}-${index}`,
        month: finding.month,
        title: finding.title.slice(0, 120),
        detail: finding.detail.slice(0, 500),
        severity,
      }];
    }),
  };
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {});
  const routePath = new URL(request.url || '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/';
  if (request.method !== 'POST' || !['/api/analyze', '/api/savings-coach'].includes(routePath)) return send(response, 404, { error: 'Not found.' });
  if (!process.env.GEMINI_API_KEY) return send(response, 503, { error: 'GEMINI_API_KEY is missing from the server environment.' });

  const ip = request.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) return send(response, 429, { error: 'Too many analysis requests. Try again in a minute.' });

  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (Buffer.byteLength(body) > maxBodyBytes) return send(response, 413, { error: 'The monthly data is too large.' });
    }
    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch {
      return send(response, 400, { error: 'The app sent an invalid request body. Restart Expo and try again.' });
    }
    if (routePath === '/api/savings-coach') {
      if (!validateSavingsCoachInput(requestData)) return send(response, 400, { error: 'Savings goal analysis is missing or invalid.' });
      const coach = await runSavingsCoach(requestData);
      return send(response, 200, coach);
    }

    const { monthlyData, window } = requestData;
    if (!validateMonthlyData(monthlyData)) return send(response, 400, { error: 'Monthly transaction data is missing or invalid.' });
    if (!window || !/^\d{4}-\d{2}$/.test(window.startMonth) || !/^\d{4}-\d{2}$/.test(window.endMonth) ||
      !Array.isArray(window.requestedMonths) || window.requestedMonths.length !== 12 ||
      !Array.isArray(window.availableMonths) || !Array.isArray(window.missingMonths) ||
      window.availableMonths.some((month) => !window.requestedMonths.includes(month) || !Object.hasOwn(monthlyData, month)) ||
      window.missingMonths.some((month) => !window.requestedMonths.includes(month))) {
      return send(response, 400, { error: 'The 12-month analysis window is missing or invalid.' });
    }

    const orchestrationPlan = await runOrchestrator(monthlyData, window);
    const results = await Promise.all(roles.map((role) => runAgent(role, monthlyData, window, orchestrationPlan)));
    const overallSummary = await callHydrogen([
      'You are the coordinator reviewing findings from three specialist Gemini Hydrogen analysts.',
      'Summarize the clearest shared or complementary observations in two short sentences. Do not add new numbers, months, causes, or claims that are absent from the specialists’ results. If no findings are reported, say no clear unusual pattern was found.',
      `Analysis window: ${window.startMonth} through ${window.endMonth}.`,
      `Specialist results:\n${JSON.stringify(results)}`,
    ].join('\n\n'), { label: 'Hydrogen final review', maxOutputTokens: 1024, thinkingLevel: 'LOW' });
    return send(response, 200, { results, overallSummary, model, workflow: 'Hydrogen coordinator → 3 Hydrogen analysts → Hydrogen review' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini analysis failed.';
    return send(response, 502, { error: message });
  }
});

server.listen(port, host, () => {
  console.log(`Gemini analysis server listening on http://${host}:${port}`);
  console.log(`Model: ${model}`);
  console.log('API key stays on this server; monthly aggregates are sent to the Gemini API.');
});
