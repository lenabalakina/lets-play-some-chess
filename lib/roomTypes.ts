export interface RoomMove {
  from: string
  to: string
  promotion?: string
  san: string
  fen: string
}

export interface ChatMessage {
  color: 'w' | 'b'
  text:  string
  ts:    number
}

export interface Room {
  code:    string
  fen:     string
  turn:    'w' | 'b'
  white:   string | null
  black:   string | null
  status:  'waiting' | 'playing' | 'finished'
  winner:  'w' | 'b' | 'draw' | null
  moves:   RoomMove[]
  messages: ChatMessage[]
  drawOfferedBy: 'w' | 'b' | null
  createdAt:       number
  lastActivityAt:  number
  subscribers: Map<string, ReadableStreamDefaultController<Uint8Array>>
}

export type SafeRoom = Omit<Room, 'white' | 'black' | 'subscribers'>
