import type { AiLevel } from '@/features/ai/useStockfish'

export interface ChatTurn {
  role:    'player' | 'ai'
  text:    string
  ts:      number
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function matches(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text))
}

const GREETING = [/^(hi|hey|hello|hiya|heya|yo|sup|howdy)\b/i, /\bgood (morning|afternoon|evening)\b/i]
const HOW_ARE_YOU = [/\bhow (are|r) (you|u)\b/i, /\bhow('s| is) it going\b/i, /\bwhat('s| is) up\b/i]
const THANKS = [/\bthank(s| you| u)\b/i, /\bthx\b/i, /\bty\b/i, /\bappreciate\b/i]
const GOOD_LUCK = [/\bgood luck\b/i, /\bgl\b/i, /\bbreak a leg\b/i]
const COMPLIMENT = [/\byou('re| are) (nice|kind|sweet|cool|awesome|great|fun)\b/i, /\blove (this|playing|chess)\b/i, /\bnice (chat|talking)\b/i]
const NAME_ASK = [/\bwhat('s| is) your name\b/i, /\bwho are you\b/i]
const CHESS_ASK = [/\bwhat (move|opening)\b/i, /\bany (tips|advice)\b/i, /\bhow do (i|you) (play|win)\b/i]
const FEELING_GOOD = [/\bi('m| am) (good|great|fine|ok|okay|well)\b/i, /\bdoing (good|great|fine|well)\b/i]
const REMATCH = [/\brematch\b/i, /\bplay again\b/i, /\bone more\b/i]
const GG = [/\bgg\b/i, /\bgood game\b/i, /\bwell played\b/i]

type Personality = {
  greeting:     string[]
  howAreYou:    string[]
  thanks:       string[]
  goodLuck:     string[]
  compliment:   string[]
  nameAsk:      string[]
  chessAsk:     string[]
  feelingGood:  string[]
  rematch:      string[]
  gg:           string[]
  question:     string[]
  fallback:     string[]
}

const PERSONALITIES: Record<AiLevel, Personality> = {
  easy: {
    greeting:    ['Hey! So happy to play with you! 😊', 'Hi there! Ready for a fun game? ♟️', 'Hello! Let\'s have a great time! 🎉'],
    howAreYou:   ['I\'m doing wonderful, thanks for asking! How are you? 😊', 'Great! I love playing chess. How about you?', 'Feeling cheerful! Hope you\'re having a good day too! ☀️'],
    thanks:      ['You\'re so welcome! 🤝', 'Aww, anytime! 😊', 'Happy to chat! That\'s what friends do!'],
    goodLuck:    ['Good luck to you too! May the best player win! 🤝', 'Thanks! Let\'s both play our best! ♟️', 'Good luck! This is going to be fun! 😊'],
    compliment:  ['You\'re so sweet! That made my day! 🥹', 'Aww, you\'re really kind! I\'m glad we\'re playing together!', 'That\'s so nice of you to say! 😊'],
    nameAsk:     ['I\'m Stockfish — your friendly chess buddy today! ♟️', 'Call me Stockfish! Nice to meet you! 😊'],
    chessAsk:    ['Just have fun and look for safe moves! You\'ve got this! 💪', 'Try to protect your king and develop your pieces — you\'re doing great!', 'Every move is a chance to learn. Enjoy the game! ♟️'],
    feelingGood: ['That\'s wonderful to hear! 😊', 'Love that energy! Let\'s have a great game!', 'So glad you\'re doing well! Me too!'],
    rematch:     ['Yes! I\'d love a rematch! 🎉', 'Absolutely! Let\'s go again!', 'Sure thing! That was fun!'],
    gg:          ['Good game! You played really well! 🤝', 'GG! That was so much fun! Well played!', 'Great game! Thanks for playing with me! 🎉'],
    question:    ['Hmm, good question! I\'m just here to enjoy the game with you! 😊', 'That\'s interesting! What do you think?', 'I\'m not sure, but I\'m having fun chatting with you!'],
    fallback:    ['That\'s nice! Tell me more! 😊', 'I hear you! Let\'s keep having fun!', 'Cool! I\'m enjoying our chat!', 'Nice! How\'s the game going for you?', 'Haha, I like talking with you! ♟️'],
  },
  intermediate: {
    greeting:    ['Hey! Good to see you at the board.', 'Hello — ready for a solid game?', 'Hi! Let\'s play some chess.'],
    howAreYou:   ['Doing well, thanks. Ready to focus on the game?', 'I\'m good — hope you are too. Let\'s play!', 'All set on my end. How are you feeling about this game?'],
    thanks:      ['You\'re welcome.', 'Anytime — good sportsmanship matters.', 'Happy to chat between moves.'],
    goodLuck:    ['Good luck — may the best moves win.', 'Likewise! Let\'s play a clean game.', 'Thanks, you too.'],
    compliment:  ['Appreciate that — you\'re a good opponent.', 'Thanks, that\'s kind of you.', 'Good vibes — I like that.'],
    nameAsk:     ['Stockfish, at your service.', 'I\'m Stockfish — your opponent today.'],
    chessAsk:    ['Watch your center and piece activity — basics win games.', 'Look for tactics, but don\'t rush. Patience pays off.', 'Think one move ahead of your last plan.'],
    feelingGood: ['Glad to hear it.', 'Good — let\'s channel that into the game.', 'Nice. Same here.'],
    rematch:     ['Sure — rematch sounds good.', 'I\'m in. One more game?', 'Let\'s run it back.'],
    gg:          ['GG — well played.', 'Good game. Solid effort.', 'GG WP.'],
    question:    ['Interesting question. What\'s your read on the position?', 'Good point. The board will tell us more.', 'Fair question — chess always has more to teach.'],
    fallback:    ['Noted. Let\'s keep it friendly.', 'Fair enough. Your move when ready.', 'Got it. Good chat.', 'I appreciate the conversation.', 'Makes sense. Let\'s keep playing.'],
  },
  hard: {
    greeting:    ['Hello. Let\'s play.', 'Ready when you are.', 'Good to meet you at the board.'],
    howAreYou:   ['Focused and ready. You?', 'Doing well. Let\'s see how this game unfolds.', 'I\'m in good form. Hope you are too.'],
    thanks:      ['You\'re welcome.', 'Of course.', 'My pleasure.'],
    goodLuck:    ['Good luck — play your best.', 'Likewise.', 'Thanks. Let\'s make it a good game.'],
    compliment:  ['Thank you — that\'s gracious.', 'I appreciate that.', 'Kind words. Thank you.'],
    nameAsk:     ['Stockfish.', 'I\'m Stockfish — your opponent.'],
    chessAsk:    ['Calculate carefully and don\'t blunder.', 'Precision matters more than speed.', 'Look for your opponent\'s threats first.'],
    feelingGood: ['Good to hear.', 'Excellent.', 'Glad.'],
    rematch:     ['Rematch accepted.', 'Again, then.', 'Let\'s play another.'],
    gg:          ['Good game.', 'GG.', 'Well played.'],
    question:    ['An interesting thought.', 'The position will answer that.', 'Chess rewards patience.'],
    fallback:    ['Understood.', 'Noted.', 'Fair point.', 'Let\'s continue.', 'I hear you.'],
  },
}

export function generateConversationalReply(
  playerMessage: string,
  history: ChatTurn[],
  level: AiLevel,
): string {
  const text = playerMessage.trim()
  const p = PERSONALITIES[level]

  if (matches(text, GREETING))       return pick(p.greeting)
  if (matches(text, HOW_ARE_YOU))    return pick(p.howAreYou)
  if (matches(text, THANKS))         return pick(p.thanks)
  if (matches(text, GOOD_LUCK))      return pick(p.goodLuck)
  if (matches(text, COMPLIMENT))     return pick(p.compliment)
  if (matches(text, NAME_ASK))       return pick(p.nameAsk)
  if (matches(text, CHESS_ASK))      return pick(p.chessAsk)
  if (matches(text, FEELING_GOOD))   return pick(p.feelingGood)
  if (matches(text, REMATCH))        return pick(p.rematch)
  if (matches(text, GG))             return pick(p.gg)
  if (text.includes('?'))            return pick(p.question)

  // Reference recent context for more natural flow
  const lastAi = [...history].reverse().find(t => t.role === 'ai')
  if (lastAi && matches(text, [/\byes\b/i, /\byeah\b/i, /\bsure\b/i, /\bok\b/i, /\bokay\b/i])) {
    return level === 'easy'
      ? pick(['Yay! 😊', 'Awesome!', 'Love that energy!'])
      : pick(['Great.', 'Perfect.', 'Good.'])
  }

  if (matches(text, [/\bno\b/i, /\bnah\b/i, /\bnot really\b/i])) {
    return level === 'easy'
      ? pick(['No worries! We\'re still having fun! 😊', 'That\'s okay! I\'m just happy to play!', 'All good! ♟️'])
      : pick(['Fair enough.', 'No problem.', 'Understood.'])
  }

  return pick(p.fallback)
}
