'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CHAT_EVENTS,
  CONNECTION_EVENTS,
  FLAGEL_EVENTS,
  ROOM_EVENTS,
  SKRIBBLE_EVENTS,
  TRIVIA_EVENTS,
  WORDEL_EVENTS,
  type ChatMessage,
  type DrawCanvasClearedPayload,
  type DrawCorrectGuessPayload,
  type DrawGameEndedPayload,
  type DrawRoundEndedPayload,
  type DrawStrokeBroadcastPayload,
  type DrawSyncPayload,
  type DrawTurnStartedPayload,
  type DrawWordChoicesPayload,
  type DrawWordChoosingStartedPayload,
  type DrawWordHintPayload,
  type FlagelGameEnded,
  type FlagelGuessResult,
  type FlagelOpponentProgressPayload,
  type FlagelRoundEnded,
  type FlagelRoundStarted,
  type FlagelSyncPayload,
  type Room,
  type RoomError,
  type RoomGameStartedPayload,
  type RoomHostChangedPayload,
  type RoomPlayerKickedPayload,
  type RoomPresence,
  type SkribbleGuessResult,
  type SkribbleRoundStarted,
  type Stroke,
  type TriviaAnswerResultPayload,
  type TriviaGameEnded,
  type TriviaQuestion,
  type TriviaPlayerAnsweredPayload,
  type TriviaRoundEnded,
  type TriviaRoundStarted,
  type TriviaSyncPayload,
  type TriviaTimerTickPayload,
  type WordelGameEnded,
  type WordelGuessResult,
  type WordelOpponentProgressPayload,
  type WordelRoundEnded,
  type WordelRoundStarted,
  type WordelSyncPayload,
} from '@arcado/shared'

import { createSocket, type AppSocket } from '@/lib/socket'

type UseRoomOptions = {
  roomCode: string
  currentUserId: string
  initialRoom: Room
}

type RoomNotification = {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

type WordelUiState = {
  phase: 'waiting' | 'playing' | 'roundEnd' | 'gameEnd'
  currentRound: number
  totalRounds: number
  wordLength: number
  maxAttempts: number
  guesses: WordelGuessResult[]
  playerStatuses: Record<
    string,
    {
      attemptCount: number
      solved: boolean
      finished: boolean
      score: number
    }
  >
  scores: Record<string, number>
  finalScores: WordelGameEnded['finalScores']
  correctWord?: string
}

export type TriviaRoundHistoryEntry = {
  roundNumber: number
  question: TriviaRoundStarted['question']
  selectedAnswerId: string | null
  correctAnswerId: string
  isCorrect: boolean
  pointsEarned: number
  explanation?: string
  category?: string
  difficulty?: string
}

type TriviaUiState = {
  phase: 'waiting' | 'playing' | 'roundEnd' | 'gameEnd'
  currentRound: number
  totalRounds: number
  timeRemaining: number
  nextRoundStartsAt: string | null
  question: TriviaRoundStarted['question'] | null
  answeredPlayers: string[]
  selectedAnswerId: string | null
  answerFeedback: TriviaAnswerResultPayload | null
  roundResults: TriviaRoundEnded | null
  scores: Record<string, number>
  finalScores: TriviaGameEnded['finalScores']
  roundHistory: TriviaRoundHistoryEntry[]
}

const TRIVIA_REVEAL_SECONDS = 5

type FlagelUiState = {
  phase: 'waiting' | 'playing' | 'roundEnd' | 'gameEnd'
  currentRound: number
  totalRounds: number
  flagEmoji?: string
  flagImageUrl?: string
  maxAttempts: number
  hintsAvailable: number
  guesses: FlagelGuessResult[]
  playerStatuses: Record<
    string,
    {
      attemptCount: number
      solved: boolean
      finished: boolean
      score: number
    }
  >
  scores: Record<string, number>
  finalScores: FlagelGameEnded['finalScores']
  correctCountry?: string
  countryCode?: string
}

type SkribbleUiState = {
  phase: 'waiting' | 'choosing' | 'playing' | 'roundEnd' | 'gameEnd'
  currentRound: number
  totalRounds: number
  drawerId: string | null
  isDrawer: boolean
  word: string | null
  wordChoices: string[]
  wordHint: string | null
  wordLength: number
  strokes: Stroke[]
  correctGuessers: string[]
  roundEndsAt: string | null
  choosingEndsAt: string | null
  scores: Record<string, number>
  guessResult: SkribbleGuessResult | null
  messages: ChatMessage[]
  correctGuessNotification: DrawCorrectGuessPayload | null
  roundEndWord: string | null
}

function createRoundPlayerStatuses(playerIds: string[], scores: Record<string, number>) {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      {
        attemptCount: 0,
        solved: false,
        finished: false,
        score: scores[playerId] ?? 0,
      },
    ])
  )
}

export function useRoom({ roomCode, currentUserId, initialRoom }: UseRoomOptions) {
  const socketRef = useRef<AppSocket | null>(null)
  const notificationIdRef = useRef(0)

  const [room, setRoom] = useState<Room | null>(initialRoom)
  const [isConnected, setIsConnected] = useState(false)
  const [isJoining, setIsJoining] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<RoomNotification | null>(null)
  const [hasLeft, setHasLeft] = useState(false)
  const [wasKicked, setWasKicked] = useState(false)
  const [wordel, setWordel] = useState<WordelUiState>({
    phase: initialRoom.status === 'playing' ? 'playing' : 'waiting',
    currentRound: 0,
    totalRounds: 1,
    wordLength: 5,
    maxAttempts: 6,
    guesses: [],
    playerStatuses: Object.fromEntries(
      initialRoom.players.map((player) => [
        player.id,
        {
          attemptCount: 0,
          solved: false,
          finished: false,
          score: player.score,
        },
      ])
    ),
    scores: Object.fromEntries(initialRoom.players.map((player) => [player.id, player.score])),
    finalScores: [],
  })
  const [trivia, setTrivia] = useState<TriviaUiState>({
    phase: initialRoom.status === 'playing' ? 'playing' : 'waiting',
    currentRound: 0,
    totalRounds: initialRoom.settings?.rounds ?? 10,
    timeRemaining: 0,
    nextRoundStartsAt: null,
    question: null,
    answeredPlayers: [],
    selectedAnswerId: null,
    answerFeedback: null,
    roundResults: null,
    scores: Object.fromEntries(initialRoom.players.map((player) => [player.id, player.score])),
    finalScores: [],
    roundHistory: [],
  })
  const [flagel, setFlagel] = useState<FlagelUiState>({
    phase: initialRoom.status === 'playing' ? 'playing' : 'waiting',
    currentRound: 0,
    totalRounds: 1,
    flagEmoji: undefined,
    flagImageUrl: undefined,
    maxAttempts: 6,
    hintsAvailable: 5,
    guesses: [],
    playerStatuses: Object.fromEntries(
      initialRoom.players.map((player) => [
        player.id,
        {
          attemptCount: 0,
          solved: false,
          finished: false,
          score: player.score,
        },
      ])
    ),
    scores: Object.fromEntries(initialRoom.players.map((player) => [player.id, player.score])),
    finalScores: [],
  })
  const [skribble, setSkribble] = useState<SkribbleUiState>({
    phase: initialRoom.status === 'playing' ? 'playing' : 'waiting',
    currentRound: 0,
    totalRounds: 1,
    drawerId: null,
    isDrawer: false,
    word: null,
    wordChoices: [],
    wordHint: null,
    wordLength: 0,
    strokes: [],
    correctGuessers: [],
    roundEndsAt: null,
    choosingEndsAt: null,
    scores: Object.fromEntries(initialRoom.players.map((player) => [player.id, player.score])),
    guessResult: null,
    messages: [],
    correctGuessNotification: null,
    roundEndWord: null,
  })

  const showNotification = useCallback(
    (message: string, type: RoomNotification['type'] = 'error') => {
      notificationIdRef.current += 1
      setNotification({
        id: notificationIdRef.current,
        message,
        type,
      })
    },
    []
  )

  const dismissNotification = useCallback(() => {
    setNotification(null)
  }, [])

  const createEmptyPlayerStatuses = useCallback(
    (playerIds: string[]) =>
      Object.fromEntries(
        playerIds.map((playerId) => [
          playerId,
          {
            attemptCount: 0,
            solved: false,
            finished: false,
            score: 0,
          },
        ])
      ),
    []
  )

  const createEmptyScores = useCallback(
    (playerIds: string[]) => Object.fromEntries(playerIds.map((playerId) => [playerId, 0])),
    []
  )

  useEffect(() => {
    const socket = createSocket()
    socketRef.current = socket

    const handleConnect = () => {
      setIsConnected(true)
      setIsJoining(true)
      setError(null)
      socket.emit(ROOM_EVENTS.JOIN, { roomCode })
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleJoined = ({ room: joinedRoom }: { room: Room; playerId: string }) => {
      setRoom(joinedRoom)
      setIsJoining(false)
      setError(null)
      setHasLeft(false)
      setWasKicked(false)
    }

    const handlePresence = (presence: RoomPresence) => {
      setRoom((previousRoom) =>
        previousRoom
          ? {
              ...previousRoom,
              hostId: presence.hostId,
              status: presence.status,
              players: presence.players,
            }
          : null
      )
    }

    const handleLeft = () => {
      setHasLeft(true)
      setRoom(null)
      setIsJoining(false)
    }

    const handleError = (payload: RoomError) => {
      console.debug('[arcado][room:error]', {
        roomCode,
        userId: currentUserId,
        payload,
      })
      setError(payload.message)
      showNotification(payload.message, 'error')
      setIsJoining(false)
    }

    const handleGameStarted = (payload: RoomGameStartedPayload) => {
      console.debug('[arcado][room:gameStarted]', {
        roomCode,
        userId: currentUserId,
        payload,
      })
      setError(null)
      setRoom((previousRoom) =>
        previousRoom
          ? {
              ...previousRoom,
              gameId: payload.gameId,
              status: 'playing',
            }
          : null
      )

      if (payload.gameId === 'wordel') {
        setWordel((previousState) => ({
          ...previousState,
          phase: 'playing',
          guesses: [],
          finalScores: [],
          correctWord: undefined,
          playerStatuses: createEmptyPlayerStatuses(Object.keys(previousState.playerStatuses)),
          scores: createEmptyScores(Object.keys(previousState.playerStatuses)),
        }))
      } else if (payload.gameId === 'trivia') {
        setTrivia((previousState) => ({
          ...previousState,
          phase: 'playing',
          timeRemaining: 0,
          nextRoundStartsAt: null,
          question: null,
          answeredPlayers: [],
          selectedAnswerId: null,
          answerFeedback: null,
          roundResults: null,
          finalScores: [],
          scores: createEmptyScores(Object.keys(previousState.scores)),
          roundHistory: [],
        }))
      } else if (payload.gameId === 'flagel') {
        setFlagel((previousState) => ({
          ...previousState,
          phase: 'playing',
          guesses: [],
          finalScores: [],
          correctCountry: undefined,
          countryCode: undefined,
          flagEmoji: undefined,
          flagImageUrl: undefined,
          playerStatuses: createEmptyPlayerStatuses(Object.keys(previousState.playerStatuses)),
          scores: createEmptyScores(Object.keys(previousState.playerStatuses)),
        }))
      } else if (payload.gameId === 'skribble') {
        setSkribble((previousState) => ({
          ...previousState,
          phase: 'playing',
          strokes: [],
          correctGuessers: [],
          guessResult: null,
          word: null,
          wordChoices: [],
          wordHint: null,
          messages: [],
          correctGuessNotification: null,
          roundEndWord: null,
        }))
      }
    }

    const handleHostChanged = (payload: RoomHostChangedPayload) => {
      setRoom((previousRoom) =>
        previousRoom
          ? {
              ...previousRoom,
              hostId: payload.newHostId,
              players: previousRoom.players.map((player) => ({
                ...player,
                isHost: player.id === payload.newHostId,
              })),
            }
          : null
      )
    }

    const handleKicked = (payload: RoomPlayerKickedPayload) => {
      if (payload.playerId !== currentUserId) {
        setRoom((previousRoom) =>
          previousRoom
            ? {
                ...previousRoom,
                players: previousRoom.players.filter((player) => player.id !== payload.playerId),
              }
            : null
        )
        return
      }

      setWasKicked(true)
      setHasLeft(true)
      setRoom(null)
      setError('You were removed from the room.')
      showNotification('You were removed from the room.', 'error')
    }

    const handleWordelRoundStarted = (payload: WordelRoundStarted) => {
      console.debug('[arcado][wordel:roundStarted]', {
        roomCode,
        userId: currentUserId,
        payload,
      })
      setError(null)
      setWordel((previousState) => ({
        ...previousState,
        phase: 'playing',
        currentRound: payload.roundNumber,
        totalRounds: payload.totalRounds,
        wordLength: payload.wordLength ?? 5,
        maxAttempts: payload.maxAttempts ?? 6,
        guesses: [],
        playerStatuses: createRoundPlayerStatuses(
          Object.keys(previousState.playerStatuses),
          previousState.scores
        ),
        correctWord: payload.correctWord,
        finalScores: [],
      }))
    }

    const handleWordelGuessResult = (payload: WordelGuessResult) => {
      setError(null)
      setWordel((previousState) => {
        const nextStatuses = {
          ...previousState.playerStatuses,
          [currentUserId]: {
            attemptCount: payload.attemptsUsed,
            solved: payload.isCorrect,
            finished: payload.isCorrect || payload.attemptsUsed >= previousState.maxAttempts,
            score:
              payload.isCorrect
                ? Math.max(1, previousState.maxAttempts - payload.attemptsUsed + 1)
                : previousState.playerStatuses[currentUserId]?.score ?? 0,
          },
        }

        const nextScores = {
          ...previousState.scores,
          [currentUserId]: nextStatuses[currentUserId].score,
        }

        return {
          ...previousState,
          guesses: [...previousState.guesses, payload],
          playerStatuses: nextStatuses,
          scores: nextScores,
        }
      })
    }

    const handleWordelOpponentProgress = (payload: WordelOpponentProgressPayload) => {
      setWordel((previousState) => ({
        ...previousState,
        playerStatuses: {
          ...previousState.playerStatuses,
          [payload.playerId]: {
            attemptCount: payload.attemptCount,
            solved: payload.solved,
            finished:
              payload.solved || payload.attemptCount >= previousState.maxAttempts,
            score: previousState.scores[payload.playerId] ?? 0,
          },
        },
      }))
    }

    const handleWordelRoundEnded = (payload: WordelRoundEnded) => {
      setWordel((previousState) => {
        const nextStatuses = { ...previousState.playerStatuses }
        const nextScores = { ...previousState.scores }

        for (const result of payload.playerResults) {
          nextStatuses[result.playerId] = {
            attemptCount: result.attempts,
            solved: result.solved,
            finished: true,
            score: result.pointsEarned,
          }
          nextScores[result.playerId] = result.pointsEarned
        }

        return {
          ...previousState,
          phase: 'roundEnd',
          correctWord: payload.correctWord,
          playerStatuses: nextStatuses,
          scores: nextScores,
        }
      })
    }

    const handleWordelGameEnded = (payload: WordelGameEnded) => {
      setWordel((previousState) => ({
        ...previousState,
        phase: 'gameEnd',
        finalScores: payload.finalScores,
      }))
      setRoom((previousRoom) =>
        previousRoom
          ? {
              ...previousRoom,
              status: 'finished',
            }
          : null
      )
    }

    const handleWordelSync = (payload: WordelSyncPayload) => {
      console.debug('[arcado][wordel:sync]', {
        roomCode,
        userId: currentUserId,
        payload,
      })
      setError(null)
      setWordel({
        phase: payload.phase,
        currentRound: payload.currentRound,
        totalRounds: payload.totalRounds,
        wordLength: payload.wordLength,
        maxAttempts: payload.maxAttempts,
        guesses: payload.guesses,
        playerStatuses: Object.fromEntries(
          payload.playerStatuses.map((status) => [
            status.playerId,
            {
              attemptCount: status.attemptCount,
              solved: status.solved,
              finished: status.finished,
              score: status.score,
            },
          ])
        ),
        scores: payload.scores,
        finalScores: payload.finalScores ?? [],
        correctWord: payload.correctWord,
      })
    }

    const handleTriviaRoundStarted = (payload: TriviaRoundStarted) => {
      setTrivia((previousState) => ({
        ...previousState,
        phase: 'playing',
        currentRound: payload.roundNumber,
        totalRounds: payload.totalRounds,
        timeRemaining: payload.timeLimit,
        nextRoundStartsAt: null,
        question: payload.question,
        answeredPlayers: [],
        selectedAnswerId: null,
        answerFeedback: null,
        roundResults: null,
      }))
    }

    const handleTriviaTimerTick = (payload: TriviaTimerTickPayload) => {
      setTrivia((previousState) => ({
        ...previousState,
        timeRemaining:
          previousState.phase === 'roundEnd' && previousState.nextRoundStartsAt
            ? getRemainingSeconds(previousState.nextRoundStartsAt)
            : payload.remainingSeconds,
      }))
    }

    const handleTriviaAnswerResult = (payload: TriviaAnswerResultPayload) => {
      setTrivia((previousState) => ({
        ...previousState,
        answerFeedback: payload,
      }))
    }

    const handleTriviaPlayerAnswered = (payload: TriviaPlayerAnsweredPayload) => {
      setTrivia((previousState) => ({
        ...previousState,
        answeredPlayers: previousState.answeredPlayers.includes(payload.playerId)
          ? previousState.answeredPlayers
          : [...previousState.answeredPlayers, payload.playerId],
      }))
    }

    const handleTriviaRoundEnded = (payload: TriviaRoundEnded) => {
      const nextRoundStartsAt = resolveTriviaRevealDeadline(payload.nextRoundStartsAt)

      setTrivia((previousState) => {
        const currentPlayerResult = payload.playerResults.find(
          (result) => result.playerId === currentUserId
        )

        const historyEntry: TriviaRoundHistoryEntry | null =
          previousState.question
            ? {
                roundNumber: previousState.currentRound,
                question: previousState.question,
                selectedAnswerId: previousState.selectedAnswerId,
                correctAnswerId: payload.correctAnswerId,
                isCorrect: currentPlayerResult?.isCorrect ?? false,
                pointsEarned: currentPlayerResult?.pointsEarned ?? 0,
                explanation: payload.explanation,
                category: previousState.question.category,
                difficulty: previousState.question.difficulty,
              }
            : null

        return {
          ...previousState,
          phase: 'roundEnd',
          timeRemaining: getRemainingSeconds(nextRoundStartsAt),
          nextRoundStartsAt,
          answeredPlayers: payload.playerResults
            .filter((result) => result.answerId !== null)
            .map((result) => result.playerId),
          roundResults: {
            ...payload,
            nextRoundStartsAt: nextRoundStartsAt ?? undefined,
          },
          scores: Object.fromEntries(
            payload.playerResults.map((result) => [result.playerId, result.totalScore])
          ),
          roundHistory: historyEntry
            ? [...previousState.roundHistory, historyEntry]
            : previousState.roundHistory,
        }
      })
    }

    const handleTriviaGameEnded = (payload: TriviaGameEnded) => {
      setTrivia((previousState) => ({
        ...previousState,
        phase: 'gameEnd',
        nextRoundStartsAt: null,
        finalScores: payload.finalScores,
      }))
      setRoom((previousRoom) =>
        previousRoom
          ? {
              ...previousRoom,
              status: 'finished',
            }
          : null
      )
    }

    const handleTriviaSync = (payload: TriviaSyncPayload) => {
      const nextRoundStartsAt =
        payload.phase === 'roundEnd'
          ? resolveTriviaRevealDeadline(payload.nextRoundStartsAt)
          : null

      setTrivia((previousState) => ({
        ...previousState,
        phase: payload.phase,
        currentRound: payload.currentRound,
        totalRounds: payload.totalRounds,
        timeRemaining:
          payload.phase === 'roundEnd'
            ? getRemainingSeconds(nextRoundStartsAt ?? undefined)
            : payload.timeRemaining,
        nextRoundStartsAt,
        question: payload.question
          ? {
              id: payload.question.id,
              question: payload.question.question,
              answers: payload.question.answers,
              category: payload.question.category,
              difficulty: payload.question.difficulty,
              explanation: payload.question.explanation,
              tags: payload.question.tags,
            }
          : null,
        answeredPlayers: payload.playerProgress
          .filter((entry) => entry.hasAnswered)
          .map((entry) => entry.playerId),
        selectedAnswerId: null,
        answerFeedback: null,
        roundResults:
          payload.question?.correctAnswerId
            ? {
                correctAnswerId: payload.question.correctAnswerId,
                explanation: payload.question.explanation,
                nextRoundStartsAt: nextRoundStartsAt ?? undefined,
                playerResults: [],
              }
            : null,
        scores: payload.scores,
        finalScores: payload.finalScores ?? [],
      }))
    }

    const handleFlagelRoundStarted = (payload: FlagelRoundStarted) => {
      console.debug('[arcado][flagel:roundStarted]', {
        roomCode,
        userId: currentUserId,
        payload,
      })
      setFlagel((previousState) => ({
        ...previousState,
        phase: 'playing',
        currentRound: payload.roundNumber,
        totalRounds: payload.totalRounds,
        flagEmoji: payload.flagEmoji,
        flagImageUrl: payload.flagImageUrl,
        maxAttempts: payload.maxAttempts ?? 6,
        hintsAvailable: payload.hintsAvailable,
        guesses: [],
        playerStatuses: createRoundPlayerStatuses(
          Object.keys(previousState.playerStatuses),
          previousState.scores
        ),
        finalScores: [],
        correctCountry: undefined,
        countryCode: undefined,
      }))
    }

    const handleFlagelGuessResult = (payload: FlagelGuessResult) => {
      setFlagel((previousState) => ({
        ...previousState,
        guesses: [...previousState.guesses, payload],
        playerStatuses: {
          ...previousState.playerStatuses,
          [currentUserId]: {
            attemptCount: payload.attemptsUsed,
            solved: payload.isCorrect,
            finished: payload.isCorrect || payload.attemptsUsed >= previousState.maxAttempts,
            score: previousState.scores[currentUserId] ?? 0,
          },
        },
      }))
    }

    const handleFlagelOpponentProgress = (payload: FlagelOpponentProgressPayload) => {
      setFlagel((previousState) => ({
        ...previousState,
        playerStatuses: {
          ...previousState.playerStatuses,
          [payload.playerId]: {
            attemptCount: payload.attemptCount,
            solved: payload.solved,
            finished: payload.finished,
            score: previousState.scores[payload.playerId] ?? 0,
          },
        },
      }))
    }

    const handleFlagelRoundEnded = (payload: FlagelRoundEnded) => {
      setFlagel((previousState) => {
        const nextStatuses = { ...previousState.playerStatuses }
        const nextScores = { ...previousState.scores }

        for (const result of payload.playerResults) {
          nextStatuses[result.playerId] = {
            attemptCount: result.attempts,
            solved: result.solved,
            finished: true,
            score: result.pointsEarned,
          }
          nextScores[result.playerId] = result.pointsEarned
        }

        return {
          ...previousState,
          phase: 'roundEnd',
          correctCountry: payload.correctCountry,
          countryCode: payload.countryCode,
          playerStatuses: nextStatuses,
          scores: nextScores,
        }
      })
    }

    const handleFlagelGameEnded = (payload: FlagelGameEnded) => {
      setFlagel((previousState) => ({
        ...previousState,
        phase: 'gameEnd',
        finalScores: payload.finalScores,
      }))
      setRoom((previousRoom) =>
        previousRoom
          ? {
              ...previousRoom,
              status: 'finished',
            }
          : null
      )
    }

    const handleFlagelSync = (payload: FlagelSyncPayload) => {
      console.debug('[arcado][flagel:sync]', {
        roomCode,
        userId: currentUserId,
        payload,
      })
      setFlagel({
        phase: payload.phase,
        currentRound: payload.currentRound,
        totalRounds: payload.totalRounds,
        flagEmoji: payload.flagEmoji,
        flagImageUrl: payload.flagImageUrl,
        maxAttempts: payload.maxAttempts,
        hintsAvailable: payload.hintsAvailable,
        guesses: payload.guesses,
        playerStatuses: Object.fromEntries(
          payload.playerStatuses.map((status) => [
            status.playerId,
            {
              attemptCount: status.attemptCount,
              solved: status.solved,
              finished: status.finished,
              score: status.score,
            },
          ])
        ),
        scores: payload.scores,
        finalScores: payload.finalScores ?? [],
        correctCountry: payload.correctCountry,
        countryCode: payload.countryCode,
      })
    }

    /* â”€â”€ Skribble event handlers â”€â”€ */

    const handleSkribbleWordChoosingStarted = (payload: DrawWordChoosingStartedPayload) => {
      console.debug('[arcado][skribble:wordChoosingStarted]', { roomCode, userId: currentUserId, payload })
      setSkribble((prev) => ({
        ...prev,
        phase: 'choosing',
        currentRound: payload.roundNumber,
        totalRounds: payload.totalRounds,
        drawerId: payload.drawerId,
        isDrawer: payload.drawerId === currentUserId,
        word: null,
        wordChoices: [],
        wordHint: null,
        wordLength: 0,
        strokes: [],
        correctGuessers: [],
        roundEndsAt: null,
        choosingEndsAt: payload.choosingEndsAt ?? null,
        guessResult: null,
        correctGuessNotification: null,
        roundEndWord: null,
      }))
    }

    const handleSkribbleWordChoices = (payload: DrawWordChoicesPayload) => {
      console.debug('[arcado][skribble:wordChoices]', { roomCode, userId: currentUserId, payload })
      setSkribble((prev) => ({
        ...prev,
        phase: 'choosing',
        currentRound: payload.roundNumber,
        totalRounds: payload.totalRounds,
        drawerId: payload.drawerId,
        isDrawer: payload.drawerId === currentUserId,
        wordChoices: payload.words,
        choosingEndsAt: payload.choosingEndsAt ?? prev.choosingEndsAt,
      }))
    }

    const handleSkribbleRoundStarted = (payload: SkribbleRoundStarted) => {
      console.debug('[arcado][skribble:roundStarted]', { roomCode, userId: currentUserId, payload })
      setSkribble((prev) => ({
        ...prev,
        phase: 'playing',
        currentRound: payload.roundNumber,
        totalRounds: payload.totalRounds,
        drawerId: payload.drawerId,
        isDrawer: payload.drawerId === currentUserId,
        word: payload.drawerId === currentUserId ? prev.word : null,
        wordChoices: [],
        wordHint: payload.wordHint ?? null,
        wordLength: payload.wordLength,
        strokes: [],
        correctGuessers: [],
        roundEndsAt: payload.roundEndsAt,
        choosingEndsAt: null,
        guessResult: null,
        correctGuessNotification: null,
        roundEndWord: null,
      }))
    }

    const handleSkribbleTurnStarted = (payload: DrawTurnStartedPayload) => {
      console.debug('[arcado][skribble:turnStarted]', { roomCode, userId: currentUserId, payload })
      setSkribble((prev) => ({
        ...prev,
        phase: 'playing',
        word: payload.word ?? null,
        wordChoices: [],
        wordHint: payload.wordHint ?? prev.wordHint,
        wordLength: payload.wordLength ?? prev.wordLength,
        isDrawer: payload.drawerId === currentUserId,
        drawerId: payload.drawerId,
      }))
    }

    const handleSkribbleStrokeBroadcast = (payload: DrawStrokeBroadcastPayload) => {
      // Don't re-add our own strokes (we already draw locally)
      if (payload.playerId === currentUserId) return
      setSkribble((prev) => ({
        ...prev,
        strokes: [...prev.strokes, ...payload.strokes],
      }))
    }

    const handleSkribbleCanvasCleared = (_payload: DrawCanvasClearedPayload) => {
      setSkribble((prev) => ({
        ...prev,
        strokes: [],
      }))
    }

    const handleSkribbleGuessResult = (payload: SkribbleGuessResult) => {
      setSkribble((prev) => ({
        ...prev,
        guessResult: payload,
      }))
    }

    const handleSkribbleCorrectGuess = (payload: DrawCorrectGuessPayload) => {
      setSkribble((prev) => ({
        ...prev,
        correctGuessers: prev.correctGuessers.includes(payload.playerId)
          ? prev.correctGuessers
          : [...prev.correctGuessers, payload.playerId],
        correctGuessNotification: payload,
      }))
    }

    const handleSkribbleWordHint = (payload: DrawWordHintPayload) => {
      setSkribble((prev) => ({
        ...prev,
        wordHint: payload.hint,
      }))
    }

    const handleSkribbleRoundEnded = (payload: DrawRoundEndedPayload) => {
      setSkribble((prev) => ({
        ...prev,
        phase: 'roundEnd',
        roundEndWord: payload.word,
        roundEndsAt: null,
        choosingEndsAt: null,
        wordChoices: [],
        scores: payload.scores,
      }))
    }

    const handleSkribbleGameEnded = (payload: DrawGameEndedPayload) => {
      setSkribble((prev) => ({
        ...prev,
        phase: 'gameEnd',
        roundEndsAt: null,
        choosingEndsAt: null,
        wordChoices: [],
        scores: Object.fromEntries(payload.finalScores.map((score) => [score.playerId, score.score])),
      }))
      setRoom((previousRoom) =>
        previousRoom
          ? {
              ...previousRoom,
              status: 'finished',
            }
          : null
      )
    }

    const handleSkribbleSync = (payload: DrawSyncPayload) => {
      console.debug('[arcado][skribble:sync]', { roomCode, userId: currentUserId, payload })
      setSkribble((prev) => ({
        ...prev,
        phase: payload.isChoosing ? 'choosing' : prev.phase,
        strokes: payload.strokes,
        drawerId: payload.drawerId,
        isDrawer: payload.drawerId === currentUserId,
        wordHint: payload.wordHint ?? null,
        wordLength: payload.wordLength ?? prev.wordLength,
        correctGuessers: payload.correctGuessers ?? [],
        roundEndsAt: payload.roundEndsAt ?? null,
        choosingEndsAt: payload.choosingEndsAt ?? null,
        word: payload.word ?? null,
        wordChoices: payload.wordChoices ?? [],
      }))
    }

    const handleChatMessage = (payload: ChatMessage) => {
      setSkribble((prev) => ({
        ...prev,
        messages: [...prev.messages, payload],
      }))
    }

    socket.on(CONNECTION_EVENTS.CONNECT, handleConnect)
    socket.on(CONNECTION_EVENTS.DISCONNECT, handleDisconnect)
    socket.on(ROOM_EVENTS.JOINED, handleJoined)
    socket.on(ROOM_EVENTS.PRESENCE, handlePresence)
    socket.on(ROOM_EVENTS.LEFT, handleLeft)
    socket.on(ROOM_EVENTS.ERROR, handleError)
    socket.on(ROOM_EVENTS.GAME_STARTED, handleGameStarted)
    socket.on(ROOM_EVENTS.HOST_CHANGED, handleHostChanged)
    socket.on(ROOM_EVENTS.PLAYER_KICKED, handleKicked)
    socket.on(TRIVIA_EVENTS.ROUND_STARTED, handleTriviaRoundStarted)
    socket.on(TRIVIA_EVENTS.TIMER_TICK, handleTriviaTimerTick)
    socket.on(TRIVIA_EVENTS.ANSWER_RESULT, handleTriviaAnswerResult)
    socket.on(TRIVIA_EVENTS.PLAYER_ANSWERED, handleTriviaPlayerAnswered)
    socket.on(TRIVIA_EVENTS.ROUND_ENDED, handleTriviaRoundEnded)
    socket.on(TRIVIA_EVENTS.GAME_ENDED, handleTriviaGameEnded)
    socket.on(TRIVIA_EVENTS.SYNC, handleTriviaSync)
    socket.on(FLAGEL_EVENTS.ROUND_STARTED, handleFlagelRoundStarted)
    socket.on(FLAGEL_EVENTS.GUESS_RESULT, handleFlagelGuessResult)
    socket.on(FLAGEL_EVENTS.OPPONENT_PROGRESS, handleFlagelOpponentProgress)
    socket.on(FLAGEL_EVENTS.ROUND_ENDED, handleFlagelRoundEnded)
    socket.on(FLAGEL_EVENTS.GAME_ENDED, handleFlagelGameEnded)
    socket.on(FLAGEL_EVENTS.SYNC, handleFlagelSync)
    socket.on(WORDEL_EVENTS.ROUND_STARTED, handleWordelRoundStarted)
    socket.on(WORDEL_EVENTS.GUESS_RESULT, handleWordelGuessResult)
    socket.on(WORDEL_EVENTS.OPPONENT_PROGRESS, handleWordelOpponentProgress)
    socket.on(WORDEL_EVENTS.ROUND_ENDED, handleWordelRoundEnded)
    socket.on(WORDEL_EVENTS.GAME_ENDED, handleWordelGameEnded)
    socket.on(WORDEL_EVENTS.SYNC, handleWordelSync)
    socket.on(SKRIBBLE_EVENTS.WORD_CHOOSING_STARTED, handleSkribbleWordChoosingStarted)
    socket.on(SKRIBBLE_EVENTS.WORD_CHOICES, handleSkribbleWordChoices)
    socket.on(SKRIBBLE_EVENTS.ROUND_STARTED, handleSkribbleRoundStarted)
    socket.on(SKRIBBLE_EVENTS.TURN_STARTED, handleSkribbleTurnStarted)
    socket.on(SKRIBBLE_EVENTS.STROKE_BROADCAST, handleSkribbleStrokeBroadcast)
    socket.on(SKRIBBLE_EVENTS.CANVAS_CLEARED, handleSkribbleCanvasCleared)
    socket.on(SKRIBBLE_EVENTS.GUESS_RESULT, handleSkribbleGuessResult)
    socket.on(SKRIBBLE_EVENTS.CORRECT_GUESS, handleSkribbleCorrectGuess)
    socket.on(SKRIBBLE_EVENTS.WORD_HINT, handleSkribbleWordHint)
    socket.on(SKRIBBLE_EVENTS.ROUND_ENDED, handleSkribbleRoundEnded)
    socket.on(SKRIBBLE_EVENTS.GAME_ENDED, handleSkribbleGameEnded)
    socket.on(SKRIBBLE_EVENTS.SYNC, handleSkribbleSync)
    socket.on(CHAT_EVENTS.MESSAGE, handleChatMessage)

    socket.connect()

    return () => {
      socket.off(CONNECTION_EVENTS.CONNECT, handleConnect)
      socket.off(CONNECTION_EVENTS.DISCONNECT, handleDisconnect)
      socket.off(ROOM_EVENTS.JOINED, handleJoined)
      socket.off(ROOM_EVENTS.PRESENCE, handlePresence)
      socket.off(ROOM_EVENTS.LEFT, handleLeft)
      socket.off(ROOM_EVENTS.ERROR, handleError)
      socket.off(ROOM_EVENTS.GAME_STARTED, handleGameStarted)
      socket.off(ROOM_EVENTS.HOST_CHANGED, handleHostChanged)
      socket.off(ROOM_EVENTS.PLAYER_KICKED, handleKicked)
      socket.off(TRIVIA_EVENTS.ROUND_STARTED, handleTriviaRoundStarted)
      socket.off(TRIVIA_EVENTS.TIMER_TICK, handleTriviaTimerTick)
      socket.off(TRIVIA_EVENTS.ANSWER_RESULT, handleTriviaAnswerResult)
      socket.off(TRIVIA_EVENTS.PLAYER_ANSWERED, handleTriviaPlayerAnswered)
      socket.off(TRIVIA_EVENTS.ROUND_ENDED, handleTriviaRoundEnded)
      socket.off(TRIVIA_EVENTS.GAME_ENDED, handleTriviaGameEnded)
      socket.off(TRIVIA_EVENTS.SYNC, handleTriviaSync)
      socket.off(FLAGEL_EVENTS.ROUND_STARTED, handleFlagelRoundStarted)
      socket.off(FLAGEL_EVENTS.GUESS_RESULT, handleFlagelGuessResult)
      socket.off(FLAGEL_EVENTS.OPPONENT_PROGRESS, handleFlagelOpponentProgress)
      socket.off(FLAGEL_EVENTS.ROUND_ENDED, handleFlagelRoundEnded)
      socket.off(FLAGEL_EVENTS.GAME_ENDED, handleFlagelGameEnded)
      socket.off(FLAGEL_EVENTS.SYNC, handleFlagelSync)
      socket.off(WORDEL_EVENTS.ROUND_STARTED, handleWordelRoundStarted)
      socket.off(WORDEL_EVENTS.GUESS_RESULT, handleWordelGuessResult)
      socket.off(WORDEL_EVENTS.OPPONENT_PROGRESS, handleWordelOpponentProgress)
      socket.off(WORDEL_EVENTS.ROUND_ENDED, handleWordelRoundEnded)
      socket.off(WORDEL_EVENTS.GAME_ENDED, handleWordelGameEnded)
      socket.off(WORDEL_EVENTS.SYNC, handleWordelSync)
      socket.off(SKRIBBLE_EVENTS.WORD_CHOOSING_STARTED, handleSkribbleWordChoosingStarted)
      socket.off(SKRIBBLE_EVENTS.WORD_CHOICES, handleSkribbleWordChoices)
      socket.off(SKRIBBLE_EVENTS.ROUND_STARTED, handleSkribbleRoundStarted)
      socket.off(SKRIBBLE_EVENTS.TURN_STARTED, handleSkribbleTurnStarted)
      socket.off(SKRIBBLE_EVENTS.STROKE_BROADCAST, handleSkribbleStrokeBroadcast)
      socket.off(SKRIBBLE_EVENTS.CANVAS_CLEARED, handleSkribbleCanvasCleared)
      socket.off(SKRIBBLE_EVENTS.GUESS_RESULT, handleSkribbleGuessResult)
      socket.off(SKRIBBLE_EVENTS.CORRECT_GUESS, handleSkribbleCorrectGuess)
      socket.off(SKRIBBLE_EVENTS.WORD_HINT, handleSkribbleWordHint)
      socket.off(SKRIBBLE_EVENTS.ROUND_ENDED, handleSkribbleRoundEnded)
      socket.off(SKRIBBLE_EVENTS.GAME_ENDED, handleSkribbleGameEnded)
      socket.off(SKRIBBLE_EVENTS.SYNC, handleSkribbleSync)
      socket.off(CHAT_EVENTS.MESSAGE, handleChatMessage)
      socket.disconnect()
      socketRef.current = null
    }
  }, [createEmptyPlayerStatuses, createEmptyScores, currentUserId, roomCode, showNotification])

  useEffect(() => {
    if (trivia.phase !== 'roundEnd' || !trivia.nextRoundStartsAt) {
      return
    }

    const updateCountdown = () => {
      setTrivia((previousState) => {
        if (previousState.phase !== 'roundEnd' || !previousState.nextRoundStartsAt) {
          return previousState
        }

        const nextTimeRemaining = getRemainingSeconds(previousState.nextRoundStartsAt)
        if (nextTimeRemaining === previousState.timeRemaining) {
          return previousState
        }

        return {
          ...previousState,
          timeRemaining: nextTimeRemaining,
        }
      })
    }

    updateCountdown()
    const intervalId = window.setInterval(updateCountdown, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [trivia.phase, trivia.nextRoundStartsAt])

  const leave = useCallback(() => {
    const socket = socketRef.current
    if (!socket) {
      return
    }

    socket.emit(ROOM_EVENTS.LEAVE, { roomCode })
  }, [roomCode])

  const startGame = useCallback(() => {
    const socket = socketRef.current
    if (!socket) {
      return
    }

    socket.emit(ROOM_EVENTS.START_GAME, { roomCode })
  }, [roomCode])

  const kickPlayer = useCallback(
    (playerId: string) => {
      const socket = socketRef.current
      if (!socket) {
        return
      }

      socket.emit(ROOM_EVENTS.KICK_PLAYER, {
        roomCode,
        playerId,
      })
    },
    [roomCode]
  )

  const submitWordelGuess = useCallback(
    (guess: string) => {
      const socket = socketRef.current
      if (!socket) {
        return
      }

      setError(null)
      socket.emit(WORDEL_EVENTS.SUBMIT_GUESS, {
        roomCode,
        guess,
      })
    },
    [roomCode]
  )

  const submitTriviaAnswer = useCallback(
    (questionId: string, answerId: TriviaQuestion['answers'][number]['id']) => {
      const socket = socketRef.current
      if (!socket) {
        return
      }

      setTrivia((previousState) => ({
        ...previousState,
        selectedAnswerId: answerId,
      }))

      socket.emit(TRIVIA_EVENTS.SUBMIT_ANSWER, {
        roomCode,
        questionId,
        answerId,
      })
    },
    [roomCode]
  )

  const submitFlagelGuess = useCallback(
    (guess: string) => {
      const socket = socketRef.current
      if (!socket) {
        return
      }

      socket.emit(FLAGEL_EVENTS.SUBMIT_GUESS, {
        roomCode,
        guess,
      })
    },
    [roomCode]
  )

  const skipFlagelRound = useCallback(() => {
    const socket = socketRef.current
    if (!socket) {
      return
    }

    socket.emit(FLAGEL_EVENTS.SKIP, {
      roomCode,
    })
  }, [roomCode])

  /* â”€â”€ Skribble actions â”€â”€ */

  const sendSkribbleStrokes = useCallback(
    (strokes: Stroke[]) => {
      const socket = socketRef.current
      if (!socket) return

      // Add strokes locally for instant feedback
      setSkribble((prev) => ({
        ...prev,
        strokes: [...prev.strokes, ...strokes],
      }))

      socket.emit(SKRIBBLE_EVENTS.STROKE_BATCH, {
        roomCode,
        strokes,
        timestamp: Date.now(),
      })
    },
    [roomCode]
  )

  const clearSkribbleCanvas = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return

    setSkribble((prev) => ({
      ...prev,
      strokes: [],
    }))

    socket.emit(SKRIBBLE_EVENTS.CLEAR_CANVAS, { roomCode })
  }, [roomCode])

  const submitSkribbleGuess = useCallback(
    (guess: string) => {
      const socket = socketRef.current
      if (!socket) return

      socket.emit(SKRIBBLE_EVENTS.GUESS, {
        roomCode,
        guess,
      })
    },
    [roomCode]
  )

  const chooseSkribbleWord = useCallback(
    (word: string) => {
      const socket = socketRef.current
      if (!socket) return

      socket.emit(SKRIBBLE_EVENTS.CHOOSE_WORD, {
        roomCode,
        word,
      })
    },
    [roomCode]
  )

  const requestSkribbleSync = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit(SKRIBBLE_EVENTS.REQUEST_SYNC, { roomCode })
  }, [roomCode])

  return {
    room,
    players: room?.players ?? [],
    isConnected,
    isJoining,
    isHost: room?.hostId === currentUserId,
    error,
    notification,
    hasLeft,
    wasKicked,
    flagel,
    trivia,
    wordel,
    skribble,
    dismissNotification,
    leave,
    startGame,
    kickPlayer,
    submitFlagelGuess,
    skipFlagelRound,
    submitTriviaAnswer,
    submitWordelGuess,
    sendSkribbleStrokes,
    clearSkribbleCanvas,
    submitSkribbleGuess,
    chooseSkribbleWord,
    requestSkribbleSync,
  }
}

function getRemainingSeconds(nextRoundStartsAt?: string) {
  if (!nextRoundStartsAt) {
    return 0
  }

  return Math.max(0, Math.ceil((new Date(nextRoundStartsAt).getTime() - Date.now()) / 1000))
}

function resolveTriviaRevealDeadline(nextRoundStartsAt?: string) {
  if (nextRoundStartsAt) {
    const remainingSeconds = getRemainingSeconds(nextRoundStartsAt)
    if (remainingSeconds > 0) {
      return nextRoundStartsAt
    }
  }

  return new Date(Date.now() + TRIVIA_REVEAL_SECONDS * 1000).toISOString()
}
