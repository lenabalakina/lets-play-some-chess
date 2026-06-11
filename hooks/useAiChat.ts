'use client'

import { useState, useEffect, useRef } from 'react'
import type { AiLevel } from '@/features/ai/useStockfish'
import type { MoveRecord } from '@/features/chess/types/chess.types'
import { generateConversationalReply, type ChatTurn } from '@/lib/aiChatBrain'

export interface AiChatMessage {
  text:      string
  timestamp: number
}

const EVENT_PHRASES = {
  easy: {
    start:        ["Let's play! 😊", "Good luck, hope you have fun!", "I'm still learning, be gentle 🙏", "Yay chess!! 🎉"],
    aiMove:       ["Hmm, I think this is okay? 🤔", "Your turn! 😊", "I hope that was a good move!", "Let me try this!"],
    theirMove:    ["Oh nice one!", "Wow, didn't see that! 😮", "You're really good at this!", "Ooh, clever! 🤩"],
    check:        ["Oh no, check! 😬", "You're in check! 😅", "Eek! Check!", "Careful with your king!"],
    aiCapture:    ["Oops, I took your piece 😅", "Oh! I got one! 👀", "Was that allowed? 🙈"],
    theirCapture: ["Noo my piece! 😭", "That was my favourite one!", "Ok ok, I'll get it back! 💪"],
    win:          ["Oh wow, I won! Was that okay? 😅", "Yay! Rematch? 🙏"],
    lose:         ["You won!! Congrats!! 🎉🎉", "Wow you're amazing! 🏆", "So good! Well played! 🥹"],
  },
  intermediate: {
    start:        ["Good luck — let's play a clean game.", "Ready? Let's go.", "Nice to meet you at the board.", "Let's see what you've got."],
    aiMove:       ["Your move.", "Think carefully.", "Interesting position now.", "How do you like that?"],
    theirMove:    ["Not bad.", "Solid move.", "I've seen that before.", "Hmm. Noted."],
    check:        ["Check. Don't panic.", "You're in check.", "Check — now what?"],
    aiCapture:    ["I'll take that.", "Thanks for the piece.", "One less problem for me."],
    theirCapture: ["I'll get that back.", "Enjoy it while it lasts.", "Fine. I adapt."],
    win:          ["Good game. Well played.", "GG — solid effort from you."],
    lose:         ["Well played. You earned that.", "Impressive. Rematch?", "You got me — nicely done."],
  },
  hard: {
    start:        ["Let's play.", "Ready when you are.", "Good luck.", "Shall we begin?"],
    aiMove:       ["Your move.", "There.", "Consider that.", "The position speaks."],
    theirMove:    ["Noted.", "Interesting.", "I see.", "Proceed."],
    check:        ["Check.", "Your king is in danger.", "Check — respond carefully."],
    aiCapture:    ["I'll take that.", "Captured.", "That piece is mine."],
    theirCapture: ["Noted.", "I'll adjust.", "Fair exchange."],
    win:          ["Good game.", "GG.", "Well played."],
    lose:         ["Well played. You won.", "Good game — you outplayed me.", "Impressive. Rematch?"],
  },
} as const

function pick(arr: readonly string[]) { return arr[Math.floor(Math.random() * arr.length)] }

export function useAiChat({
  aiEnabled, aiLevel, moveHistory, isGameOver, winner, myColor, playerMessage,
}: {
  aiEnabled:    boolean
  aiLevel:      AiLevel
  moveHistory:  MoveRecord[]
  isGameOver:   boolean
  winner:       string | null | undefined
  myColor:      'w' | 'b'
  playerMessage: { id: number; text: string } | null
}) {
  const [aiMessage, setAiMessage] = useState<AiChatMessage | null>(null)
  const prevMoveCount  = useRef(0)
  const prevGameOver   = useRef(false)
  const prevPlayerId   = useRef<number | null>(null)
  const startedRef     = useRef(false)
  const historyRef     = useRef<ChatTurn[]>([])
  const p              = EVENT_PHRASES[aiLevel]
  const aiColor        = myColor === 'w' ? 'b' : 'w'

  function pushHistory(role: 'player' | 'ai', text: string) {
    historyRef.current = [...historyRef.current, { role, text, ts: Date.now() }].slice(-20)
  }

  // Greeting when game / AI is enabled
  useEffect(() => {
    if (!aiEnabled || startedRef.current) return
    startedRef.current = true
    const text = pick(p.start)
    const t = setTimeout(() => {
      pushHistory('ai', text)
      setAiMessage({ text, timestamp: Date.now() })
    }, 1400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiEnabled, aiLevel])

  // Reset on new game (move count goes back to 0)
  useEffect(() => {
    if (moveHistory.length === 0) {
      prevMoveCount.current = 0
      prevGameOver.current  = false
      startedRef.current    = false
      prevPlayerId.current  = null
      historyRef.current    = []
    }
  }, [moveHistory.length])

  // React to moves
  useEffect(() => {
    if (!aiEnabled) return
    if (moveHistory.length === 0 || moveHistory.length === prevMoveCount.current) return
    prevMoveCount.current = moveHistory.length

    const last       = moveHistory[moveHistory.length - 1]
    if (!last) return
    const isAiMove   = last.color === aiColor
    const isCapture  = last.san.includes('x')
    const isCheck    = last.san.includes('+') && !last.san.includes('#')

    const shouldReact = isCheck || isCapture || Math.random() < 0.3
    if (!shouldReact) return

    let text: string
    if (isCheck && isAiMove)        text = pick(p.check)
    else if (isCapture && isAiMove) text = pick(p.aiCapture)
    else if (isCapture)             text = pick(p.theirCapture)
    else if (isAiMove)              text = pick(p.aiMove)
    else                            text = pick(p.theirMove)

    const delay = isAiMove ? 700 : 1100
    const t = setTimeout(() => {
      pushHistory('ai', text)
      setAiMessage({ text, timestamp: Date.now() })
    }, delay)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveHistory.length, aiEnabled])

  // Game over message
  useEffect(() => {
    if (!aiEnabled || !isGameOver || prevGameOver.current) return
    prevGameOver.current = true
    const aiWon = winner === aiColor
    const text = pick(aiWon ? p.win : p.lose)
    const t = setTimeout(() => {
      pushHistory('ai', text)
      setAiMessage({ text, timestamp: Date.now() })
    }, 900)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver, aiEnabled])

  // Respond to player messages with contextual conversation
  useEffect(() => {
    if (!aiEnabled || !playerMessage) return
    if (playerMessage.id === prevPlayerId.current) return
    prevPlayerId.current = playerMessage.id

    pushHistory('player', playerMessage.text)
    const reply = generateConversationalReply(playerMessage.text, historyRef.current, aiLevel)

    const t = setTimeout(() => {
      pushHistory('ai', reply)
      setAiMessage({ text: reply, timestamp: Date.now() })
    }, 700 + Math.random() * 900)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMessage, aiEnabled, aiLevel])

  return aiMessage
}
