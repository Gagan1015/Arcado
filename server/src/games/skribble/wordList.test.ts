import test from 'node:test'
import assert from 'node:assert/strict'

import { generateWordHint, getRandomWords, isCloseGuess } from './wordList'

test('getRandomWords returns unique entries for a single request', () => {
  const words = getRandomWords(3, 'easy')

  assert.equal(words.length, 3)
  assert.equal(new Set(words).size, 3)
})

test('generateWordHint reveals the first character and masks the rest', () => {
  assert.equal(generateWordHint('rocket'), 'R _ _ _ _ _')
})

test('isCloseGuess detects near misses but not exact matches', () => {
  assert.equal(isCloseGuess('rocet', 'rocket'), true)
  assert.equal(isCloseGuess('rocket', 'rocket'), false)
})

test('getRandomWords excludes already-used words across rounds', () => {
  const used = new Set<string>()

  for (let round = 0; round < 5; round += 1) {
    const words = getRandomWords(3, 'medium', { exclude: used })

    for (const word of words) {
      assert.equal(used.has(word.toLowerCase()), false, `Round ${round} returned a repeat: ${word}`)
      used.add(word.toLowerCase())
    }
  }

  // 5 rounds * 3 words = 15 unique offerings.
  assert.equal(used.size, 15)
})

test('getRandomWords falls back to the full pool when exclusions exhaust the list', () => {
  // Pool size for 'easy' is large; exhaust it, then ask for more.
  const used = new Set<string>()

  for (let round = 0; round < 200; round += 1) {
    const words = getRandomWords(3, 'easy', { exclude: used })
    assert.equal(words.length, 3, `Round ${round} returned fewer than 3 words`)
    for (const word of words) {
      used.add(word.toLowerCase())
    }
  }
})
