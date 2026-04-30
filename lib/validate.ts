import { z } from 'zod'

// ── Chess primitives ──────────────────────────────────────────────────────────

const SQUARES = /^[a-h][1-8]$/
const TIME_CONTROLS = ['bullet_1', 'blitz_3', 'blitz_5', 'rapid_10', 'classic_15'] as const
const PROMO_PIECES = ['q', 'r', 'b', 'n'] as const

export const squareSchema = z.string().regex(SQUARES, 'Invalid square notation')
export const timeControlSchema = z.enum(TIME_CONTROLS)
export const promoPieceSchema = z.enum(PROMO_PIECES).optional()
export const uuidSchema = z.string().uuid('Invalid UUID')

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -'),
})

export const signInSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

// ── Game actions ──────────────────────────────────────────────────────────────

export const recordMoveSchema = z.object({
  gameId:      uuidSchema,
  from:        squareSchema,
  to:          squareSchema,
  promotion:   promoPieceSchema,
  timeTakenMs: z.number().int().min(0).max(3_600_000),
})

export const gameIdSchema = z.object({
  gameId: uuidSchema,
})

export const joinQueueSchema = z.object({
  timeControl: timeControlSchema,
})

// ── Validation helper ─────────────────────────────────────────────────────────

export function validate<T>(schema: z.ZodType<T>, data: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join(', ')
    return { error: msg }
  }
  return { data: result.data }
}
