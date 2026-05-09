import { z } from 'zod'

// Primitive schemas
export const userIdSchema = z.string().min(1).max(50)
export const roomCodeSchema = z
  .string()
  .trim()
  .length(6)
  .regex(/^[A-Z0-9]+$/, 'Room code must be 6 uppercase letters or digits')
export const gameIdSchema = z.enum(['skribble', 'trivia', 'wordel', 'flagel'])
export const playerNameSchema = z.string().trim().min(1).max(30)
export const isoDateTimeSchema = z.string().datetime()
export const roomStatusSchema = z.enum(['waiting', 'playing', 'finished'])

// Trivia option schemas are declared early because rooms can persist trivia settings.
export const triviaCategories = [
  'Mixed',
  'Movies & TV',
  'Music',
  'Sports',
  'Gaming',
  'Science & Nature',
  'History & Culture',
  'Geography & Travel',
  'Internet & Tech',
  'Food & Lifestyle',
] as const

export const triviaCategorySchema = z.enum(triviaCategories)
export const triviaCategoryListSchema = z
  .array(triviaCategorySchema)
  .min(1)
  .max(triviaCategories.length)
  .refine((categories) => new Set(categories).size === categories.length, {
    message: 'Trivia categories must be unique',
  })
export const triviaDifficultySchema = z.enum(['easy', 'medium', 'hard'])
export const triviaRegionSchema = z.enum(['auto', 'international', 'india'])
export const triviaResolvedRegionSchema = z.enum(['international', 'india'])
export const triviaAnswerIdSchema = z.enum(['a', 'b', 'c', 'd'])

// Shared entities
export const userSchema = z.object({
  id: userIdSchema,
  name: playerNameSchema,
  email: z.string().email(),
  image: z.string().url().optional(),
  role: z.enum(['user', 'admin']).default('user'),
})

export const playerSchema = z.object({
  id: userIdSchema,
  name: playerNameSchema,
  image: z.string().url().optional(),
  isHost: z.boolean().default(false),
  isConnected: z.boolean().default(true),
  score: z.number().int().min(0).default(0),
})

export const gameSettingsSchema = z
  .object({
    rounds: z.number().int().min(1).max(20).optional(),
    triviaCategory: triviaCategorySchema.optional(),
    triviaCategories: triviaCategoryListSchema.optional(),
    triviaDifficulty: triviaDifficultySchema.optional(),
    triviaTimeLimit: z.number().int().min(5).max(60).optional(),
    // Region preference for the room: 'auto' resolves via the creator's
    // inferred country, 'india' forces the Indian pool, 'international'
    // forces the default global pool.
    triviaRegion: triviaRegionSchema.optional(),
    // The region actually used at game time (persisted after auto-resolution
    // so reconnecting players and analytics see the same bucket).
    triviaResolvedRegion: triviaResolvedRegionSchema.optional(),
  })
  .optional()

export const roomSchema = z.object({
  code: roomCodeSchema,
  gameId: gameIdSchema,
  hostId: userIdSchema,
  status: roomStatusSchema,
  players: z.array(playerSchema),
  maxPlayers: z.number().int().min(1).max(10).default(8),
  settings: gameSettingsSchema,
  createdAt: isoDateTimeSchema,
})

// Room event payloads
export const roomJoinPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  playerName: playerNameSchema.optional(),
})

export const roomLeavePayloadSchema = z.object({
  roomCode: roomCodeSchema,
})

export const roomStartGamePayloadSchema = z.object({
  roomCode: roomCodeSchema,
})

export const roomKickPlayerPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  playerId: userIdSchema,
})

export const roomJoinedSchema = z.object({
  room: roomSchema,
  playerId: userIdSchema,
})

export const roomLeftSchema = z.object({
  roomCode: roomCodeSchema,
})

export const roomPresenceSchema = z.object({
  roomCode: roomCodeSchema,
  players: z.array(playerSchema),
  hostId: userIdSchema,
  status: roomStatusSchema,
})

export const roomGameStartedSchema = z.object({
  gameId: gameIdSchema,
})

export const roomPlayerKickedSchema = z.object({
  playerId: userIdSchema,
})

export const roomErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
})

export const roomHostChangedSchema = z.object({
  newHostId: userIdSchema,
})

// Skribble schemas
export const pointSchema = z.object({
  x: z.number().min(0).max(2000),
  y: z.number().min(0).max(2000),
})

export const strokeSchema = z.object({
  points: z.array(pointSchema).min(1).max(1000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  width: z.number().min(1).max(50),
  tool: z.enum(['brush', 'eraser']).default('brush'),
})

export const strokeBatchPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  strokes: z.array(strokeSchema).min(1).max(100),
  timestamp: z.number(),
})

export const clearCanvasPayloadSchema = z.object({
  roomCode: roomCodeSchema,
})

export const guessPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  guess: z.string().trim().min(1).max(100),
})

export const chooseSkribbleWordPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  word: z.string().trim().min(1).max(100),
})

export const requestSyncPayloadSchema = z.object({
  roomCode: roomCodeSchema,
})

export const drawStrokeBroadcastSchema = z.object({
  strokes: z.array(strokeSchema).min(1),
  playerId: userIdSchema,
})

export const drawCanvasClearedSchema = z.object({
  playerId: userIdSchema,
})

export const skribbleRoundStartedSchema = z.object({
  roundNumber: z.number().int().min(1),
  totalRounds: z.number().int().min(1),
  drawerId: userIdSchema,
  wordLength: z.number().int().min(1),
  wordHint: z.string().optional(),
  roundEndsAt: isoDateTimeSchema,
})

export const drawWordChoosingStartedSchema = z.object({
  roundNumber: z.number().int().min(1),
  totalRounds: z.number().int().min(1),
  drawerId: userIdSchema,
})

export const drawWordChoicesSchema = drawWordChoosingStartedSchema.extend({
  words: z.array(z.string().min(1)).min(1).max(5),
})

export const skribbleGuessResultSchema = z.object({
  playerId: userIdSchema,
  isCorrect: z.boolean(),
  isClose: z.boolean().optional(),
  pointsEarned: z.number().int().min(0),
  guess: z.string().optional(),
})

export const drawCorrectGuessSchema = z.object({
  playerId: userIdSchema,
  playerName: playerNameSchema,
  position: z.number().int().min(1).optional(),
})

export const drawSyncSchema = z.object({
  strokes: z.array(strokeSchema),
  drawerId: userIdSchema,
  wordHint: z.string().optional(),
  wordLength: z.number().int().min(1).optional(),
  correctGuessers: z.array(userIdSchema).optional(),
  roundEndsAt: isoDateTimeSchema.optional(),
  word: z.string().optional(),
  isChoosing: z.boolean().optional(),
  wordChoices: z.array(z.string().min(1)).optional(),
})

export const drawRoundEndedSchema = z.object({
  word: z.string().min(1),
  scores: z.record(z.string(), z.number().int()),
})

export const drawGameEndedSchema = z.object({
  finalScores: z.array(
    z.object({
      playerId: userIdSchema,
      score: z.number().int(),
      rank: z.number().int().min(1),
    })
  ),
})

export const drawTurnStartedSchema = z.object({
  drawerId: userIdSchema,
  word: z.string().optional(),
  wordLength: z.number().int().min(1).optional(),
  wordHint: z.string().optional(),
})

export const drawWordHintSchema = z.object({
  hint: z.string(),
})

export const triviaAnswerSchema = z.object({
  id: triviaAnswerIdSchema,
  text: z.string().trim().min(1).max(120),
})

export const triviaQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().trim().min(8).max(240),
  answers: z.array(triviaAnswerSchema).length(4),
  category: triviaCategorySchema.default('Mixed'),
  difficulty: triviaDifficultySchema.default('medium'),
  explanation: z.string().trim().max(180).optional(),
  tags: z.array(z.string().trim().regex(/^[a-z0-9-]+$/).max(40)).max(8).optional(),
})

export const triviaSubmitAnswerPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  questionId: z.string().min(1),
  answerId: triviaAnswerIdSchema,
})

export const triviaRoundStartedSchema = z.object({
  roundNumber: z.number().int().min(1),
  totalRounds: z.number().int().min(1),
  question: triviaQuestionSchema,
  roundEndsAt: isoDateTimeSchema,
  timeLimit: z.number().int().min(1),
})

export const triviaRoundEndedSchema = z.object({
  correctAnswerId: triviaAnswerIdSchema,
  explanation: z.string().trim().max(180).optional(),
  nextRoundStartsAt: isoDateTimeSchema.optional(),
  playerResults: z.array(
    z.object({
      playerId: userIdSchema,
      answerId: triviaAnswerIdSchema.nullable(),
      isCorrect: z.boolean(),
      pointsEarned: z.number().int(),
      totalScore: z.number().int(),
      answerTime: z.number().optional(),
    })
  ),
})

export const triviaAnswerResultSchema = z.object({
  isCorrect: z.boolean(),
  pointsEarned: z.number().int(),
})

export const triviaPlayerAnsweredSchema = z.object({
  playerId: userIdSchema,
})

export const triviaGameEndedSchema = z.object({
  finalScores: z.array(
    z.object({
      playerId: userIdSchema,
      playerName: playerNameSchema,
      score: z.number().int(),
      correctAnswers: z.number().int(),
      rank: z.number().int().min(1),
    })
  ),
})

export const triviaTimerTickSchema = z.object({
  remainingSeconds: z.number().int().min(0),
})

export const triviaPlayerProgressSchema = z.object({
  playerId: userIdSchema,
  hasAnswered: z.boolean(),
  score: z.number().int(),
})

export const triviaSyncSchema = z.object({
  phase: z.enum(['waiting', 'playing', 'roundEnd', 'gameEnd']),
  currentRound: z.number().int().min(0),
  totalRounds: z.number().int().min(1),
  timeRemaining: z.number().int().min(0),
  nextRoundStartsAt: isoDateTimeSchema.optional(),
  question: triviaQuestionSchema
    .extend({
      correctAnswerId: triviaAnswerIdSchema.optional(),
    })
    .nullable(),
  playerProgress: z.array(triviaPlayerProgressSchema),
  scores: z.record(z.string(), z.number().int()),
  finalScores: triviaGameEndedSchema.shape.finalScores.optional(),
})

// Wordel schemas
export const wordelLetterResultSchema = z.enum(['correct', 'present', 'absent'])

export const wordelGuessResultSchema = z.object({
  guess: z.string().trim().toUpperCase().length(5),
  results: z.array(wordelLetterResultSchema).length(5),
  isCorrect: z.boolean(),
  attemptsUsed: z.number().int().min(1).max(6),
})

export const wordelSubmitGuessPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  guess: z.string().trim().length(5).regex(/^[A-Za-z]+$/),
})

export const wordelRoundStartedSchema = z.object({
  roundNumber: z.number().int().min(1),
  totalRounds: z.number().int().min(1),
  wordLength: z.number().int().default(5),
  maxAttempts: z.number().int().default(6),
  correctWord: z.string().min(1).optional(),
  roundEndsAt: isoDateTimeSchema.optional(),
})

export const wordelRoundEndedSchema = z.object({
  correctWord: z.string().min(1),
  playerResults: z.array(
    z.object({
      playerId: userIdSchema,
      solved: z.boolean(),
      attempts: z.number().int(),
      pointsEarned: z.number().int(),
    })
  ),
})

export const wordelGameEndedSchema = z.object({
  finalScores: z.array(
    z.object({
      playerId: userIdSchema,
      score: z.number().int(),
      rank: z.number().int().min(1),
    })
  ),
})

export const wordelOpponentProgressSchema = z.object({
  playerId: userIdSchema,
  attemptCount: z.number().int().min(0),
  solved: z.boolean(),
})

export const wordelPlayerProgressSchema = z.object({
  playerId: userIdSchema,
  attemptCount: z.number().int().min(0).max(6),
  solved: z.boolean(),
  finished: z.boolean(),
  score: z.number().int().min(0),
})

export const wordelSyncSchema = z.object({
  phase: z.enum(['waiting', 'playing', 'roundEnd', 'gameEnd']),
  currentRound: z.number().int().min(0),
  totalRounds: z.number().int().min(1),
  wordLength: z.number().int().min(1),
  maxAttempts: z.number().int().min(1),
  guesses: z.array(wordelGuessResultSchema),
  playerStatuses: z.array(wordelPlayerProgressSchema),
  scores: z.record(z.string(), z.number().int()),
  finalScores: z
    .array(
      z.object({
        playerId: userIdSchema,
        score: z.number().int(),
        rank: z.number().int().min(1),
      })
    )
    .optional(),
  correctWord: z.string().min(1).optional(),
})

// Flagel schemas
export const flagelSubmitGuessPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  guess: z.string().trim().min(1).max(100),
})

export const flagelSkipPayloadSchema = z.object({
  roomCode: roomCodeSchema,
})

export const flagelRoundStartedSchema = z.object({
  roundNumber: z.number().int().min(1),
  totalRounds: z.number().int().min(1),
  flagEmoji: z.string().optional(),
  flagImageUrl: z.string().min(1).optional(),
  maxAttempts: z.number().int().min(1).default(6),
  hintsAvailable: z.number().int().min(0),
  roundEndsAt: isoDateTimeSchema.optional(),
})

export const flagelGuessResultSchema = z.object({
  guess: z.string().trim().min(1),
  isCorrect: z.boolean(),
  distance: z.number().optional(),
  direction: z.string().optional(),
  attemptsUsed: z.number().int(),
  maxAttempts: z.number().int(),
})

export const flagelRoundEndedSchema = z.object({
  correctCountry: z.string().min(1),
  countryCode: z.string().min(2),
  playerResults: z.array(
    z.object({
      playerId: userIdSchema,
      solved: z.boolean(),
      attempts: z.number().int(),
      pointsEarned: z.number().int(),
    })
  ),
})

export const flagelGameEndedSchema = z.object({
  finalScores: z.array(
    z.object({
      playerId: userIdSchema,
      score: z.number().int(),
      rank: z.number().int().min(1),
    })
  ),
})

export const flagelOpponentProgressSchema = z.object({
  playerId: userIdSchema,
  attemptCount: z.number().int().min(0),
  solved: z.boolean(),
  finished: z.boolean(),
})

export const flagelPlayerProgressSchema = z.object({
  playerId: userIdSchema,
  attemptCount: z.number().int().min(0).max(6),
  solved: z.boolean(),
  finished: z.boolean(),
  score: z.number().int().min(0),
})

export const flagelSyncSchema = z.object({
  phase: z.enum(['waiting', 'playing', 'roundEnd', 'gameEnd']),
  currentRound: z.number().int().min(0),
  totalRounds: z.number().int().min(1),
  flagEmoji: z.string().optional(),
  flagImageUrl: z.string().min(1).optional(),
  maxAttempts: z.number().int().min(1),
  hintsAvailable: z.number().int().min(0),
  guesses: z.array(flagelGuessResultSchema),
  playerStatuses: z.array(flagelPlayerProgressSchema),
  scores: z.record(z.string(), z.number().int()),
  finalScores: z
    .array(
      z.object({
        playerId: userIdSchema,
        score: z.number().int(),
        rank: z.number().int().min(1),
      })
    )
    .optional(),
  correctCountry: z.string().min(1).optional(),
  countryCode: z.string().min(2).optional(),
})

// Chat schemas
export const chatMessagePayloadSchema = z.object({
  roomCode: roomCodeSchema,
  message: z.string().trim().min(1).max(500),
})

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  playerId: userIdSchema,
  playerName: playerNameSchema,
  message: z.string(),
  timestamp: isoDateTimeSchema,
  type: z.enum(['user', 'system', 'guess']).default('user'),
})

export const chatSystemMessageSchema = z.object({
  message: z.string().min(1),
  type: z.enum(['info', 'warning', 'success']),
})

// Admin schemas
export const adminStatsSchema = z.object({
  onlineUsers: z.number().int().min(0),
  activeRooms: z.number().int().min(0),
  gamesPlayed24h: z.number().int().min(0),
  totalUsers: z.number().int().min(0),
})

export const adminUserActivitySchema = z.object({
  userId: userIdSchema,
  action: z.enum(['login', 'logout', 'game_start', 'game_end', 'room_create', 'room_join']),
  timestamp: isoDateTimeSchema,
  metadata: z.record(z.unknown()).optional(),
})

export const adminRoomUpdateSchema = z.object({
  action: z.enum(['created', 'closed']),
  room: roomSchema,
})

export const adminErrorLogSchema = z.object({
  error: z.string().min(1),
  timestamp: isoDateTimeSchema,
})

// API schemas
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
      })
      .optional(),
  })

export const createRoomResponseSchema = z.object({
  roomCode: roomCodeSchema,
  joinUrl: z.string().url(),
})

export const roomInfoResponseSchema = roomSchema
