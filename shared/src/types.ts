import { z } from 'zod'

import {
  ADMIN_EVENTS,
  CHAT_EVENTS,
  FLAGEL_EVENTS,
  ROOM_EVENTS,
  SKRIBBLE_EVENTS,
  TRIVIA_EVENTS,
  WORDEL_EVENTS,
} from './socketEvents'
import {
  adminErrorLogSchema,
  adminRoomUpdateSchema,
  adminStatsSchema,
  adminUserActivitySchema,
  chatMessagePayloadSchema,
  chatMessageSchema,
  chatSystemMessageSchema,
  chooseSkribbleWordPayloadSchema,
  clearCanvasPayloadSchema,
  drawCanvasClearedSchema,
  drawCorrectGuessSchema,
  drawGameEndedSchema,
  drawRoundEndedSchema,
  drawStrokeBroadcastSchema,
  drawSyncSchema,
  drawTurnStartedSchema,
  drawWordHintSchema,
  drawWordChoicesSchema,
  drawWordChoosingStartedSchema,
  flagelGameEndedSchema,
  flagelGuessResultSchema,
  flagelOpponentProgressSchema,
  flagelPlayerProgressSchema,
  flagelRoundEndedSchema,
  flagelRoundStartedSchema,
  flagelSkipPayloadSchema,
  flagelSubmitGuessPayloadSchema,
  flagelSyncSchema,
  gameIdSchema,
  guessPayloadSchema,
  playerSchema,
  requestSyncPayloadSchema,
  roomErrorSchema,
  roomGameStartedSchema,
  roomHostChangedSchema,
  roomJoinedSchema,
  roomJoinPayloadSchema,
  roomKickPlayerPayloadSchema,
  roomLeftSchema,
  roomLeavePayloadSchema,
  roomPresenceSchema,
  roomPlayerKickedSchema,
  roomSchema,
  roomStartGamePayloadSchema,
  roomStatusSchema,
  skribbleGuessResultSchema,
  skribbleRoundStartedSchema,
  strokeBatchPayloadSchema,
  strokeSchema,
  triviaAnswerResultSchema,
  triviaCategorySchema,
  triviaDifficultySchema,
  triviaRegionSchema,
  triviaResolvedRegionSchema,
  triviaGameEndedSchema,
  triviaPlayerProgressSchema,
  triviaPlayerAnsweredSchema,
  triviaQuestionSchema,
  triviaRoundEndedSchema,
  triviaRoundStartedSchema,
  triviaSyncSchema,
  triviaSubmitAnswerPayloadSchema,
  triviaTimerTickSchema,
  userSchema,
  wordelGameEndedSchema,
  wordelGuessResultSchema,
  wordelLetterResultSchema,
  wordelOpponentProgressSchema,
  wordelPlayerProgressSchema,
  wordelRoundEndedSchema,
  wordelRoundStartedSchema,
  wordelSyncSchema,
  wordelSubmitGuessPayloadSchema,
} from './schemas'

export type UserId = string
export type RoomCode = string
export type GameId = z.infer<typeof gameIdSchema>
export type RoomStatus = z.infer<typeof roomStatusSchema>

export type User = z.infer<typeof userSchema>
export type Player = z.infer<typeof playerSchema>
export type Room = z.infer<typeof roomSchema>

export type RoomJoinPayload = z.infer<typeof roomJoinPayloadSchema>
export type RoomLeavePayload = z.infer<typeof roomLeavePayloadSchema>
export type RoomStartGamePayload = z.infer<typeof roomStartGamePayloadSchema>
export type RoomKickPlayerPayload = z.infer<typeof roomKickPlayerPayloadSchema>
export type RoomJoinedPayload = z.infer<typeof roomJoinedSchema>
export type RoomLeftPayload = z.infer<typeof roomLeftSchema>
export type RoomPresence = z.infer<typeof roomPresenceSchema>
export type RoomGameStartedPayload = z.infer<typeof roomGameStartedSchema>
export type RoomPlayerKickedPayload = z.infer<typeof roomPlayerKickedSchema>
export type RoomError = z.infer<typeof roomErrorSchema>
export type RoomHostChangedPayload = z.infer<typeof roomHostChangedSchema>

export type Stroke = z.infer<typeof strokeSchema>
export type StrokeBatchPayload = z.infer<typeof strokeBatchPayloadSchema>
export type ClearCanvasPayload = z.infer<typeof clearCanvasPayloadSchema>
export type GuessPayload = z.infer<typeof guessPayloadSchema>
export type ChooseSkribbleWordPayload = z.infer<typeof chooseSkribbleWordPayloadSchema>
export type RequestSyncPayload = z.infer<typeof requestSyncPayloadSchema>
export type DrawStrokeBroadcastPayload = z.infer<typeof drawStrokeBroadcastSchema>
export type DrawCanvasClearedPayload = z.infer<typeof drawCanvasClearedSchema>
export type SkribbleRoundStarted = z.infer<typeof skribbleRoundStartedSchema>
export type SkribbleGuessResult = z.infer<typeof skribbleGuessResultSchema>
export type DrawCorrectGuessPayload = z.infer<typeof drawCorrectGuessSchema>
export type DrawSyncPayload = z.infer<typeof drawSyncSchema>
export type DrawRoundEndedPayload = z.infer<typeof drawRoundEndedSchema>
export type DrawGameEndedPayload = z.infer<typeof drawGameEndedSchema>
export type DrawTurnStartedPayload = z.infer<typeof drawTurnStartedSchema>
export type DrawWordHintPayload = z.infer<typeof drawWordHintSchema>
export type DrawWordChoicesPayload = z.infer<typeof drawWordChoicesSchema>
export type DrawWordChoosingStartedPayload = z.infer<typeof drawWordChoosingStartedSchema>

export type TriviaQuestion = z.infer<typeof triviaQuestionSchema>
export type TriviaCategory = z.infer<typeof triviaCategorySchema>
export type TriviaDifficulty = z.infer<typeof triviaDifficultySchema>
export type TriviaRegion = z.infer<typeof triviaRegionSchema>
export type TriviaResolvedRegion = z.infer<typeof triviaResolvedRegionSchema>
export type TriviaSubmitAnswerPayload = z.infer<typeof triviaSubmitAnswerPayloadSchema>
export type TriviaRoundStarted = z.infer<typeof triviaRoundStartedSchema>
export type TriviaRoundEnded = z.infer<typeof triviaRoundEndedSchema>
export type TriviaAnswerResultPayload = z.infer<typeof triviaAnswerResultSchema>
export type TriviaPlayerAnsweredPayload = z.infer<typeof triviaPlayerAnsweredSchema>
export type TriviaGameEnded = z.infer<typeof triviaGameEndedSchema>
export type TriviaTimerTickPayload = z.infer<typeof triviaTimerTickSchema>
export type TriviaPlayerProgress = z.infer<typeof triviaPlayerProgressSchema>
export type TriviaSyncPayload = z.infer<typeof triviaSyncSchema>

export type WordelGuessResult = z.infer<typeof wordelGuessResultSchema>
export type WordelSubmitGuessPayload = z.infer<typeof wordelSubmitGuessPayloadSchema>
export type WordelRoundStarted = z.infer<typeof wordelRoundStartedSchema>
export type WordelRoundEnded = z.infer<typeof wordelRoundEndedSchema>
export type WordelGameEnded = z.infer<typeof wordelGameEndedSchema>
export type WordelOpponentProgressPayload = z.infer<typeof wordelOpponentProgressSchema>
export type WordelPlayerProgress = z.infer<typeof wordelPlayerProgressSchema>
export type WordelSyncPayload = z.infer<typeof wordelSyncSchema>
export type WordelLetterResult = z.infer<typeof wordelLetterResultSchema>

export type FlagelSubmitGuessPayload = z.infer<typeof flagelSubmitGuessPayloadSchema>
export type FlagelSkipPayload = z.infer<typeof flagelSkipPayloadSchema>
export type FlagelRoundStarted = z.infer<typeof flagelRoundStartedSchema>
export type FlagelGuessResult = z.infer<typeof flagelGuessResultSchema>
export type FlagelRoundEnded = z.infer<typeof flagelRoundEndedSchema>
export type FlagelGameEnded = z.infer<typeof flagelGameEndedSchema>
export type FlagelOpponentProgressPayload = z.infer<typeof flagelOpponentProgressSchema>
export type FlagelPlayerProgress = z.infer<typeof flagelPlayerProgressSchema>
export type FlagelSyncPayload = z.infer<typeof flagelSyncSchema>

export type ChatMessagePayload = z.infer<typeof chatMessagePayloadSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatSystemMessagePayload = z.infer<typeof chatSystemMessageSchema>

export type AdminStats = z.infer<typeof adminStatsSchema>
export type AdminUserActivity = z.infer<typeof adminUserActivitySchema>
export type AdminRoomUpdatePayload = z.infer<typeof adminRoomUpdateSchema>
export type AdminErrorLogPayload = z.infer<typeof adminErrorLogSchema>

export interface ClientToServerEvents {
  [ROOM_EVENTS.JOIN]: (payload: RoomJoinPayload) => void
  [ROOM_EVENTS.LEAVE]: (payload: RoomLeavePayload) => void
  [ROOM_EVENTS.START_GAME]: (payload: RoomStartGamePayload) => void
  [ROOM_EVENTS.KICK_PLAYER]: (payload: RoomKickPlayerPayload) => void
  [SKRIBBLE_EVENTS.STROKE_BATCH]: (payload: StrokeBatchPayload) => void
  [SKRIBBLE_EVENTS.CLEAR_CANVAS]: (payload: ClearCanvasPayload) => void
  [SKRIBBLE_EVENTS.GUESS]: (payload: GuessPayload) => void
  [SKRIBBLE_EVENTS.CHOOSE_WORD]: (payload: ChooseSkribbleWordPayload) => void
  [SKRIBBLE_EVENTS.REQUEST_SYNC]: (payload: RequestSyncPayload) => void
  [TRIVIA_EVENTS.SUBMIT_ANSWER]: (payload: TriviaSubmitAnswerPayload) => void
  [WORDEL_EVENTS.SUBMIT_GUESS]: (payload: WordelSubmitGuessPayload) => void
  [FLAGEL_EVENTS.SUBMIT_GUESS]: (payload: FlagelSubmitGuessPayload) => void
  [FLAGEL_EVENTS.SKIP]: (payload: FlagelSkipPayload) => void
  [CHAT_EVENTS.SEND_MESSAGE]: (payload: ChatMessagePayload) => void
}

export type ClientToServerPayload<TEventName extends keyof ClientToServerEvents> = Parameters<
  ClientToServerEvents[TEventName]
>[0]

export interface ServerToClientEvents {
  [ROOM_EVENTS.JOINED]: (payload: RoomJoinedPayload) => void
  [ROOM_EVENTS.LEFT]: (payload: RoomLeftPayload) => void
  [ROOM_EVENTS.PRESENCE]: (payload: RoomPresence) => void
  [ROOM_EVENTS.GAME_STARTED]: (payload: RoomGameStartedPayload) => void
  [ROOM_EVENTS.PLAYER_KICKED]: (payload: RoomPlayerKickedPayload) => void
  [ROOM_EVENTS.ERROR]: (payload: RoomError) => void
  [ROOM_EVENTS.HOST_CHANGED]: (payload: RoomHostChangedPayload) => void
  [SKRIBBLE_EVENTS.STROKE_BROADCAST]: (payload: DrawStrokeBroadcastPayload) => void
  [SKRIBBLE_EVENTS.CANVAS_CLEARED]: (payload: DrawCanvasClearedPayload) => void
  [SKRIBBLE_EVENTS.GUESS_RESULT]: (payload: SkribbleGuessResult) => void
  [SKRIBBLE_EVENTS.CORRECT_GUESS]: (payload: DrawCorrectGuessPayload) => void
  [SKRIBBLE_EVENTS.SYNC]: (payload: DrawSyncPayload) => void
  [SKRIBBLE_EVENTS.WORD_CHOOSING_STARTED]: (payload: DrawWordChoosingStartedPayload) => void
  [SKRIBBLE_EVENTS.WORD_CHOICES]: (payload: DrawWordChoicesPayload) => void
  [SKRIBBLE_EVENTS.ROUND_STARTED]: (payload: SkribbleRoundStarted) => void
  [SKRIBBLE_EVENTS.ROUND_ENDED]: (payload: DrawRoundEndedPayload) => void
  [SKRIBBLE_EVENTS.GAME_ENDED]: (payload: DrawGameEndedPayload) => void
  [SKRIBBLE_EVENTS.TURN_STARTED]: (payload: DrawTurnStartedPayload) => void
  [SKRIBBLE_EVENTS.WORD_HINT]: (payload: DrawWordHintPayload) => void
  [TRIVIA_EVENTS.ROUND_STARTED]: (payload: TriviaRoundStarted) => void
  [TRIVIA_EVENTS.ROUND_ENDED]: (payload: TriviaRoundEnded) => void
  [TRIVIA_EVENTS.ANSWER_RESULT]: (payload: TriviaAnswerResultPayload) => void
  [TRIVIA_EVENTS.PLAYER_ANSWERED]: (payload: TriviaPlayerAnsweredPayload) => void
  [TRIVIA_EVENTS.GAME_ENDED]: (payload: TriviaGameEnded) => void
  [TRIVIA_EVENTS.TIMER_TICK]: (payload: TriviaTimerTickPayload) => void
  [TRIVIA_EVENTS.SYNC]: (payload: TriviaSyncPayload) => void
  [WORDEL_EVENTS.ROUND_STARTED]: (payload: WordelRoundStarted) => void
  [WORDEL_EVENTS.GUESS_RESULT]: (payload: WordelGuessResult) => void
  [WORDEL_EVENTS.ROUND_ENDED]: (payload: WordelRoundEnded) => void
  [WORDEL_EVENTS.GAME_ENDED]: (payload: WordelGameEnded) => void
  [WORDEL_EVENTS.OPPONENT_PROGRESS]: (payload: WordelOpponentProgressPayload) => void
  [WORDEL_EVENTS.SYNC]: (payload: WordelSyncPayload) => void
  [FLAGEL_EVENTS.ROUND_STARTED]: (payload: FlagelRoundStarted) => void
  [FLAGEL_EVENTS.GUESS_RESULT]: (payload: FlagelGuessResult) => void
  [FLAGEL_EVENTS.ROUND_ENDED]: (payload: FlagelRoundEnded) => void
  [FLAGEL_EVENTS.GAME_ENDED]: (payload: FlagelGameEnded) => void
  [FLAGEL_EVENTS.OPPONENT_PROGRESS]: (payload: FlagelOpponentProgressPayload) => void
  [FLAGEL_EVENTS.SYNC]: (payload: FlagelSyncPayload) => void
  [CHAT_EVENTS.MESSAGE]: (payload: ChatMessage) => void
  [CHAT_EVENTS.SYSTEM_MESSAGE]: (payload: ChatSystemMessagePayload) => void
  [ADMIN_EVENTS.STATS_UPDATE]: (payload: AdminStats) => void
  [ADMIN_EVENTS.USER_ACTIVITY]: (payload: AdminUserActivity) => void
  [ADMIN_EVENTS.ROOM_UPDATE]: (payload: AdminRoomUpdatePayload) => void
  [ADMIN_EVENTS.ERROR_LOG]: (payload: AdminErrorLogPayload) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId?: UserId
  userName?: string
  userImage?: string
  isAdmin?: boolean
  roomCode?: RoomCode
}
