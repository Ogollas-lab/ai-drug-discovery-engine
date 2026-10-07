/** Map raw chat failures to friendly, non-technical messages. */
export type ChatErrorKind = 'network' | 'credits' | 'rate_limit' | 'auth' | 'timeout' | 'empty' | 'interrupted' | 'unavailable';

export function classifyChatError(raw: string): ChatErrorKind {
  const s = raw.toLowerCase();
  if (s === 'empty') return 'empty';
  if (s === 'interrupted') return 'interrupted';
  if (/failed to fetch|network|load failed/.test(s)) return 'network';
  if (/402|credit/.test(s)) return 'credits';
  if (/429|rate/.test(s)) return 'rate_limit';
  if (/401|403|unauthori|forbidden|api key|config/.test(s)) return 'auth';
  if (/timeout|timed out|504/.test(s)) return 'timeout';
  return 'unavailable';
}

export const CHAT_ERROR_MESSAGES: Record<ChatErrorKind, string> = {
  network: 'Unable to connect to Pawanax AI. Please check your connection and try again.',
  credits: 'AI service is temporarily unavailable (usage limit reached).',
  rate_limit: 'Too many requests — please wait a moment and try again.',
  auth: 'Pawanax AI is not configured correctly right now. Please try again later.',
  timeout: 'Pawanax AI took too long to respond. Please try again.',
  empty: 'Pawanax AI returned an empty response. Please try again.',
  interrupted: 'The response was interrupted before it finished.',
  unavailable: 'AI service is temporarily unavailable. Please try again shortly.',
};

export function friendlyChatError(raw: string): string {
  return CHAT_ERROR_MESSAGES[classifyChatError(raw)];
}
