export const WORD_LIST = {
  easy: [
    'sun',
    'tree',
    'house',
    'car',
    'dog',
    'cat',
    'fish',
    'bird',
    'apple',
    'banana',
    'pizza',
    'ball',
    'star',
    'moon',
    'flower',
    'cloud',
    'hat',
    'shoe',
    'book',
    'key',
    'cup',
    'leaf',
    'bee',
    'frog',
    'pig',
    'cow',
    'duck',
    'egg',
    'hand',
    'foot',
    'eye',
    'nose',
    'ear',
    'lamp',
    'fork',
    'spoon',
    'plate',
    'chair',
    'table',
    'door',
    'road',
    'cake',
    'milk',
    'snake',
    'crab',
    'shark',
    'whale',
    'owl',
    'bat',
    'bear',
    'lion',
    'fox',
    'sock',
    'shirt',
    'ring',
    'drum',
    'kite',
    'boat',
    'train',
    'bus',
    'fan',
    'sword',
    'crown',
    'gift',
    'brick',
    'log',
    'sand',
    'rock',
    'hill',
    'lake',
    'river',
    'beach',
    'fire',
    'smoke',
    'ant',
    'worm',
    'mouse',
    'deer',
    'wolf',
    'ice',
    'candle',
    'balloon',
    'clock',
    'watch',
    'hammer',
    'nail',
    'broom',
    'mug',
    'knife',
    'ladder',
    'mailbox',
    'bench',
    'fence',
    'basket',
    'pencil',
    'eraser',
    'arrow',
    'bone',
    'bowl',
    'tooth',
    'wing',
    'tail',
  ],
  medium: [
    'rainbow',
    'umbrella',
    'butterfly',
    'elephant',
    'giraffe',
    'dinosaur',
    'astronaut',
    'superhero',
    'pirate',
    'robot',
    'castle',
    'bridge',
    'bicycle',
    'airplane',
    'rocket',
    'guitar',
    'dragon',
    'mermaid',
    'unicorn',
    'vampire',
    'witch',
    'wizard',
    'ninja',
    'cowboy',
    'spider',
    'octopus',
    'dolphin',
    'penguin',
    'kangaroo',
    'panda',
    'koala',
    'zebra',
    'peacock',
    'flamingo',
    'crocodile',
    'turtle',
    'jellyfish',
    'seahorse',
    'lobster',
    'mushroom',
    'pumpkin',
    'watermelon',
    'pineapple',
    'strawberry',
    'broccoli',
    'carrot',
    'hamburger',
    'sandwich',
    'popcorn',
    'doughnut',
    'cupcake',
    'telescope',
    'computer',
    'keyboard',
    'telephone',
    'camera',
    'lighthouse',
    'volcano',
    'waterfall',
    'treasure',
    'skeleton',
    'ghost',
    'zombie',
    'alien',
    'spaceship',
    'submarine',
    'helicopter',
    'motorcycle',
    'skateboard',
    'basketball',
    'football',
    'parachute',
    'fireworks',
    'snowman',
    'snowflake',
    'igloo',
    'cactus',
    'sunflower',
    'mountain',
    'island',
    'desert',
    'planet',
    'tornado',
    'rainbow trout',
    'palm tree',
    'paint brush',
    'race car',
    'soccer ball',
    'traffic light',
    'light bulb',
    'sand castle',
    'gold fish',
    'fire truck',
    'ice cream',
    'hot dog',
    'french fries',
    'polar bear',
    'tea pot',
    'piggy bank',
    'tooth brush',
    'roller skate',
    'bow tie',
    'campfire',
    'lantern',
    'compass',
    'anchor',
    'wagon',
    'chimney',
    'fountain',
    'windmill',
    'haystack',
    'beehive',
    'binoculars',
    'sleeping bag',
    'wheelbarrow',
    'magnifier',
    'tractor',
    'mailbag',
    'kettle',
    'envelope',
  ],
  hard: [
    'imagination',
    'celebration',
    'construction',
    'electricity',
    'photography',
    'architecture',
    'geography',
    'mathematics',
    'rollercoaster',
    'thunderstorm',
    'earthquake',
    'telescope',
    'kaleidoscope',
    'observatory',
    'planetarium',
    'civilization',
    'constellation',
    'transportation',
    'communication',
    'illumination',
    'hibernation',
    'navigation',
    'exploration',
    'hieroglyphics',
    'gladiator',
    'orchestra',
    'symphony',
    'ballerina',
    'calligraphy',
    'fingerprint',
    'periscope',
    'satellite',
    'hurricane',
    'avalanche',
    'blizzard',
    'rhinoceros',
    'hippopotamus',
    'chimpanzee',
    'chameleon',
    'tarantula',
    'pterodactyl',
    'tyrannosaurus',
    'archaeologist',
    'paleontologist',
    'meteorologist',
    'photosynthesis',
    'pyramid scheme',
    'Eiffel tower',
    'Statue of Liberty',
    'Trojan horse',
    'crystal ball',
    'genie lamp',
    'medusa',
    'minotaur',
    'centaur',
    'phoenix',
    'leviathan',
    'cathedral',
    'monastery',
    'aqueduct',
    'colosseum',
    'amphitheater',
    'gargoyle',
    'tombstone',
    'sarcophagus',
    'snowboarding',
    'skydiving',
    'gymnastics',
    'choreography',
    'embroidery',
    'astronomy',
    'microscope',
    'thermometer',
    'stethoscope',
    'metronome',
    'harmonica',
    'accordion',
    'saxophone',
    'trombone',
    'xylophone',
    'clarinet',
    'didgeridoo',
    'bagpipes',
    'submarine sandwich',
    'pinwheel',
  ],
} as const

export type Difficulty = keyof typeof WORD_LIST

export type GetRandomWordsOptions = {
  /**
   * Words that should not be returned again. Compared case-insensitively.
   * If excluding everything in the pool would leave nothing to draw from,
   * the function falls back to the full list for that difficulty.
   */
  exclude?: Iterable<string>
}

export function getRandomWords(
  count = 3,
  difficulty: Difficulty = 'medium',
  options: GetRandomWordsOptions = {}
) {
  const excluded = new Set<string>()
  for (const value of options.exclude ?? []) {
    excluded.add(value.toLowerCase())
  }

  const fullPool = WORD_LIST[difficulty]
  const filteredPool = fullPool.filter((word) => !excluded.has(word.toLowerCase()))

  // If we filtered everything out (long game, exhausted pool), reset to the
  // full list for this draw so we never return zero choices.
  const workingPool = filteredPool.length >= count ? [...filteredPool] : [...fullPool]
  const selected: string[] = []

  for (let index = 0; index < count && workingPool.length > 0; index += 1) {
    const wordIndex = Math.floor(Math.random() * workingPool.length)
    selected.push(workingPool[wordIndex])
    workingPool.splice(wordIndex, 1)
  }

  return selected
}

export function generateWordHint(word: string) {
  return word
    .split('')
    .map((character, index) => {
      if (character === ' ') {
        return ' '
      }

      return index === 0 ? character.toUpperCase() : '_'
    })
    .join(' ')
}

export function isCloseGuess(guess: string, word: string) {
  const normalizedGuess = normalizeWord(guess)
  const normalizedWord = normalizeWord(word)

  if (!normalizedGuess || normalizedGuess === normalizedWord) {
    return false
  }

  if (normalizedWord.includes(normalizedGuess) || normalizedGuess.includes(normalizedWord)) {
    return true
  }

  const distance = levenshteinDistance(normalizedGuess, normalizedWord)
  return distance > 0 && distance <= 2
}

function normalizeWord(value: string) {
  return value.toLowerCase().trim()
}

function levenshteinDistance(left: string, right: string) {
  const matrix: number[][] = []

  for (let row = 0; row <= right.length; row += 1) {
    matrix[row] = [row]
  }

  for (let column = 0; column <= left.length; column += 1) {
    matrix[0][column] = column
  }

  for (let row = 1; row <= right.length; row += 1) {
    for (let column = 1; column <= left.length; column += 1) {
      if (right.charAt(row - 1) === left.charAt(column - 1)) {
        matrix[row][column] = matrix[row - 1][column - 1]
      } else {
        matrix[row][column] = Math.min(
          matrix[row - 1][column - 1] + 1,
          matrix[row][column - 1] + 1,
          matrix[row - 1][column] + 1
        )
      }
    }
  }

  return matrix[right.length][left.length]
}
