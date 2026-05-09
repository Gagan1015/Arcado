import type {
  GameId,
  Player,
  TriviaCategory,
  TriviaDifficulty,
  UserId,
  WordelLetterResult,
} from './types'

export type GamePhase = 'waiting' | 'playing' | 'roundEnd' | 'gameEnd'

export interface GameSettings {
  rounds?: number
  roundTime?: number
  maxPlayers?: number
  triviaCategory?: TriviaCategory
  triviaCategories?: TriviaCategory[]
  triviaDifficulty?: TriviaDifficulty
  triviaTimeLimit?: number
  /** 'auto' | 'international' | 'india'. Host-selected preference. */
  triviaRegion?: 'auto' | 'international' | 'india'
  /** 'international' | 'india'. Resolved before the first question fetch. */
  triviaResolvedRegion?: 'international' | 'india'
  customSettings?: Record<string, unknown>
}

export interface GameConfig {
  gameId: GameId
  roomCode: string
  players: Player[]
  settings?: GameSettings
}

export interface GameSnapshot {
  phase: GamePhase
  currentRound: number
  totalRounds: number
  scores: Record<UserId, number>
  roundData?: unknown
  timeRemaining?: number
}

export interface GameBroadcast {
  event: string
  data: unknown
  to: 'room' | 'player'
  playerId?: UserId
}

export interface GameEventResult {
  success: boolean
  broadcast?: GameBroadcast[]
  error?: string
}

export interface TriviaAnswerOptionMetadata {
  id: string
  text: string
}

export interface TriviaRoundResultMetadata {
  roundNumber: number
  category: string
  difficulty: string
  question: string
  answers: TriviaAnswerOptionMetadata[]
  selectedAnswerId: string | null
  correctAnswerId: string
  isCorrect: boolean
  pointsEarned: number
  answerTime: number | null
  totalScore: number
  explanation: string | null
}

export interface TriviaGameResultMetadata {
  gameType: 'trivia'
  totalRounds: number
  roundTimeSeconds: number
  categories: TriviaCategory[]
  difficulty: TriviaDifficulty
  correctAnswers: number
  rounds: TriviaRoundResultMetadata[]
}

export interface WordelGuessMetadata {
  guess: string
  results: WordelLetterResult[]
  isCorrect: boolean
  attemptsUsed: number
}

export interface WordelGameResultMetadata {
  gameType: 'wordel'
  wordLength: number
  maxAttempts: number
  correctWord: string
  solved: boolean
  attemptsUsed: number
  guesses: WordelGuessMetadata[]
}

export interface FlagelGuessMetadata {
  guess: string
  isCorrect: boolean
  distance: number | null
  direction: string | null
  attemptsUsed: number
  maxAttempts: number
}

export interface FlagelGameResultMetadata {
  gameType: 'flagel'
  maxAttempts: number
  correctCountry: string
  countryCode: string
  flagEmoji: string | null
  flagImageUrl: string | null
  solved: boolean
  skipped: boolean
  attemptsUsed: number
  guesses: FlagelGuessMetadata[]
}

export interface SkribbleCorrectGuesserMetadata {
  playerId: string
  playerName: string
  position: number
  pointsEarned: number
}

export interface SkribbleRoundResultMetadata {
  roundNumber: number
  drawerId: string
  drawerName: string
  word: string
  wordHint: string
  strokeCount: number
  drawerPoints: number
  playerWasDrawer: boolean
  guessedCorrectly: boolean
  guessPosition: number | null
  pointsEarned: number
  scoreAfterRound: number
  correctGuessers: SkribbleCorrectGuesserMetadata[]
}

export interface SkribbleGameResultMetadata {
  gameType: 'skribble'
  totalRounds: number
  rounds: SkribbleRoundResultMetadata[]
}

export type PersistedGameResultMetadata =
  | TriviaGameResultMetadata
  | WordelGameResultMetadata
  | FlagelGameResultMetadata
  | SkribbleGameResultMetadata

export interface GameResultData {
  playerId: UserId
  score: number
  rank: number
  isWinner: boolean
  isSolo: boolean
  metadata?: PersistedGameResultMetadata
}

export interface IGameRuntime {
  initialize(): Promise<void>
  start(): Promise<GameEventResult>
  end(): Promise<GameEventResult>
  dispose(): void | Promise<void>
  onPlayerJoin(player: Player): GameEventResult
  onPlayerLeave(playerId: UserId): GameEventResult
  onPlayerReconnect(playerId: UserId): GameEventResult
  onClientEvent(playerId: UserId, eventName: string, payload: unknown): Promise<GameEventResult>
  getSnapshot(): GameSnapshot
  getPlayerSyncData(playerId: UserId): unknown
  getResults(): GameResultData[]
}
