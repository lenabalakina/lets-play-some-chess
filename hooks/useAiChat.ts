'use client'

import { useState, useEffect, useRef } from 'react'
import type { AiLevel } from '@/features/ai/useStockfish'
import type { MoveRecord } from '@/features/chess/types/chess.types'

export interface AiChatMessage {
  text:      string
  timestamp: number
}

const P = {
  easy: {
    start:        ["Let's play! 😊", "Good luck, hope you have fun!", "I'm still learning, be gentle 🙏", "Yay chess!! 🎉"],
    aiMove:       ["Hmm, I think this is okay? 🤔", "Your turn! 😊", "I hope that was a good move!", "Let me try this!"],
    theirMove:    ["Oh nice one!", "Wow, didn't see that! 😮", "You're really good at this!", "Ooh, clever! 🤩"],
    check:        ["Oh no, check! 😬", "You're in check! 😅", "Eek! Check!", "Careful with your king!"],
    aiCapture:    ["Oops, I took your piece 😅", "Oh! I got one! 👀", "Was that allowed? 🙈"],
    theirCapture: ["Noo my piece! 😭", "That was my favourite one!", "Ok ok, I'll get it back! 💪"],
    win:          ["Oh wow, I won! Was that okay? 😅", "Yay! Rematch? 🙏"],
    lose:         ["You won!! Congrats!! 🎉🎉", "Wow you're amazing! 🏆", "So good! Well played! 🥹"],
    respond:      ["Hehe 😄", "You're so nice!", "Let's have fun!", "Thanks! Good luck! 🤝", "Aww 😊", "Teehee 🙈"],
  },
  intermediate: {
    start:        ["Good luck. You'll need it.", "Let's see what you've got.", "Ready? Let's go.", "I've been practising. 😏"],
    aiMove:       ["Consider that.", "Your move.", "Think carefully.", "How do you like that? 😏", "Interesting position now."],
    theirMove:    ["Not bad.", "Predictable.", "I've seen that before.", "Solid. But not solid enough.", "Hmm. Noted."],
    check:        ["Check. Don't panic.", "You're in check. Deal with it.", "Tick tock ⏰", "Check — now what?"],
    aiCapture:    ["Thanks for the piece 😌", "I'll take that.", "Donation accepted.", "One less problem for me."],
    theirCapture: ["I'll get that back.", "Enjoy it while it lasts.", "Calculated sacrifice.", "Fine. I adapt 🧠"],
    win:          ["As expected.", "Good game. Almost.", "You played well — not well enough though. GG."],
    lose:         ["Well played. I underestimated you.", "You earned that. Rematch?", "Impressive. Round 2?"],
    respond:      ["Focus on the game.", "Less talking, more thinking.", "Save it for after you win.", "Noted.", "Sure."],
  },
  hard: {
    start:        ["This won't take long.", "I've already calculated your defeat.", "Don't embarrass yourself.", "Prepare."],
    aiMove:       ["Inevitable.", "I'm already 15 moves ahead.", "Resistance is futile.", "Did you see that coming? 😏", "Tick tock."],
    theirMove:    ["Amateur.", "Exactly as predicted.", "Try harder.", "Is that the best you've got?", "Cute attempt."],
    check:        ["CHECK. The end is near.", "Your king trembles. 👑", "Just resign now and save us time.", "Feel that? That's inevitability."],
    aiCapture:    ["Pathetic defense.", "Another one falls.", "Your pieces crumble.", "Poetic, isn't it? 🖤"],
    theirCapture: ["A gift? How kind 🎁", "You'll regret that.", "Enjoy your hollow victory.", "I let you have that. Obviously."],
    win:          ["Predictable.", "I was bored, honestly.", "You never had a chance. GG I suppose."],
    lose:         ["...Impossible.", "You got lucky. That's all.", "Rematch. Now."],
    respond:      ["...", "Your words, like your moves, are weak.", "Silence won't save you.", "Fascinating. Still losing though."],
  },
}

function pick(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)] }

export function useAiChat({
  aiEnabled, aiLevel, moveHistory, isGameOver, winner, myColor, playerMessage,
}: {
  aiEnabled:    boolean
  aiLevel:      AiLevel
  moveHistory:  MoveRecord[]
  isGameOver:   boolean
  winner:       string | null | undefined
  myColor:      'w' | 'b'
  playerMessage: string | null
}) {
  const [aiMessage, setAiMessage] = useState<AiChatMessage | null>(null)
  const prevMoveCount  = useRef(0)
  const prevGameOver   = useRef(false)
  const prevPlayerMsg  = useRef<string | null>(null)
  const startedRef     = useRef(false)
  const p              = P[aiLevel]
  const aiColor        = myColor === 'w' ? 'b' : 'w'

  // Greeting when game / AI is enabled
  useEffect(() => {
    if (!aiEnabled || startedRef.current) return
    startedRef.current = true
    const t = setTimeout(() => setAiMessage({ text: pick(p.start), timestamp: Date.now() }), 1400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiEnabled, aiLevel])

  // Reset on new game (move count goes back to 0)
  useEffect(() => {
    if (moveHistory.length === 0) {
      prevMoveCount.current = 0
      prevGameOver.current  = false
      startedRef.current    = false
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

    // React to special events always; otherwise ~30% chance
    const shouldReact = isCheck || isCapture || Math.random() < 0.3
    if (!shouldReact) return

    let text: string
    if (isCheck && isAiMove)        text = pick(p.check)
    else if (isCapture && isAiMove) text = pick(p.aiCapture)
    else if (isCapture)             text = pick(p.theirCapture)
    else if (isAiMove)              text = pick(p.aiMove)
    else                            text = pick(p.theirMove)

    const delay = isAiMove ? 700 : 1100
    const t = setTimeout(() => setAiMessage({ text, timestamp: Date.now() }), delay)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveHistory.length, aiEnabled])

  // Game over message
  useEffect(() => {
    if (!aiEnabled || !isGameOver || prevGameOver.current) return
    prevGameOver.current = true
    const aiWon = winner === aiColor
    const t = setTimeout(() => {
      setAiMessage({ text: pick(aiWon ? p.win : p.lose), timestamp: Date.now() })
    }, 900)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver, aiEnabled])

  // Respond to player messages
  useEffect(() => {
    if (!aiEnabled || !playerMessage) return
    const t = setTimeout(() => {
      prevPlayerMsg.current = playerMessage
      setAiMessage({ text: pick(p.respond), timestamp: Date.now() })
    }, 700 + Math.random() * 900)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMessage, aiEnabled])

  return aiMessage
}
