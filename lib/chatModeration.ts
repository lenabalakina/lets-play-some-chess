const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn you', 'dick', 'cunt',
  'retard', 'nigger', 'nigga', 'faggot', 'kys', 'kill yourself',
]

const TOXIC_PATTERNS = [
  /\bez\b/i,
  /\bnoob\b/i,
  /\bnub\b/i,
  /\btrash\b/i,
  /\bloser\b/i,
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\bsuck\b/i,
  /\buninstall\b/i,
  /\bget good\b/i,
  /\bgit gud\b/i,
  /\breported\b/i,
  /\bhack(er|ing|s)?\b/i,
  /\bcheat(er|ing|s)?\b/i,
]

export type ModerationResult =
  | { ok: true; text: string }
  | { ok: false; reason: string }

export function moderateChatMessage(raw: string): ModerationResult {
  const text = raw.trim().slice(0, 200)
  if (!text) return { ok: false, reason: 'Message is empty.' }

  const lower = text.toLowerCase()

  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return { ok: false, reason: 'Let\'s keep it friendly — that message isn\'t allowed.' }
    }
  }

  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(lower)) {
      return { ok: false, reason: 'Let\'s keep it friendly — try something positive!' }
    }
  }

  // All-caps shouting (3+ words)
  const words = text.split(/\s+/)
  const shouty = words.filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w))
  if (shouty.length >= 3) {
    return { ok: false, reason: 'Easy there — let\'s keep the chat calm and friendly.' }
  }

  return { ok: true, text }
}
