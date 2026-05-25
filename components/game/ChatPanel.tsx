'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Smile, Zap, X } from 'lucide-react'

interface ChatMessage {
  id:        number
  author:    'white' | 'black'
  username:  string
  text:      string
  time:      string
  isBuzz?:   boolean
  isSticker?: boolean
}

const STICKER_ROWS = [
  ['😂', '💀', '😭', '🔥', '💅', '🤌'],
  ['😤', '🧠', '👑', '🫡', '🤝', '🏳️'],
  ['😎', '🤡', '👀', '💔', '🎯', '⚡'],
  ['🐐', '🫶', '🤣', '😈', '🫠', '🎪'],
]

const QUICK_PHRASES = ['gg', 'ez', 'noob', 'nice move!', 'oops lol', 'brb', 'good luck!', 'gg wp']

let _id = 1
function now() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

interface Props {
  whiteUsername:   string
  blackUsername:   string
  turn:            'w' | 'b'
  injectMessage?:  { text: string; author: 'white' | 'black'; username: string } | null
  onPlayerSend?:   (text: string) => void
}

export function ChatPanel({ whiteUsername, blackUsername, turn, injectMessage, onPlayerSend }: Props) {
  const [messages,     setMessages]     = useState<ChatMessage[]>([])
  const [input,        setInput]        = useState('')
  const [showStickers, setShowStickers] = useState(false)
  const [buzzing,      setBuzzing]      = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const prevInject = useRef<typeof injectMessage>(null)

  const author   = turn === 'w' ? 'white' : 'black'
  const username = turn === 'w' ? whiteUsername : blackUsername

  // Inject external message (e.g. AI response)
  useEffect(() => {
    if (!injectMessage || injectMessage === prevInject.current) return
    prevInject.current = injectMessage
    setMessages(p => [...p, { id: _id++, ...injectMessage, time: now() }])
  }, [injectMessage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function send(text: string, extra?: Partial<ChatMessage>) {
    if (!text.trim()) return
    setMessages(p => [...p, { id: _id++, author, username, text: text.trim(), time: now(), ...extra }])
    onPlayerSend?.(text.trim())
    setInput('')
    setShowStickers(false)
    inputRef.current?.focus()
  }

  function sendBuzz() {
    setBuzzing(true)
    setTimeout(() => setBuzzing(false), 600)
    send('sent you a buzz! 🔔', { isBuzz: true })
  }

  return (
    <motion.div
      animate={buzzing ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-full"
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin min-h-0">
        {messages.map(msg => {
          const isMe = msg.author === 'white'

          if (msg.isBuzz) return (
            <motion.div key={msg.id}
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center">
              <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1">
                🔔 {msg.username} buzzed you!
              </span>
            </motion.div>
          )

          return (
            <motion.div key={msg.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex gap-2 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black mt-0.5
                ${isMe ? 'bg-cyan-600' : 'bg-purple-600'}`}>
                {msg.username.slice(0, 2).toUpperCase()}
              </div>
              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? 'items-start' : 'items-end'}`}>
                <span className={`text-[9px] font-semibold ${isMe ? 'text-cyan-500' : 'text-purple-400'}`}>
                  {msg.username}
                </span>
                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed
                  ${msg.isSticker ? 'text-3xl bg-transparent px-1 py-0' : ''}
                  ${!msg.isSticker ? (isMe
                    ? 'bg-slate-800 text-slate-100 rounded-tl-none'
                    : 'bg-slate-700 text-slate-100 rounded-tr-none') : ''}`}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-700">{msg.time}</span>
              </div>
            </motion.div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Sticker picker — slides up when open */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-800/40"
          >
            <div className="px-2 py-2">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] text-slate-500">Stickers</span>
                <button onClick={() => setShowStickers(false)} className="text-slate-600 hover:text-slate-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
              {STICKER_ROWS.map((row, ri) => (
                <div key={ri} className="grid grid-cols-6 gap-1 mb-1">
                  {row.map(emoji => (
                    <button key={emoji} onClick={() => send(emoji, { isSticker: true })}
                      className="text-2xl aspect-square flex items-center justify-center rounded-xl
                        hover:bg-slate-700/60 active:scale-90 transition-all">
                      {emoji}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick phrases */}
      <div className="px-2 py-1.5 border-t border-slate-800/40 flex gap-1 flex-wrap">
        {QUICK_PHRASES.map(p => (
          <button key={p} onClick={() => send(p)}
            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400
              border border-slate-700/60 hover:border-slate-500 hover:text-slate-200 transition-all">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-2 pb-2 pt-1 border-t border-slate-800/40 flex gap-1.5">
        <button onClick={() => setShowStickers(v => !v)}
          className={`p-1.5 rounded-lg transition-colors ${showStickers ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
          <Smile className="w-4 h-4" />
        </button>
        <input ref={inputRef} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder={`${username}...`}
          maxLength={120}
          className="flex-1 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5
            text-xs text-white placeholder:text-slate-600
            focus:outline-none focus:border-cyan-500/50 transition-colors" />
        <button onClick={sendBuzz} title="Buzz!"
          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
          <Zap className="w-4 h-4" />
        </button>
        <button onClick={() => send(input)} disabled={!input.trim()}
          className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-600/30
            hover:bg-cyan-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
