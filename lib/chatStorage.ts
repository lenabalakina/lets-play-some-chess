export interface StoredChatMessage {
  id:       number
  author:   'white' | 'black'
  username: string
  text:     string
  time:     string
  isBuzz?:  boolean
  isSticker?: boolean
}

const MAX_STORED = 100

export function loadChatHistory(key: string): StoredChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredChatMessage[]
    return Array.isArray(parsed) ? parsed.slice(-MAX_STORED) : []
  } catch {
    return []
  }
}

export function saveChatHistory(key: string, messages: StoredChatMessage[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(messages.slice(-MAX_STORED)))
  } catch {
    // quota exceeded — ignore
  }
}

export function clearChatHistory(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
