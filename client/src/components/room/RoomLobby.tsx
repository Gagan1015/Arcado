'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GAMES, type Room } from '@arcado/shared'
import { FlagelPlayArea } from '@/components/room/FlagelPlayArea'
import { SkribblePlayArea } from '@/components/room/SkribblePlayArea'
import { TriviaPlayArea } from '@/components/room/TriviaPlayArea'
import { WordelPlayArea } from './WordelPlayArea'
import { useRoom } from '@/hooks/useRoom'
import { getGameInfo } from '@/lib/games'
import { buildSoloPlayUrl } from '@/lib/soloPlay'
import { LiveIndicator } from '@/components/ui/Animated'
import { AppLayout } from '@/components/layout/AppLayout'
import { GameIcon } from '@/components/ui/GameIcons'
import { Toast } from '@/components/ui/Toast'

/* â”€â”€ SVG Icons â”€â”€ */

function IconCopy({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconCrown({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 18.5l2-10 5 4 2.5-6 2.5 6 5-4 2 10z" />
    </svg>
  )
}

function IconHome({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconLogOut({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconPlay({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function IconUserX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <line x1="17" y1="8" x2="23" y2="14" />
      <line x1="23" y1="8" x2="17" y2="14" />
    </svg>
  )
}

function IconWifiOff({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  )
}

function IconUsers({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconUser({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  )
}

function IconZap({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function IconArrowLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function IconShare({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

type RoomLobbyProps = {
  roomCode: string
  currentUserId: string
  initialRoom: Room
  autoStartOnJoin?: boolean
}

export function RoomLobby({
  roomCode,
  currentUserId,
  initialRoom,
  autoStartOnJoin = false,
}: RoomLobbyProps) {
  const router = useRouter()
  const [copyLabel, setCopyLabel] = useState<'copy' | 'copied'>('copy')
  const [didAutoStart, setDidAutoStart] = useState(false)
  const {
    room,
    players,
    isJoining,
    isConnected,
    isHost,
    error,
    notification,
    hasLeft,
    leave,
    startGame,
    kickPlayer,
    flagel,
    trivia,
    wordel,
    skribble,
    submitFlagelGuess,
    skipFlagelRound,
    submitTriviaAnswer,
    submitWordelGuess,
    sendSkribbleStrokes,
    clearSkribbleCanvas,
    submitSkribbleGuess,
    chooseSkribbleWord,
    dismissNotification,
  } = useRoom({
    roomCode,
    currentUserId,
    initialRoom,
  })

  const activeRoom = room ?? initialRoom

  useEffect(() => {
    if (hasLeft) router.push('/lobby')
  }, [hasLeft, router])

  useEffect(() => {
    if (!notification) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      dismissNotification()
    }, 3200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [dismissNotification, notification])

  useEffect(() => {
    if (!autoStartOnJoin || didAutoStart) {
      return
    }

    if (
      !isConnected ||
      isJoining ||
      room?.code !== roomCode ||
      !isHost ||
      activeRoom.status !== 'waiting'
    ) {
      return
    }

    startGame()
    setDidAutoStart(true)
  }, [activeRoom.status, autoStartOnJoin, didAutoStart, isConnected, isHost, isJoining, room?.code, roomCode, startGame])
  const game = getGameInfo(activeRoom.gameId)
  const sharedGame = GAMES[activeRoom.gameId]
  const connectedPlayers = players.filter((p) => p.isConnected).length
  const isSolo = activeRoom.maxPlayers === 1

  function handlePlayAgain() {
    if (isSolo) {
      window.location.assign(
        buildSoloPlayUrl(activeRoom.gameId, {
          settings: activeRoom.settings,
        })
      )
      return
    }

    startGame()
  }

  useEffect(() => {
    setDidAutoStart(false)
  }, [roomCode])

  async function handleCopyInvite() {
    const inviteUrl = `${window.location.origin}/rooms/${roomCode}`
    await navigator.clipboard.writeText(inviteUrl)
    setCopyLabel('copied')
    setTimeout(() => setCopyLabel('copy'), 1500)
  }

  /* â”€â”€ Game play areas â”€â”€ */
  const gamePlayArea = (
    <>
      {activeRoom.gameId === 'wordel' && activeRoom.status !== 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <WordelPlayArea
            currentUserId={currentUserId}
            players={players}
            isHost={isHost}
            phase={wordel.phase}
            wordLength={wordel.wordLength}
            maxAttempts={wordel.maxAttempts}
            guesses={wordel.guesses}
            correctWord={wordel.correctWord}
            finalScores={wordel.finalScores}
            playerStatuses={wordel.playerStatuses}
            submitError={error}
            onSubmitGuess={submitWordelGuess}
            onPlayAgain={handlePlayAgain}
          />
        </motion.div>
      )}

      {activeRoom.gameId === 'flagel' && activeRoom.status !== 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <FlagelPlayArea
            currentUserId={currentUserId}
            players={players}
            phase={flagel.phase}
            currentRound={flagel.currentRound}
            totalRounds={flagel.totalRounds}
            flagEmoji={flagel.flagEmoji}
            flagImageUrl={flagel.flagImageUrl}
            maxAttempts={flagel.maxAttempts}
            guesses={flagel.guesses}
            playerStatuses={flagel.playerStatuses}
            scores={flagel.scores}
            finalScores={flagel.finalScores}
            correctCountry={flagel.correctCountry}
            countryCode={flagel.countryCode}
            isSolo={isSolo}
            isHost={isHost}
            onSubmitGuess={submitFlagelGuess}
            onSkip={skipFlagelRound}
            onPlayAgain={handlePlayAgain}
          />
        </motion.div>
      )}

      {activeRoom.gameId === 'trivia' && activeRoom.status !== 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <TriviaPlayArea
            currentUserId={currentUserId}
            players={players}
            phase={trivia.phase}
            currentRound={trivia.currentRound}
            totalRounds={trivia.totalRounds}
            timeRemaining={trivia.timeRemaining}
            question={trivia.question}
            answeredPlayers={trivia.answeredPlayers}
            selectedAnswerId={trivia.selectedAnswerId}
            answerFeedback={trivia.answerFeedback}
            roundResults={trivia.roundResults}
            scores={trivia.scores}
            finalScores={trivia.finalScores}
            roundHistory={trivia.roundHistory}
            onSubmitAnswer={submitTriviaAnswer}
          />
        </motion.div>
      )}

      {activeRoom.gameId === 'skribble' && activeRoom.status !== 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <SkribblePlayArea
            currentUserId={currentUserId}
            players={players}
            phase={skribble.phase}
            currentRound={skribble.currentRound}
            totalRounds={skribble.totalRounds}
            drawerId={skribble.drawerId}
            isDrawer={skribble.isDrawer}
            word={skribble.word}
            wordChoices={skribble.wordChoices}
            wordHint={skribble.wordHint}
            wordLength={skribble.wordLength}
            strokes={skribble.strokes}
            correctGuessers={skribble.correctGuessers}
            roundEndsAt={skribble.roundEndsAt}
            choosingEndsAt={skribble.choosingEndsAt}
            scores={skribble.scores}
            guessResult={skribble.guessResult}
            messages={skribble.messages}
            correctGuessNotification={skribble.correctGuessNotification}
            roundEndWord={skribble.roundEndWord}
            onSendStrokes={sendSkribbleStrokes}
            onClearCanvas={clearSkribbleCanvas}
            onChooseWord={chooseSkribbleWord}
            onSubmitGuess={submitSkribbleGuess}
          />
        </motion.div>
      )}
    </>
  )

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  SOLO MODE UI
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  if (isSolo) {
    return (
      <AppLayout variant="marketing" showFooter={false}>
        <div className="marketing-rail-layout overflow-hidden bg-[var(--background)]">
          <section className="marketing-rail-section">
            <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                {/* Solo mode badge + connection */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                    <IconUser size={13} />
                    Solo Mode
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
                    isConnected
                      ? 'bg-[var(--success-500)]/10 text-[var(--success-500)]'
                      : 'bg-[var(--warning-500)]/10 text-[var(--warning-500)]'
                  }`}>
                    {isConnected ? (
                      <><LiveIndicator /><span>Live</span></>
                    ) : (
                      <><IconWifiOff /><span>Reconnecting</span></>
                    )}
                  </span>
                </div>

                {/* Game info */}
                <div className="flex items-center gap-5">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: game ? `${game.colorHex}10` : 'var(--surface-hover)' }}
                  >
                    <GameIcon gameId={activeRoom.gameId} size={36} animated />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                      {sharedGame.name}
                    </h1>
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                      {sharedGame.description}
                    </p>
                  </div>
                </div>

                {/* Feature tags */}
                {game && (
                  <div className="flex flex-wrap gap-2">
                    {game.features.map((feat) => (
                      <span
                        key={feat}
                        className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Solo info banner */}
                {activeRoom.status === 'waiting' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--marketing-accent)]/15 bg-[var(--marketing-accent)]/5 px-5 py-4"
                  >
                    <IconZap size={18} className="text-[var(--marketing-accent)]" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      Ready to play! Hit the button below to jump right into the game.
                    </p>
                  </motion.div>
                )}

                {/* Divider */}
                <div className="h-px bg-[var(--border)]" />

                {/* Actions */}
                <div className="space-y-3">
                  {isHost && activeRoom.status !== 'playing' && (
                    <motion.button
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handlePlayAgain}
                      className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--text-primary)] px-6 py-4 text-sm font-semibold text-[var(--text-inverse)] transition-all hover:shadow-lg cursor-pointer"
                    >
                      <IconPlay size={18} />
                      {activeRoom.status === 'finished' ? 'Play Again' : 'Start Playing'}
                    </motion.button>
                  )}
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={leave}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      <IconArrowLeft size={15} />
                      Back to Lobby
                    </motion.button>
                    <Link href="/" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]">
                      <IconHome size={15} />
                      Home
                    </Link>
                  </div>
                </div>
              </motion.div>

              {gamePlayArea}

              <AnimatePresence>
                {notification && (
                  <Toast
                    message={notification.message}
                    type={notification.type}
                    onClose={dismissNotification}
                  />
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </AppLayout>
    )
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  MULTIPLAYER UI
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <AppLayout variant="marketing" showFooter={false}>
      <div className="marketing-rail-layout overflow-hidden bg-[var(--background)]">
        <section className="marketing-rail-section">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">

            {/* â”€â”€ Room Header â”€â”€ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                {/* Left: Game info */}
                <div className="max-w-2xl">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)]"
                      style={{ backgroundColor: game ? `${game.colorHex}10` : 'var(--surface-hover)' }}
                    >
                      <GameIcon gameId={activeRoom.gameId} size={30} animated />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--marketing-accent)]">
                        Private Room
                      </p>
                      <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                        {sharedGame.name}
                      </h1>
                    </div>
                  </div>
                  <p className="mt-4 max-w-xl text-sm text-[var(--text-secondary)] leading-relaxed">
                    {sharedGame.description}
                  </p>
                </div>

                {/* Right: Action buttons */}
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => void handleCopyInvite()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] transition-transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    {copyLabel === 'copied' ? (
                      <><IconCheck size={14} /> Copied!</>
                    ) : (
                      <><IconShare size={14} /> Invite friends</>
                    )}
                  </motion.button>
                  <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]">
                    <IconHome size={14} /> Home
                  </Link>
                </div>
              </div>

              {/* Status badges row */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {/* Room code */}
                <button
                  onClick={() => void handleCopyInvite()}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-mono text-base font-bold tracking-[0.12em] text-[var(--text-primary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  {roomCode}
                  <span className="text-[var(--text-tertiary)]">
                    {copyLabel === 'copied' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </span>
                </button>

                {/* Status pill */}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                  activeRoom.status === 'playing'
                    ? 'bg-[var(--success-500)]/10 text-[var(--success-500)]'
                    : activeRoom.status === 'finished'
                    ? 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)]'
                    : 'bg-[var(--marketing-accent)]/10 text-[var(--marketing-accent)]'
                }`}>
                  {activeRoom.status === 'waiting' && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--marketing-accent)] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--marketing-accent)]" /></span>}
                  {activeRoom.status === 'waiting' ? 'Waiting' : activeRoom.status === 'playing' ? 'In Game' : 'Finished'}
                </span>

                {/* Players count */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                  <IconUsers size={12} />
                  {connectedPlayers}/{activeRoom.maxPlayers}
                </span>

                {/* Connection indicator */}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  isConnected
                    ? 'bg-[var(--success-500)]/10 text-[var(--success-500)]'
                    : 'bg-[var(--warning-500)]/10 text-[var(--warning-500)]'
                }`}>
                  {isConnected ? <><LiveIndicator /><span>Live</span></> : <><IconWifiOff /><span>Reconnecting</span></>}
                </span>
              </div>
            </motion.div>

            {gamePlayArea}

            {/* Divider */}
            <div className="mt-10 h-px bg-[var(--border)]" />

            {/* â”€â”€ Player list + Room controls â”€â”€ */}
            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">

              {/* Players section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">Players</h2>
                  <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    {isJoining ? 'Joining room\u2026' : `${connectedPlayers} connected`}
                  </span>
                </div>

                <AnimatePresence mode="popLayout">
                  <div className="space-y-2">
                    {players.map((player, i) => (
                      <motion.div
                        key={player.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i * 0.05 }}
                        className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-4 backdrop-blur-sm transition-colors hover:bg-[var(--surface)]/70"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{
                              backgroundColor: game?.colorHex ?? 'var(--primary-500)',
                              opacity: player.isConnected ? 1 : 0.5,
                            }}
                          >
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {player.name}
                              </span>
                              {player.id === currentUserId && (
                                <span className="rounded-md bg-[var(--primary-500)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--primary-400)]">
                                  You
                                </span>
                              )}
                              {player.isHost && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--marketing-accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--marketing-accent)]">
                                  <IconCrown size={9} />
                                  Host
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                              <span>Score: {player.score}</span>
                              {!player.isConnected && (
                                <span className="flex items-center gap-1 text-[var(--warning-500)]">
                                  <IconWifiOff />
                                  Reconnecting
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isHost && player.id !== currentUserId && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => kickPlayer(player.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--error-500)]/20 bg-[var(--error-500)]/5 px-3 py-1.5 text-xs font-medium text-[var(--error-500)] transition-colors hover:bg-[var(--error-500)]/10 cursor-pointer"
                          >
                            <IconUserX size={13} />
                            Kick
                          </motion.button>
                        )}
                      </motion.div>
                    ))}

                    {/* Empty slots */}
                    {Array.from({ length: Math.max(0, activeRoom.maxPlayers - players.length) }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] p-4 opacity-40"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)]">
                          <IconUser size={16} />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">{'Waiting for player\u2026'}</span>
                      </div>
                    ))}
                  </div>
                </AnimatePresence>
              </motion.section>

              {/* Room controls sidebar */}
              <motion.aside
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="h-fit"
              >
                <div className="sticky top-24 space-y-5">
                  {/* Controls card */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 backdrop-blur-sm">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-3">
                      Room Controls
                    </h2>
                    <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {isHost
                        ? 'You are the host. Start the game when everyone is ready.'
                        : 'The host controls when the game starts. Hang tight!'}
                    </p>

                    <div className="space-y-3">
                      {isHost && activeRoom.status !== 'playing' && (
                        <motion.button
                          whileHover={{ scale: 1.01, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={handlePlayAgain}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--text-primary)] px-6 py-3.5 text-sm font-semibold text-[var(--text-inverse)] transition-all hover:shadow-lg cursor-pointer"
                        >
                          <IconPlay size={18} />
                          {activeRoom.status === 'finished' ? 'Play Again' : 'Start Game'}
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={leave}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
                      >
                        <IconLogOut size={16} />
                        Leave Room
                      </motion.button>
                    </div>
                  </div>

                  {/* Game features */}
                  {game && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 backdrop-blur-sm">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-3">
                        Game Features
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {game.features.map((feat) => (
                          <span
                            key={feat}
                            className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-4 text-center backdrop-blur-sm">
                      <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
                        {connectedPlayers}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                        Players
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-4 text-center backdrop-blur-sm">
                      <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
                        {activeRoom.maxPlayers}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                        Max
                      </p>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </div>

            <AnimatePresence>
              {notification && (
                <Toast
                  message={notification.message}
                  type={notification.type}
                  onClose={dismissNotification}
                />
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
