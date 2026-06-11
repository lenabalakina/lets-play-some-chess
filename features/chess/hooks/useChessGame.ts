'use client'

import { useCallback, useReducer } from 'react'
import { Chess } from 'chess.js'
import type { Color, GameState, MoveRecord, Square } from '../types/chess.types'
import { canPlayerSelectPiece } from '../boardCoordinates'

type Action =
  | { type: 'SELECT'; square: Square }
  | { type: 'MOVE'; from: Square; to: Square; promotion?: string; timeTakenMs?: number }
  | { type: 'RESET' }
  | { type: 'RESET_FEN'; fen: string; moves: MoveRecord[] }
  | { type: 'APPLY_OPPONENT_MOVE'; from: Square; to: Square; promotion?: string; fen?: string }
  | { type: 'FORCE_GAME_OVER'; winner: Color | 'draw' }

function buildState(chess: Chess, prev: GameState, override?: Partial<GameState>): GameState {
  const isCheckmate = chess.isCheckmate()
  const isStalemate = chess.isStalemate()
  const isDraw = chess.isDraw()
  const isGameOver = chess.isGameOver()
  let winner: Color | 'draw' | null = null
  if (isCheckmate) winner = chess.turn() === 'w' ? 'b' : 'w'
  else if (isDraw || isStalemate) winner = 'draw'

  return {
    ...prev,
    fen: chess.fen(),
    turn: chess.turn() as Color,
    isCheck: chess.inCheck(),
    isCheckmate,
    isStalemate,
    isDraw,
    isGameOver,
    winner,
    legalMoves: [],
    selectedSquare: null,
    ...override,
  }
}

function buildInitialState(chess: Chess): GameState {
  return {
    fen: chess.fen(),
    turn: 'w',
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    isGameOver: false,
    winner: null,
    legalMoves: [],
    selectedSquare: null,
    lastMove: null,
  }
}

export type ColorLock = 'fixed' | 'turn'

export function useChessGame(playerColor: Color = 'w', colorLock: ColorLock = 'fixed') {
  const chessRef = { current: new Chess() }
  // We keep chess instance in a ref-like pattern via closure; reducer handles immutable state.
  // For phase 1 (local play), we instantiate once. Multiplayer will hydrate from FEN.
  const chess = new Chess()

  const [state, dispatch] = useReducer(
    (state: GameState, action: Action): GameState => {
      switch (action.type) {
        case 'SELECT': {
          if (state.isGameOver) return state
          const { square } = action
          const activeColor = colorLock === 'turn' ? state.turn : playerColor
          if (state.turn !== activeColor) {
            return { ...state, selectedSquare: null, legalMoves: [] }
          }
          if (state.selectedSquare === square) {
            return { ...state, selectedSquare: null, legalMoves: [] }
          }
          if (!canPlayerSelectPiece(state.fen, square, activeColor, state.turn === activeColor)) {
            return { ...state, selectedSquare: null, legalMoves: [] }
          }
          const tempChess = new Chess(state.fen)
          const moves = tempChess.moves({ square: square as Parameters<typeof tempChess.moves>[0]['square'], verbose: true })
          const targets = moves.map(m => m.to)
          return { ...state, selectedSquare: square, legalMoves: targets }
        }

        case 'MOVE': {
          if (state.isGameOver) return state
          const tempChess = new Chess(state.fen)
          try {
            const result = tempChess.move({
              from: action.from,
              to: action.to,
              promotion: action.promotion ?? 'q',
            })
            if (!result) return state

            const newMove: MoveRecord = {
              san: result.san,
              from: action.from,
              to: action.to,
              fen: tempChess.fen(),
              moveNumber: Math.ceil(state.moveHistory.length / 2) + 1,
              color: result.color as Color,
              timeTakenMs: action.timeTakenMs,
            }

            return buildState(tempChess, state, {
              moveHistory: [...state.moveHistory, newMove],
              lastMove: { from: action.from, to: action.to },
            })
          } catch {
            return state
          }
        }

        case 'APPLY_OPPONENT_MOVE': {
          // If server already computed the FEN, trust it directly
          if (action.fen) {
            const tempChess = new Chess(action.fen)
            const newMove: MoveRecord = {
              san: '', from: action.from, to: action.to,
              fen: action.fen,
              moveNumber: Math.ceil(state.moveHistory.length / 2) + 1,
              color: (state.turn === 'w' ? 'w' : 'b') as Color,
            }
            return buildState(tempChess, state, {
              moveHistory: [...state.moveHistory, newMove],
              lastMove: { from: action.from, to: action.to },
            })
          }
          const tempChess = new Chess(state.fen)
          try {
            const result = tempChess.move({
              from: action.from,
              to: action.to,
              promotion: action.promotion ?? 'q',
            })
            if (!result) return state
            const newMove: MoveRecord = {
              san: result.san, from: action.from, to: action.to,
              fen: tempChess.fen(),
              moveNumber: Math.ceil(state.moveHistory.length / 2) + 1,
              color: result.color as Color,
            }
            return buildState(tempChess, state, {
              moveHistory: [...state.moveHistory, newMove],
              lastMove: { from: action.from, to: action.to },
            })
          } catch { return state }
        }

        case 'RESET':
          return buildInitialState(new Chess())

        case 'RESET_FEN': {
          const tempChess = new Chess(action.fen)
          return buildState(tempChess, state, {
            moveHistory: action.moves,
            lastMove: action.moves.length > 0
              ? { from: action.moves[action.moves.length - 1].from, to: action.moves[action.moves.length - 1].to }
              : null,
          })
        }

        case 'FORCE_GAME_OVER':
          return {
            ...state,
            isGameOver: true,
            isCheckmate: action.winner !== 'draw',
            isDraw: action.winner === 'draw',
            winner: action.winner,
          }

        default:
          return state
      }
    },
    undefined,
    () => buildInitialState(chess)
  )

  const selectSquare = useCallback((square: Square) => {
    if (state.isGameOver) return

    // If we have a selected piece and click a legal target → move
    if (state.selectedSquare && state.legalMoves.includes(square)) {
      // Check for pawn promotion
      const tempChess = new Chess(state.fen)
      const piece = tempChess.get(state.selectedSquare as Parameters<typeof tempChess.get>[0])
      const isPromotion = piece?.type === 'p' && (
        (piece.color === 'w' && square[1] === '8') ||
        (piece.color === 'b' && square[1] === '1')
      )
      dispatch({ type: 'MOVE', from: state.selectedSquare, to: square, promotion: isPromotion ? 'q' : undefined })
    } else {
      dispatch({ type: 'SELECT', square })
    }
  }, [state])

  const makeMove = useCallback((from: Square, to: Square, promotion?: string, timeTakenMs?: number) => {
    dispatch({ type: 'MOVE', from, to, promotion, timeTakenMs })
  }, [])

  const applyOpponentMove = useCallback((from: Square, to: Square, promotion?: string, fen?: string) => {
    dispatch({ type: 'APPLY_OPPONENT_MOVE', from, to, promotion, fen })
  }, [])

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const hydrate = useCallback((fen: string, moves: MoveRecord[]) => {
    dispatch({ type: 'RESET_FEN', fen, moves })
  }, [])

  const forceGameOver = useCallback((winner: Color | 'draw') => {
    dispatch({ type: 'FORCE_GAME_OVER', winner })
  }, [])

  const isMyTurn = colorLock === 'turn' ? !state.isGameOver : state.turn === playerColor

  return { state, selectSquare, makeMove, applyOpponentMove, resetGame, hydrate, forceGameOver, isMyTurn }
}
