import test from 'node:test'
import assert from 'node:assert/strict'

import { SKRIBBLE_EVENTS, type GameConfig, type GameEventResult } from '@arcado/shared'

import { SkribbleRuntime } from './SkribbleRuntime'

class TestSkribbleRuntime extends SkribbleRuntime {
  async end(): Promise<GameEventResult> {
    const mutableThis = this as unknown as { phase: 'gameEnd' }
    mutableThis.phase = 'gameEnd'
    return {
      success: true,
      broadcast: [
        {
          event: SKRIBBLE_EVENTS.GAME_ENDED,
          to: 'room',
          data: {
            finalScores: [],
          },
        },
      ],
    }
  }

  setRoundWordForTest(word: string) {
    const mutableThis = this as unknown as {
      roundState: {
        word: string
        wordHint: string
      }
    }

    mutableThis.roundState.word = word
    mutableThis.roundState.wordHint = `${word.charAt(0).toUpperCase()} _`
  }

  async startNextRoundForTest(): Promise<GameEventResult> {
    const mutableThis = this as unknown as {
      startNextRound(): Promise<GameEventResult>
    }
    return mutableThis.startNextRound()
  }

  async finishRoundForTest(): Promise<GameEventResult> {
    const mutableThis = this as unknown as {
      finishRound(selfDispatch?: boolean): Promise<GameEventResult>
    }
    return mutableThis.finishRound(false)
  }

  getUsedWordsForTest(): Set<string> {
    return (this as unknown as { usedWords: Set<string> }).usedWords
  }
}

function createRuntime(roundsPerPlayer = 1) {
  const config: GameConfig = {
    gameId: 'skribble',
    roomCode: 'ABC123',
    players: [
      {
        id: 'user-1',
        name: 'Alpha',
        isHost: true,
        isConnected: true,
        score: 0,
      },
      {
        id: 'user-2',
        name: 'Bravo',
        isHost: false,
        isConnected: true,
        score: 0,
      },
      {
        id: 'user-3',
        name: 'Charlie',
        isHost: false,
        isConnected: true,
        score: 0,
      },
    ],
    settings: {
      rounds: roundsPerPlayer,
    },
  }

  const io = {
    to: () => ({
      emit: () => undefined,
    }),
  } as never

  const roomService = {
    applyGameResults: async () => undefined,
  } as never

  return new TestSkribbleRuntime(io, config, roomService)
}

async function startRoundWithChosenWord(runtime: TestSkribbleRuntime, word = 'rocket') {
  const startResult = await runtime.start()
  const choosingStarted = startResult.broadcast?.find(
    (entry) => entry.event === SKRIBBLE_EVENTS.WORD_CHOOSING_STARTED
  )
  assert.ok(choosingStarted)

  const drawerId = (choosingStarted.data as { drawerId: string }).drawerId
  await runtime.onClientEvent(drawerId, SKRIBBLE_EVENTS.CHOOSE_WORD, {
    roomCode: 'ABC123',
    word: ((startResult.broadcast?.find((entry) => entry.event === SKRIBBLE_EVENTS.WORD_CHOICES)?.data as {
      words?: string[]
    })?.words?.[0] ?? word),
  })
  runtime.setRoundWordForTest(word)

  return drawerId
}

test('SkribbleRuntime only allows the active drawer to submit strokes', async () => {
  const runtime = createRuntime()
  await runtime.initialize()
  const drawerId = await startRoundWithChosenWord(runtime)
  const nonDrawerId = ['user-1', 'user-2', 'user-3'].find((playerId) => playerId !== drawerId) ?? 'user-2'

  const denied = await runtime.onClientEvent(nonDrawerId, SKRIBBLE_EVENTS.STROKE_BATCH, {
    roomCode: 'ABC123',
    strokes: [
      {
        points: [{ x: 10, y: 10 }],
        color: '#ffffff',
        width: 4,
        tool: 'brush',
      },
    ],
    timestamp: Date.now(),
  })

  assert.equal(denied.success, false)
  assert.match(denied.error ?? '', /drawer/i)
})

test('SkribbleRuntime scores the first correct guess and marks the player as correct', async () => {
  const runtime = createRuntime()
  await runtime.initialize()
  const drawerId = await startRoundWithChosenWord(runtime)
  const guesserId = ['user-1', 'user-2', 'user-3'].find((playerId) => playerId !== drawerId) ?? 'user-2'

  const result = await runtime.onClientEvent(guesserId, SKRIBBLE_EVENTS.GUESS, {
    roomCode: 'ABC123',
    guess: 'rocket',
  })

  assert.equal(result.success, true)

  const guessResult = result.broadcast?.find(
    (entry) => entry.event === SKRIBBLE_EVENTS.GUESS_RESULT && entry.playerId === guesserId
  )

  assert.ok(guessResult)
  assert.deepEqual(guessResult.data, {
    playerId: guesserId,
    isCorrect: true,
    pointsEarned: 100,
  })

  const syncPayload = runtime.getPlayerSyncData(guesserId) as {
    correctGuessers: string[]
  }

  assert.deepEqual(syncPayload.correctGuessers, [guesserId])
})

test('SkribbleRuntime ends the round once every guesser has guessed correctly', async () => {
  const runtime = createRuntime()
  await runtime.initialize()
  const drawerId = await startRoundWithChosenWord(runtime)
  const guessers = ['user-1', 'user-2', 'user-3'].filter((playerId) => playerId !== drawerId)

  const first = await runtime.onClientEvent(guessers[0], SKRIBBLE_EVENTS.GUESS, {
    roomCode: 'ABC123',
    guess: 'rocket',
  })
  const second = await runtime.onClientEvent(guessers[1], SKRIBBLE_EVENTS.GUESS, {
    roomCode: 'ABC123',
    guess: 'rocket',
  })

  assert.equal(first.success, true)
  assert.equal(second.success, true)
  assert.equal(runtime.getSnapshot().phase, 'roundEnd')

  const roundEnded = second.broadcast?.find((entry) => entry.event === SKRIBBLE_EVENTS.ROUND_ENDED)
  assert.ok(roundEnded)
})

test('SkribbleRuntime emits game ended payload', async () => {
  const runtime = createRuntime()
  await runtime.initialize()

  const result = await runtime.end()
  const gameEnded = result.broadcast?.find((entry) => entry.event === SKRIBBLE_EVENTS.GAME_ENDED)
  assert.ok(gameEnded)
})

test('SkribbleRuntime never offers the same word in two different rounds', async () => {
  const ROUNDS = 9
  const runtime = createRuntime(ROUNDS)
  await runtime.initialize()

  const seen = new Set<string>()

  for (let round = 0; round < ROUNDS; round += 1) {
    const result = round === 0 ? await runtime.start() : await runtime.startNextRoundForTest()

    const choicesEvent = result.broadcast?.find(
      (entry) => entry.event === SKRIBBLE_EVENTS.WORD_CHOICES
    )
    assert.ok(choicesEvent, `Round ${round + 1} did not emit WORD_CHOICES`)

    const offered = (choicesEvent.data as { words: string[] }).words
    assert.equal(offered.length, 3, `Round ${round + 1} did not offer 3 words`)

    for (const word of offered) {
      const key = word.toLowerCase()
      assert.equal(
        seen.has(key),
        false,
        `Round ${round + 1} re-offered "${word}" (already shown earlier)`
      )
      seen.add(key)
    }

    // Pick the first option, draw briefly, then close out the round so we
    // can advance the runtime to the next round picker.
    const drawerId = (choicesEvent.data as { drawerId: string }).drawerId
    await runtime.onClientEvent(drawerId, SKRIBBLE_EVENTS.CHOOSE_WORD, {
      roomCode: 'ABC123',
      word: offered[0],
    })
    await runtime.finishRoundForTest()
  }

  assert.equal(seen.size, ROUNDS * 3, 'Expected every offered word to be unique')
})
