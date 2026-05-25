'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { Globe, Bot, Users, Trophy, Zap, Shield, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

const PIECES = ['♟', '♞', '♝', '♜', '♛', '♚', '♙', '♘', '♗', '♖', '♕', '♔']

const FLOATERS = [
  { piece: '♞', x: '8%',  y: '15%', size: 28, delay: 0,   duration: 7  },
  { piece: '♜', x: '88%', y: '12%', size: 22, delay: 1.2, duration: 9  },
  { piece: '♝', x: '5%',  y: '70%', size: 20, delay: 2.5, duration: 8  },
  { piece: '♛', x: '92%', y: '65%', size: 30, delay: 0.8, duration: 11 },
  { piece: '♚', x: '15%', y: '88%', size: 18, delay: 3.1, duration: 6  },
  { piece: '♙', x: '80%', y: '82%', size: 16, delay: 1.7, duration: 10 },
  { piece: '♗', x: '50%', y: '6%',  size: 17, delay: 4,   duration: 7  },
  { piece: '♘', x: '72%', y: '40%', size: 14, delay: 2,   duration: 9  },
]

const FEATURES = [
  {
    icon: Globe,
    title: 'Online Multiplayer',
    desc: 'Create a room, share a code, challenge anyone on the planet in seconds.',
    glow: 'rgba(6,182,212,0.4)',
    border: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Bot,
    title: 'AI Opponent',
    desc: 'Easy, Intermediate, or Hard — powered by Stockfish. It does not forgive mistakes.',
    glow: 'rgba(124,58,237,0.4)',
    border: 'border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    icon: Trophy,
    title: 'Rated Games',
    desc: 'Climb the leaderboard. Your Elo rises and falls with every match.',
    glow: 'rgba(234,179,8,0.3)',
    border: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
  },
  {
    icon: Zap,
    title: '3D Board + Themes',
    desc: 'Neon, Void, Ember, Arctic — flip to full 3D with one toggle.',
    glow: 'rgba(249,115,22,0.3)',
    border: 'border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  {
    icon: Users,
    title: 'Pass & Play',
    desc: 'No account needed. Two players, one screen, let the best one win.',
    glow: 'rgba(34,197,94,0.3)',
    border: 'border-green-500/30',
    iconColor: 'text-green-400',
  },
  {
    icon: Shield,
    title: 'Fair Play',
    desc: 'Anti-cheat built in. Win on skill, not on engines.',
    glow: 'rgba(244,63,94,0.3)',
    border: 'border-rose-500/30',
    iconColor: 'text-rose-400',
  },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export default function TryoutPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY    = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <div className="min-h-screen bg-[#070d1a] text-white overflow-x-hidden" style={{ fontFamily: 'inherit' }}>

      {/* ── Scanline overlay ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)',
        }}
      />

      {/* ── Grid bg ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Floating background pieces ── */}
      {FLOATERS.map((f, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none fixed select-none z-0 text-cyan-400/10"
          style={{ left: f.x, top: f.y, fontSize: f.size, fontVariantEmoji: 'text' }}
          animate={{ y: [0, -18, 0], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {f.piece}
        </motion.span>
      ))}

      {/* ════════════════════════════════
          HEADER
      ════════════════════════════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-slate-800/50"
      >
        <Link href="/" aria-label="Go to homepage" className="flex items-center gap-2 cursor-pointer group">
          {/* Logo pawn — slow spin */}
          <motion.span
            className="text-cyan-400 inline-block leading-none select-none"
            style={{ fontSize: 22, fontVariantEmoji: 'text',
              textShadow: '0 0 30px rgba(6,182,212,0.9), 0 0 80px rgba(6,182,212,0.5)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            ♟︎
          </motion.span>
          <span className="font-bold tracking-wide group-hover:opacity-80 transition-opacity"
            style={{ textShadow: '0 0 20px rgba(6,182,212,0.8)' }}>
            LET&apos;S PLAY SOME CHESS
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-slate-400 hover:text-white text-sm transition-colors px-4 py-2 cursor-pointer">
            Sign In
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg text-sm font-semibold
                bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
                hover:bg-cyan-500/30 transition-all cursor-pointer"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <section ref={heroRef} className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">

        {/* Radial glow behind pawn */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,182,212,0.12) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="flex flex-col items-center">

          {/* ── Central rotating ring + pawn ── */}
          <div className="relative flex items-center justify-center mb-10" style={{ width: 200, height: 200 }}>

            {/* Outer orbit ring */}
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-500/20"
              style={{ boxShadow: '0 0 40px rgba(6,182,212,0.15)' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            >
              {/* 4 dots on the ring */}
              {[0, 90, 180, 270].map((deg) => (
                <span
                  key={deg}
                  className="absolute w-2 h-2 rounded-full bg-cyan-400"
                  style={{
                    top: '50%', left: '50%',
                    transform: `rotate(${deg}deg) translateX(96px) translateY(-50%)`,
                    boxShadow: '0 0 8px rgba(6,182,212,0.8)',
                  }}
                />
              ))}
            </motion.div>

            {/* Inner counter-rotating ring */}
            <motion.div
              className="absolute rounded-full border border-violet-500/20"
              style={{ inset: 24, boxShadow: '0 0 20px rgba(124,58,237,0.1)' }}
              animate={{ rotate: -360 }}
              transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
            >
              {[45, 225].map((deg) => (
                <span
                  key={deg}
                  className="absolute w-1.5 h-1.5 rounded-full bg-violet-400"
                  style={{
                    top: '50%', left: '50%',
                    transform: `rotate(${deg}deg) translateX(62px) translateY(-50%)`,
                    boxShadow: '0 0 6px rgba(124,58,237,0.8)',
                  }}
                />
              ))}
            </motion.div>

            {/* Center pawn — pulse + slow float */}
            <motion.span
              className="relative z-10 text-cyan-400 select-none"
              style={{
                fontSize: 80,
                fontVariantEmoji: 'text',
                textShadow: '0 0 40px rgba(6,182,212,1), 0 0 100px rgba(6,182,212,0.5)',
              }}
              animate={{ y: [0, -10, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              ♟︎
            </motion.span>
          </div>

          {/* ── Title ── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mb-4"
          >
            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-7xl font-black tracking-tight leading-none"
              style={{ textShadow: '0 0 60px rgba(6,182,212,0.6)' }}
            >
              SO, YOU&apos;RE READY
            </motion.h1>
            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-7xl font-black tracking-tight leading-none"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #a78bfa 60%, #f43f5e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              FOR SOME CHESS?
            </motion.h1>
          </motion.div>

          {/* ── Subtitle ── */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-slate-400 text-xl mb-10 max-w-lg font-light"
          >
            Your move. Make it legendary.
          </motion.p>

          {/* ── CTA Buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/play/online"
                className="flex items-center gap-3 px-8 py-4 rounded-xl font-black tracking-wider text-lg
                  bg-cyan-500 text-slate-950 cursor-pointer
                  shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:shadow-[0_0_70px_rgba(6,182,212,0.9)]
                  transition-shadow"
              >
                <Globe className="w-5 h-5" />
                PLAY ONLINE
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/play/ai"
                className="flex items-center gap-3 px-8 py-4 rounded-xl font-black tracking-wider text-lg
                  border border-violet-500/50 text-violet-300 bg-violet-500/10 cursor-pointer
                  hover:border-violet-400 hover:bg-violet-500/20 transition-all"
              >
                <Bot className="w-5 h-5" />
                VS AI
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/play/3d"
                className="flex items-center gap-3 px-8 py-4 rounded-xl font-black tracking-wider text-lg
                  border border-slate-700/50 text-slate-500 cursor-pointer
                  hover:border-slate-600 hover:text-slate-300 transition-all"
              >
                <Users className="w-5 h-5" />
                PASS &amp; PLAY
              </Link>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="text-slate-600 text-sm"
          >
            No account needed •{' '}
            <Link href="/register" className="text-cyan-600 hover:text-cyan-400 transition-colors cursor-pointer">
              Create one
            </Link>
            {' '}to track your rating
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 flex flex-col items-center gap-1 text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            className="w-px h-10 bg-gradient-to-b from-transparent to-slate-600"
            animate={{ scaleY: [0, 1, 0], originY: 'top' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-xs tracking-widest uppercase">scroll</span>
        </motion.div>
      </section>

      {/* ════════════════════════════════
          MINI CHESS BOARD VISUAL
      ════════════════════════════════ */}
      <section className="relative z-10 flex justify-center py-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotateX: 30 }}
          whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="relative"
          style={{ perspective: 600 }}
        >
          {/* Board */}
          <div
            className="grid rounded-xl overflow-hidden border border-cyan-500/20"
            style={{
              gridTemplateColumns: 'repeat(8, 40px)',
              gridTemplateRows: 'repeat(8, 40px)',
              boxShadow: '0 0 60px rgba(6,182,212,0.2), 0 0 120px rgba(124,58,237,0.1)',
            }}
          >
            {Array.from({ length: 64 }).map((_, i) => {
              const row = Math.floor(i / 8)
              const col = i % 8
              const isLight = (row + col) % 2 === 0
              return (
                <div
                  key={i}
                  className={isLight ? 'bg-slate-700/60' : 'bg-slate-900/90'}
                />
              )
            })}
          </div>

          {/* Glow overlay */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.08) 0%, transparent 70%)',
            }}
          />
        </motion.div>
      </section>

      {/* ════════════════════════════════
          FEATURES
      ════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3"
            style={{ textShadow: '0 0 40px rgba(6,182,212,0.4)' }}>
            EVERYTHING YOU NEED
          </h2>
          <p className="text-slate-500 text-lg">One site. All the chess.</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl p-6 border ${f.border} cursor-default
                bg-slate-900/50 backdrop-blur-sm relative overflow-hidden group`}
              style={{ boxShadow: `0 0 0 0 ${f.glow}` }}
            >
              {/* Hover glow */}
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(ellipse at 30% 30%, ${f.glow} 0%, transparent 60%)` }}
              />

              <f.icon className={`w-6 h-6 ${f.iconColor} mb-4 relative z-10`} />
              <h3 className="font-bold text-base mb-2 relative z-10">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed relative z-10">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════════════════════════
          ROTATING PIECES MARQUEE
      ════════════════════════════════ */}
      <section className="relative z-10 py-10 overflow-hidden border-y border-slate-800/40">
        <motion.div
          className="flex gap-12 whitespace-nowrap"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        >
          {[...PIECES, ...PIECES].map((p, i) => (
            <motion.span
              key={i}
              className="text-4xl text-slate-700 select-none inline-block"
              style={{ fontVariantEmoji: 'text' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6 + (i % 4), repeat: Infinity, ease: 'linear' }}
            >
              {p}
            </motion.span>
          ))}
        </motion.div>
      </section>

      {/* ════════════════════════════════
          BOTTOM CTA
      ════════════════════════════════ */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          {/* Rotating king */}
          <motion.span
            className="block text-6xl mb-6 text-yellow-400 select-none"
            style={{
              fontVariantEmoji: 'text',
              textShadow: '0 0 40px rgba(234,179,8,0.8)',
            }}
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            ♔
          </motion.span>

          <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            YOUR MOVE.
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-md">
            No sign-up required to play. Create an account to save your rating and history.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/play/online"
                className="flex items-center gap-3 px-10 py-4 rounded-xl font-black tracking-wider text-lg
                  bg-cyan-500 text-slate-950 cursor-pointer
                  shadow-[0_0_50px_rgba(6,182,212,0.5)] hover:shadow-[0_0_80px_rgba(6,182,212,0.9)]
                  transition-shadow"
              >
                PLAY NOW <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="flex items-center gap-3 px-10 py-4 rounded-xl font-black tracking-wider text-lg
                  border border-slate-700 text-slate-300 cursor-pointer
                  hover:border-cyan-500/50 hover:text-white transition-all"
              >
                CREATE ACCOUNT
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center py-6 text-slate-700 text-xs border-t border-slate-800/30">
        Let&apos;s Play Some Chess
      </footer>
    </div>
  )
}
