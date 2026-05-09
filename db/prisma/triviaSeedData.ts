import { createHash } from 'node:crypto'

type SeedCategory =
  | 'Movies & TV'
  | 'Music'
  | 'Sports'
  | 'Gaming'
  | 'Science & Nature'
  | 'History & Culture'
  | 'Geography & Travel'
  | 'Internet & Tech'
  | 'Food & Lifestyle'

type SeedDifficulty = 'easy' | 'medium' | 'hard'

type SeedEntry = readonly [question: string, answer: string]

type SeedTriviaQuestion = {
  hash: string
  question: string
  answers: Array<{ id: 'a' | 'b' | 'c' | 'd'; text: string }>
  correctId: 'a' | 'b' | 'c' | 'd'
  explanation: string
  category: SeedCategory
  difficulty: SeedDifficulty
  tags: string[]
  source: 'seed'
  status: 'approved'
  region: 'international'
}

const ANSWER_IDS = ['a', 'b', 'c', 'd'] as const
const CATEGORIES: SeedCategory[] = [
  'Movies & TV',
  'Music',
  'Sports',
  'Gaming',
  'Science & Nature',
  'History & Culture',
  'Geography & Travel',
  'Internet & Tech',
  'Food & Lifestyle',
]

function buildQuestionSet(options: {
  category: SeedCategory
  difficulty: SeedDifficulty
  entries: SeedEntry[]
  tags: string[]
}) {
  const answerPool = options.entries.map(([, answer]) => answer)

  return options.entries.map(([question, answer], index) =>
    createQuestion({
      category: options.category,
      difficulty: options.difficulty,
      question,
      correctAnswer: answer,
      distractors: pickDistractors(answerPool, answer, index),
      tags: [...options.tags, answer],
      correctIndex: index % ANSWER_IDS.length,
    })
  )
}

function createQuestion(options: {
  category: SeedCategory
  difficulty: SeedDifficulty
  question: string
  correctAnswer: string
  distractors: string[]
  tags: string[]
  correctIndex: number
}): SeedTriviaQuestion {
  const answers = createAnswers(options.correctAnswer, options.distractors, options.correctIndex)
  const correctId = ANSWER_IDS[options.correctIndex] ?? 'a'
  const normalizedHash = JSON.stringify({
    region: 'international',
    category: options.category,
    difficulty: options.difficulty,
    question: options.question.trim().toLowerCase(),
    answers: answers.map((answer) => answer.text.trim().toLowerCase()),
    correctId,
  })

  return {
    hash: createHash('sha256').update(normalizedHash).digest('hex'),
    question: options.question,
    answers,
    correctId,
    explanation: `${options.correctAnswer} is the correct match for this ${options.category.toLowerCase()} clue.`,
    category: options.category,
    difficulty: options.difficulty,
    tags: sanitizeTags(options.tags),
    source: 'seed',
    status: 'approved',
    region: 'international',
  }
}

function createAnswers(correctAnswer: string, distractors: string[], correctIndex: number) {
  const orderedAnswers = [...distractors]
  orderedAnswers.splice(correctIndex, 0, correctAnswer)

  return ANSWER_IDS.map((id, index) => ({
    id,
    text: orderedAnswers[index] ?? correctAnswer,
  }))
}

function pickDistractors(pool: string[], correctAnswer: string, startIndex: number) {
  const uniquePool = Array.from(new Set(pool.filter((candidate) => candidate !== correctAnswer)))
  const distractors: string[] = []
  let cursor = startIndex

  while (distractors.length < 3 && uniquePool.length > 0) {
    const candidate = uniquePool[cursor % uniquePool.length]
    if (candidate && !distractors.includes(candidate)) {
      distractors.push(candidate)
    }
    cursor += 1
  }

  return distractors
}

function sanitizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => slugify(tag))
        .filter((tag) => tag.length > 0)
    )
  ).slice(0, 8)
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function buildMoviesAndTvQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'easy',
      tags: ['movies-tv', 'franchises'],
      entries: [
        ['Which franchise features Luke Skywalker?', 'Star Wars'],
        ['Which film series follows Harry Potter at Hogwarts?', 'Harry Potter'],
        ['Which animated franchise features Woody and Buzz Lightyear?', 'Toy Story'],
        ['Which superhero film franchise centers on Wakanda and TChalla?', 'Black Panther'],
        ['Which fantasy series includes Frodo Baggins and the One Ring?', 'The Lord of the Rings'],
        ['Which action franchise features Dom Toretto and his crew?', 'Fast & Furious'],
        ['Which pirate film series stars Captain Jack Sparrow?', 'Pirates of the Caribbean'],
        ['Which monster-friendly animated film features Sulley and Mike?', 'Monsters, Inc.'],
        ['Which spy franchise features Ethan Hunt?', 'Mission: Impossible'],
        ['Which family film series follows Marty McFly and Doc Brown?', 'Back to the Future'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'easy',
      tags: ['movies-tv', 'series'],
      entries: [
        ['Eleven is a main character in which series?', 'Stranger Things'],
        ['Michael Scott is the regional manager in which sitcom?', 'The Office'],
        ['Sheldon Cooper is a physicist in which sitcom?', 'The Big Bang Theory'],
        ['Tony Soprano is the mob boss in which drama?', 'The Sopranos'],
        ['A football coach from Kansas leads AFC Richmond in which series?', 'Ted Lasso'],
        ['Wednesday Addams attends Nevermore in which series?', 'Wednesday'],
        ['Tyrion Lannister appears in which fantasy series?', 'Game of Thrones'],
        ['Bob Belcher runs a burger restaurant in which animated sitcom?', "Bob's Burgers"],
        ['Aang learns all four elements in which animated series?', 'Avatar: The Last Airbender'],
        ['Lorelai Gilmore lives in Stars Hollow in which drama-comedy?', 'Gilmore Girls'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'medium',
      tags: ['movies-tv', 'directors-creators'],
      entries: [
        ['Who directed Jaws?', 'Steven Spielberg'],
        ['Who directed Pulp Fiction?', 'Quentin Tarantino'],
        ['Who directed Spirited Away?', 'Hayao Miyazaki'],
        ['Who created The Simpsons?', 'Matt Groening'],
        ['Who directed The Dark Knight?', 'Christopher Nolan'],
        ['Who directed Titanic?', 'James Cameron'],
        ['Who directed The Grand Budapest Hotel?', 'Wes Anderson'],
        ['Who directed Black Panther?', 'Ryan Coogler'],
        ['Who created Breaking Bad?', 'Vince Gilligan'],
        ['Who directed Barbie (2023)?', 'Greta Gerwig'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'medium',
      tags: ['movies-tv', 'roles'],
      entries: [
        ['Which role is played by Daniel Radcliffe in the Harry Potter films?', 'Harry Potter'],
        ['Which role is played by Emilia Clarke in Game of Thrones?', 'Daenerys Targaryen'],
        ['Which role is played by Robert Downey Jr. in the MCU?', 'Iron Man'],
        ['Which role is played by Carrie Fisher in Star Wars?', 'Princess Leia'],
        ['Which role is played by Bryan Cranston in Breaking Bad?', 'Walter White'],
        ['Which role is played by Millie Bobby Brown in Stranger Things?', 'Eleven'],
        ['Which role is played by Jenna Ortega in Wednesday?', 'Wednesday Addams'],
        ['Which role is played by Hugh Jackman in X-Men?', 'Wolverine'],
        ["Which role is played by Margot Robbie in Greta Gerwig's 2023 hit?", 'Barbie'],
        ['Which role is played by Tom Hanks in Toy Story?', 'Woody'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'hard',
      tags: ['movies-tv', 'deep-cut-clues'],
      entries: [
        ['Which film includes the line "Here\'s Johnny!" and the Overlook Hotel?', 'The Shining'],
        ['Which series is set in Westview and shifts through sitcom eras?', 'WandaVision'],
        ['Which film follows a drummer pushed by Terence Fletcher?', 'Whiplash'],
        ['Which anthology series often ends with a futuristic moral twist?', 'Black Mirror'],
        ['Which film features The Bride seeking revenge on Bill?', 'Kill Bill'],
        ['Which series centers on a chemistry teacher turned meth producer in Albuquerque?', 'Breaking Bad'],
        ['Which animated film is set in San Fransokyo and features Baymax?', 'Big Hero 6'],
        ['Which film takes place mostly aboard the spaceship Nostromo?', 'Alien'],
        ['Which series follows a coach hired to lead AFC Richmond?', 'Ted Lasso'],
        ['Which film features a dream-sharing team led by Dom Cobb?', 'Inception'],
      ],
    }),
  ]
}

function buildMusicQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'easy',
      tags: ['music', 'songs'],
      entries: [
        ['Who recorded "Thriller"?', 'Michael Jackson'],
        ['Who recorded "Rolling in the Deep"?', 'Adele'],
        ['Who recorded "Shape of You"?', 'Ed Sheeran'],
        ['Who recorded "Like a Prayer"?', 'Madonna'],
        ['Who recorded "Purple Rain"?', 'Prince'],
        ['Who recorded "Halo"?', 'Beyonce'],
        ['Who recorded "Smells Like Teen Spirit"?', 'Nirvana'],
        ['Who recorded "Poker Face"?', 'Lady Gaga'],
        ['Who recorded "Blinding Lights"?', 'The Weeknd'],
        ['Who recorded "Respect"?', 'Aretha Franklin'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'easy',
      tags: ['music', 'albums'],
      entries: [
        ['Who released the album "1989"?', 'Taylor Swift'],
        ['Who released the album "Future Nostalgia"?', 'Dua Lipa'],
        ['Who released the album "The Joshua Tree"?', 'U2'],
        ['Who released the album "Back to Black"?', 'Amy Winehouse'],
        ['Who released the album "Rumours"?', 'Fleetwood Mac'],
        ['Who released the album "DAMN."?', 'Kendrick Lamar'],
        ['Who released the album "Born to Run"?', 'Bruce Springsteen'],
        ['Who released the album "A Night at the Opera"?', 'Queen'],
        ['Who released the album "Lemonade"?', 'Beyonce'],
        ['Who released the album "Random Access Memories"?', 'Daft Punk'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'medium',
      tags: ['music', 'classical'],
      entries: [
        ['Who composed The Four Seasons?', 'Antonio Vivaldi'],
        ['Who composed Moonlight Sonata?', 'Ludwig van Beethoven'],
        ['Who composed Swan Lake?', 'Pyotr Tchaikovsky'],
        ['Who composed Ride of the Valkyries?', 'Richard Wagner'],
        ['Who composed Clair de Lune?', 'Claude Debussy'],
        ['Who composed The Planets?', 'Gustav Holst'],
        ['Who composed Canon in D?', 'Johann Pachelbel'],
        ['Who composed The Blue Danube?', 'Johann Strauss II'],
        ['Who composed Carmina Burana?', 'Carl Orff'],
        ['Who composed The Marriage of Figaro?', 'Wolfgang Amadeus Mozart'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'medium',
      tags: ['music', 'instruments'],
      entries: [
        ['Which instrument has 88 keys on a standard acoustic model?', 'Piano'],
        ['Which brass instrument is often played with a mute in jazz?', 'Trumpet'],
        ['Which woodwind instrument uses a double reed and often tunes the orchestra?', 'Oboe'],
        ['Which string instrument is the smallest member of the standard string family?', 'Violin'],
        ['Which percussion instrument in a drum kit is played with a pedal?', 'Bass drum'],
        ['Which keyboard instrument is common in churches and uses foot pedals?', 'Organ'],
        ['Which instrument is held under the chin and is larger than a violin?', 'Viola'],
        ["Which large brass instrument loops around the player's body in marching bands?", 'Sousaphone'],
        ['Which free-reed instrument is often linked to tango music?', 'Bandoneon'],
        ['Which plucked instrument is central to many flamenco performances?', 'Guitar'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'hard',
      tags: ['music', 'genres'],
      entries: [
        ['Which genre blends improvisation, swing rhythms, and blue notes?', 'Jazz'],
        ['Which genre is built around Jamaican offbeat skank rhythms?', 'Reggae'],
        ['Which genre combines rapping with beat-driven production?', 'Hip-hop'],
        ['Which electronic dance genre is known for a four-on-the-floor beat?', 'House'],
        ['Which genre grew from rural American folk traditions and often features banjo?', 'Bluegrass'],
        ['Which genre is tied to the Mississippi Delta and twelve-bar progressions?', 'Blues'],
        ['Which genre combines classical technique with stories told in song?', 'Opera'],
        ['Which genre typically features distorted guitars and aggressive riffs?', 'Heavy metal'],
        ['Which genre emerged in South Korea and mixes pop, dance, and idol performances?', 'K-pop'],
        ['Which genre is known for a fast, stripped-down, rebellious rock sound?', 'Punk rock'],
      ],
    }),
  ]
}

function buildSportsQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'easy',
      tags: ['sports', 'events'],
      entries: [
        ['Which tennis tournament is played on grass at the All England Club?', 'Wimbledon'],
        ['Which cycling race ends on the Champs-Elysees?', 'Tour de France'],
        ["Which 50-over tournament crowns the men's cricket world champion?", 'Cricket World Cup'],
        ['Which golf competition pits Europe against the United States?', 'Ryder Cup'],
        ['Which horse race is the first leg of the American Triple Crown?', 'Kentucky Derby'],
        ['Which championship game crowns the NFL season?', 'Super Bowl'],
        ['Which multi-sport event is held every four years with a parade of nations?', 'Olympic Games'],
        ["Which football tournament crowns the men's world champion national team?", 'FIFA World Cup'],
        ['Which 26.2-mile road race is famous in Massachusetts?', 'Boston Marathon'],
        ["Which women's tennis team event was renamed in honor of Billie Jean King?", 'Billie Jean King Cup'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'easy',
      tags: ['sports', 'athletes'],
      entries: [
        ['Which Jamaican sprinter set world records in the 100m and 200m?', 'Usain Bolt'],
        ['Which swimmer won a record 23 Olympic gold medals?', 'Michael Phelps'],
        ['Which tennis player is nicknamed the King of Clay?', 'Rafael Nadal'],
        ['Which basketball legend was nicknamed Black Mamba?', 'Kobe Bryant'],
        ['Which boxer became the youngest heavyweight champion in history?', 'Mike Tyson'],
        ['Which gymnast won four gold medals at the 2016 Olympics?', 'Simone Biles'],
        ['Which footballer is commonly known as CR7?', 'Cristiano Ronaldo'],
        ['Which cricketer is often called the Master Blaster?', 'Sachin Tendulkar'],
        ["Which golfer has won the most men's major championships?", 'Jack Nicklaus'],
        ['Which Formula 1 driver matched seven world titles with Michael Schumacher?', 'Lewis Hamilton'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'medium',
      tags: ['sports', 'terms'],
      entries: [
        ['What is the term for three strikes in a row in bowling?', 'Turkey'],
        ['What is the term for a score of one under par in golf?', 'Birdie'],
        ['What is the term for restarting play from the corner arc in football?', 'Corner kick'],
        ['What is the basketball violation for moving without dribbling?', 'Traveling'],
        ['What is the term for a basket scored from beyond the arc?', 'Three-pointer'],
        ['What is the tennis term for a score of zero?', 'Love'],
        ['What is the term for carrying the ball into the end zone in American football?', 'Touchdown'],
        ['What is the extra period used to break ties in many sports called?', 'Overtime'],
        ['What is the bicycle segment in a triathlon called?', 'Cycling leg'],
        ['What is the bowling term for knocking down all ten pins with one ball?', 'Strike'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'medium',
      tags: ['sports', 'equipment'],
      entries: [
        ['Which piece of protective gear is worn on the head by cricket batters?', 'Helmet'],
        ['Which narrow blade is used in foil fencing?', 'Foil'],
        ['Which curved stick is used in field hockey?', 'Hockey stick'],
        ['Which board is used to ride waves in surfing?', 'Surfboard'],
        ['Which padded glove is used by baseball fielders?', 'Mitt'],
        ['Which item is used to hit the shuttlecock in badminton?', 'Racket'],
        ['Which bike component transfers pedal power to the rear wheel?', 'Chain'],
        ['Which small boat is common in sprint kayaking?', 'Kayak'],
        ['Which ball shape is used in rugby union?', 'Rugby ball'],
        ['Which long pole is used in pole vault?', 'Pole'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'hard',
      tags: ['sports', 'advanced-terms'],
      entries: [
        ['What is the cricket format limited to 20 overs per side called?', 'Twenty20'],
        ['What is the ten-event combined track and field contest called?', 'Decathlon'],
        ['What is the seven-event track and field contest commonly contested by women called?', 'Heptathlon'],
        ['What is the five-event modern Olympic combined discipline called?', 'Pentathlon'],
        ['What is it called when a player scores three goals in one game?', 'Hat-trick'],
        ['What is the term for winning all four major tennis tournaments in one calendar year?', 'Calendar Grand Slam'],
        ['What is the close finish decision aided by cameras called?', 'Photo finish'],
        ['What is the basketball violation for returning the ball to the backcourt?', 'Backcourt violation'],
        ['What baseball statistic is abbreviated as RBI?', 'Runs batted in'],
        ['What is the individual-against-the-clock stage in cycling called?', 'Time trial'],
      ],
    }),
  ]
}

function buildGamingQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'easy',
      tags: ['gaming', 'franchises'],
      entries: [
        ['Which series features Master Chief?', 'Halo'],
        ['Which series features Link exploring Hyrule?', 'The Legend of Zelda'],
        ['Which series stars bounty hunter Samus Aran?', 'Metroid'],
        ['Which series stars Kratos, the Ghost of Sparta?', 'God of War'],
        ['Which series features Pikachu and gym badges?', 'Pokemon'],
        ['Which series stars adventurer Lara Croft?', 'Tomb Raider'],
        ['Which series features soldier Marcus Fenix?', 'Gears of War'],
        ['Which series stars Geralt of Rivia?', 'The Witcher'],
        ['Which series stars the Blue Blur collecting rings?', 'Sonic the Hedgehog'],
        ['Which series stars Arthur Morgan in the fading American frontier?', 'Red Dead Redemption'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'easy',
      tags: ['gaming', 'consoles'],
      entries: [
        ['Which Nintendo console introduced detachable Joy-Con controllers?', 'Nintendo Switch'],
        ["Which Sony console launched with Astro's Playroom preinstalled?", 'PlayStation 5'],
        ['Which Microsoft console line started in 2001 with Halo?', 'Xbox'],
        ['Which handheld had two screens and a stylus?', 'Nintendo DS'],
        ['Which Nintendo system is commonly shortened to SNES?', 'Super Nintendo Entertainment System'],
        ['Which Sega console battled the SNES in the 1990s?', 'Sega Genesis'],
        ['Which Sony handheld used UMD discs?', 'PlayStation Portable'],
        ['Which Nintendo console sold widely with Wii Sports?', 'Wii'],
        ['Which 1985 Nintendo system revived the console market in North America?', 'Nintendo Entertainment System'],
        ['Which Atari console popularized cartridge-based home gaming?', 'Atari 2600'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'medium',
      tags: ['gaming', 'studios'],
      entries: [
        ['Which game was developed by Mojang and centers on blocks and crafting?', 'Minecraft'],
        ['Which game was developed by FromSoftware and features the Lands Between?', 'Elden Ring'],
        ['Which game was developed by Valve and stars Gordon Freeman?', 'Half-Life'],
        ['Which game was developed by Naughty Dog and follows Joel and Ellie?', 'The Last of Us'],
        ['Which game was developed by Supergiant Games and stars Zagreus?', 'Hades'],
        ['Which game was developed by CD Projekt Red and set in Night City?', 'Cyberpunk 2077'],
        ['Which game was developed by Respawn and features Titan pilots?', 'Titanfall'],
        ['Which game was developed by Nintendo EPD and stars an amnesiac hero in Hyrule?', 'The Legend of Zelda: Breath of the Wild'],
        ['Which farming game was developed by ConcernedApe?', 'Stardew Valley'],
        ['Which game by Team Cherry takes place in Hallownest?', 'Hollow Knight'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'medium',
      tags: ['gaming', 'locations-items'],
      entries: [
        ['In which game do players explore the region of Skyrim?', 'The Elder Scrolls V: Skyrim'],
        ['In which game is the city of Rapture found beneath the ocean?', 'BioShock'],
        ['In which game do trainers travel through Kanto collecting gym badges?', 'Pokemon Red and Blue'],
        ['In which game is Green Hill Zone a famous opening area?', 'Sonic the Hedgehog'],
        ["In which game do players survive nights at Freddy Fazbear's Pizza?", "Five Nights at Freddy's"],
        ['In which game do players build factories on Massage-2(AB)b?', 'Satisfactory'],
        ['In which game is Los Santos a major open-world setting?', 'Grand Theft Auto V'],
        ['In which game is City 17 the main setting?', 'Half-Life 2'],
        ['In which game do players wander the foggy town of Silent Hill?', 'Silent Hill 2'],
        ['In which game do test chambers belong to Aperture Science?', 'Portal'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'hard',
      tags: ['gaming', 'terms'],
      entries: [
        ['What do you call optional rewards unlocked after tough in-game tasks?', 'Achievement'],
        ['What is the random reward box mechanic criticized for gambling-like design called?', 'Loot box'],
        ["What is the perspective that shows the world through the character's eyes called?", 'First-person view'],
        ['What is the permanent-loss play style where death ends the run called?', 'Permadeath'],
        ['What game type is built around repeated runs and procedural variation?', 'Roguelike'],
        ['What ranked progression system lets players climb divisions through wins?', 'Ladder'],
        ['What hobby focuses on finishing games as fast as possible?', 'Speedrunning'],
        ['What branching conversation structure is often used in RPGs?', 'Dialogue tree'],
        ['What online networking approach predicts moves locally to reduce delay?', 'Rollback netcode'],
        ['What is the extra attempt after a game over traditionally called?', 'Continue'],
      ],
    }),
  ]
}

function buildScienceAndNatureQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'easy',
      tags: ['science-nature', 'space'],
      entries: [
        ['Which planet is known as the Red Planet?', 'Mars'],
        ['Which planet has the Great Red Spot?', 'Jupiter'],
        ['Which planet is famous for its visible rings?', 'Saturn'],
        ['Which dwarf planet lies in the Kuiper Belt and was once classified as a planet?', 'Pluto'],
        ['Which planet is closest to the Sun?', 'Mercury'],
        ["Which planet is often called Earth's twin because of its similar size?", 'Venus'],
        ['Which moon of Saturn has a thick atmosphere?', 'Titan'],
        ['Which body orbits Earth and drives most ocean tides?', 'Moon'],
        ['Which star sits at the center of our solar system?', 'Sun'],
        ['Which major planet is farthest from the Sun?', 'Neptune'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'easy',
      tags: ['science-nature', 'animals'],
      entries: [
        ['Which mammal lays eggs and has a duck-like bill?', 'Platypus'],
        ['Which bird is famous for mimicking human speech?', 'Parrot'],
        ['Which animal is the tallest land mammal?', 'Giraffe'],
        ['Which big cat has black rosette-like spots on orange fur?', 'Leopard'],
        ['Which marine mammal uses echolocation and lives in pods?', 'Dolphin'],
        ['Which flightless bird is native to Antarctica?', 'Penguin'],
        ['Which reptile can drop its tail to escape predators?', 'Gecko'],
        ['Which insect forms colonies around a queen?', 'Ant'],
        ['Which amphibian is known for croaking and jumping?', 'Frog'],
        ['Which animal is the largest living species on Earth?', 'Blue whale'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'medium',
      tags: ['science-nature', 'elements'],
      entries: [
        ['Which element has the chemical symbol O?', 'Oxygen'],
        ['Which element has the chemical symbol Au?', 'Gold'],
        ['Which element appears in both pencil graphite and diamonds?', 'Carbon'],
        ['Which element is the lightest gas and has the symbol H?', 'Hydrogen'],
        ['Which element with atomic number 26 is vital for hemoglobin?', 'Iron'],
        ['Which element with the symbol Na is part of table salt?', 'Sodium'],
        ['Which noble gas with the symbol Ne is used in bright signs?', 'Neon'],
        ['Which liquid metal at room temperature has the symbol Hg?', 'Mercury'],
        ['Which element with the symbol Ca is important for bones?', 'Calcium'],
        ['Which element with the symbol K is a key electrolyte?', 'Potassium'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'medium',
      tags: ['science-nature', 'body-biology'],
      entries: [
        ['Which organ pumps blood around the body?', 'Heart'],
        ['Which organ exchanges oxygen and carbon dioxide in the chest?', 'Lungs'],
        ['Which organ filters blood to produce urine?', 'Kidneys'],
        ['Which organ helps the body keep balance through the inner ear system?', 'Ear'],
        ['Which organ breaks down food with acid and enzymes?', 'Stomach'],
        ['Which organ detoxifies blood and produces bile?', 'Liver'],
        ['Which process allows plants to make food using sunlight?', 'Photosynthesis'],
        ['Which blood cells help fight infection?', 'White blood cells'],
        ['Which colored part of the eye controls light entry?', 'Iris'],
        ['Which organ controls thought and sends signals through the nervous system?', 'Brain'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'hard',
      tags: ['science-nature', 'phenomena'],
      entries: [
        ['What do you call water vapor cooling into liquid droplets on a surface?', 'Condensation'],
        ['What do you call the change from liquid water to gas?', 'Evaporation'],
        ['What is the shaking of the ground caused by crust movement called?', 'Earthquake'],
        ["What is molten rock on Earth's surface called?", 'Lava'],
        ['Which biome is dominated by conifer trees and long cold winters?', 'Taiga'],
        ['Which storm forms over warm oceans with rotating high winds?', 'Hurricane'],
        ['Which atmospheric layer contains most of the ozone layer?', 'Stratosphere'],
        ['What process gradually wears away rock by wind, water, or ice?', 'Erosion'],
        ['What do you call organisms interacting with each other and their environment?', 'Ecosystem'],
        ['What scale measures the acidity or alkalinity of a liquid?', 'pH scale'],
      ],
    }),
  ]
}

function buildHistoryAndCultureQuestions() {
  return [
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'easy',
      tags: ['history-culture', 'years'],
      entries: [
        ['In which year did World War II end?', '1945'],
        ['In which year did the Berlin Wall fall?', '1989'],
        ['In which year did the first moon landing occur?', '1969'],
        ['In which year was the United States Declaration of Independence signed?', '1776'],
        ['In which year did Nelson Mandela become president of South Africa?', '1994'],
        ['In which year did the Titanic sink?', '1912'],
        ['In which year did India gain independence?', '1947'],
        ['In which year did the French Revolution begin?', '1789'],
        ['In which year did the Western Roman Empire traditionally fall?', '476'],
        ['In which year was the Magna Carta sealed?', '1215'],
      ],
    }),
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'easy',
      tags: ['history-culture', 'figures'],
      entries: [
        ['Who was the first president of the United States?', 'George Washington'],
        ["Who led India's independence movement with nonviolent resistance?", 'Mahatma Gandhi'],
        ['Which Egyptian queen was linked with Julius Caesar and Mark Antony?', 'Cleopatra'],
        ['Who founded the Mongol Empire?', 'Genghis Khan'],
        ["Who was Britain's wartime prime minister during most of World War II?", 'Winston Churchill'],
        ['Which South African leader was imprisoned on Robben Island before becoming president?', 'Nelson Mandela'],
        ['Who gave the "I Have a Dream" speech?', 'Martin Luther King Jr.'],
        ['Which Macedonian king built a vast empire before age 33?', 'Alexander the Great'],
        ['Which French military leader crowned himself emperor in 1804?', 'Napoleon Bonaparte'],
        ['Which nurse was known as the Lady with the Lamp?', 'Florence Nightingale'],
      ],
    }),
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'medium',
      tags: ['history-culture', 'civilizations'],
      entries: [
        ['Which civilization built Machu Picchu?', 'Inca Empire'],
        ['Which ancient civilization used cuneiform in Mesopotamia?', 'Sumerians'],
        ['Which empire built the Colosseum?', 'Roman Empire'],
        ['Which civilization built most of the famous pyramids at Giza?', 'Ancient Egyptians'],
        ['Which seafaring civilization was centered on Crete?', 'Minoans'],
        ['Which civilization is known for city-states like Athens and Sparta?', 'Ancient Greeks'],
        ['Which civilization built many stepped pyramids in Mesoamerica?', 'Maya Civilization'],
        ['Which empire ruled from Constantinople after the eastern Roman split?', 'Byzantine Empire'],
        ['Which empire controlled large areas from Istanbul for centuries?', 'Ottoman Empire'],
        ['Which civilization built planned cities like Harappa and Mohenjo-daro?', 'Indus Valley Civilization'],
      ],
    }),
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'medium',
      tags: ['history-culture', 'events-movements'],
      entries: [
        ['Which agreement ended World War I?', 'Treaty of Versailles'],
        ['Which ship carried the Pilgrims to North America in 1620?', 'Mayflower'],
        ['Which trade network linked China with the Mediterranean?', 'Silk Road'],
        ['Which epidemic devastated Europe in the 14th century?', 'Black Death'],
        ['Which Soviet policy of openness was introduced by Mikhail Gorbachev?', 'Glasnost'],
        ['Which Soviet restructuring policy targeted the economy?', 'Perestroika'],
        ['Which cultural period spread from Italy across Europe?', 'Renaissance'],
        ['Which conflict between England and France lasted from 1337 to 1453?', "Hundred Years' War"],
        ['Which 1929 market collapse helped trigger the Great Depression?', 'Wall Street Crash'],
        ["Which movement campaigned widely for women's voting rights?", 'Suffrage movement'],
      ],
    }),
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'hard',
      tags: ['history-culture', 'places-structures'],
      entries: [
        ['Which wall marked the northern frontier of Roman Britain?', "Hadrian's Wall"],
        ['Which Chinese complex served as the imperial palace for Ming and Qing rulers?', 'Forbidden City'],
        ['Which Indian mausoleum was built by Shah Jahan for Mumtaz Mahal?', 'Taj Mahal'],
        ['Which French fortress-prison was stormed on July 14, 1789?', 'Bastille'],
        ['To which island was Napoleon first exiled in 1814?', 'Elba'],
        ['Which cathedral in Reims was a traditional coronation site for French kings?', 'Reims Cathedral'],
        ['Which ancient city was buried by Mount Vesuvius in AD 79?', 'Pompeii'],
        ['Which ancient Egyptian center of learning became world famous for its library?', 'Library of Alexandria'],
        ['Which Berlin landmark became a symbol of German reunification?', 'Brandenburg Gate'],
        ['Which palace in Saint Petersburg was once a tsarist residence and is now part of the Hermitage?', 'Winter Palace'],
      ],
    }),
  ]
}

function buildGeographyAndTravelQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'easy',
      tags: ['geography-travel', 'capitals'],
      entries: [
        ['What is the capital of France?', 'Paris'],
        ['What is the capital of Japan?', 'Tokyo'],
        ['What is the capital of Brazil?', 'Brasilia'],
        ['What is the capital of Canada?', 'Ottawa'],
        ['What is the capital of Australia?', 'Canberra'],
        ['What is the capital of Kenya?', 'Nairobi'],
        ['What is the capital of Egypt?', 'Cairo'],
        ['What is the capital of Argentina?', 'Buenos Aires'],
        ['What is the capital of Thailand?', 'Bangkok'],
        ['What is the capital of Turkey?', 'Ankara'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'easy',
      tags: ['geography-travel', 'landmarks'],
      entries: [
        ['Which country is home to Machu Picchu?', 'Peru'],
        ['Which country is home to the Eiffel Tower?', 'France'],
        ['Which country is home to the Great Wall?', 'China'],
        ['Which country is home to the Pyramids of Giza?', 'Egypt'],
        ['Which country is home to the Statue of Liberty?', 'United States'],
        ['Which country is home to Angkor Wat?', 'Cambodia'],
        ['Which country is home to Mount Kilimanjaro?', 'Tanzania'],
        ['Which country is home to Petra?', 'Jordan'],
        ['Which country is home to the Sydney Opera House?', 'Australia'],
        ['Which country is home to the Colosseum?', 'Italy'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'medium',
      tags: ['geography-travel', 'physical-geography'],
      entries: [
        ['Which ocean lies between Africa and Australia?', 'Indian Ocean'],
        ['Which river flows through Egypt into the Mediterranean?', 'Nile'],
        ['Which sea borders Jordan and Israel and is famous for high salinity?', 'Dead Sea'],
        ['Which river runs through Paris?', 'Seine'],
        ['Which strait separates Asia from North America?', 'Bering Strait'],
        ["Which lake lies between Peru and Bolivia and is among the world's highest navigable lakes?", 'Lake Titicaca'],
        ['Which mountain range includes Mount Everest?', 'Himalayas'],
        ['Which desert covers much of northern Africa?', 'Sahara Desert'],
        ['Which waterfall system lies on the border of Zambia and Zimbabwe?', 'Victoria Falls'],
        ['Which gulf lies south of the United States and east of Mexico?', 'Gulf of Mexico'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'medium',
      tags: ['geography-travel', 'country-clues'],
      entries: [
        ['Which country is both an island and a continent?', 'Australia'],
        ['Which country is known as the Land of the Rising Sun?', 'Japan'],
        ['Which country has Wellington as its capital?', 'New Zealand'],
        ['Which country shares the Iberian Peninsula with Spain?', 'Portugal'],
        ['Which country is famously shaped like a boot?', 'Italy'],
        ['Which country includes the city of Marrakech?', 'Morocco'],
        ['Which country includes the region of Bavaria?', 'Germany'],
        ['Which country is famous for fjords near Bergen?', 'Norway'],
        ['Which country lies directly south of the United States?', 'Mexico'],
        ['Which country has Helsinki as its capital?', 'Finland'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'hard',
      tags: ['geography-travel', 'cities'],
      entries: [
        ['Which city is nicknamed the Big Apple?', 'New York City'],
        ['Which city hosted the 2016 Summer Olympics?', 'Rio de Janeiro'],
        ['Which city is built around canals and gondolas in northeastern Italy?', 'Venice'],
        ['Which city is home to the Acropolis?', 'Athens'],
        ['Which city is often called the Eternal City?', 'Rome'],
        ['Which city contains the Burj Khalifa?', 'Dubai'],
        ['Which city is famous for Shibuya Crossing?', 'Tokyo'],
        ['Which city is the capital of South Korea?', 'Seoul'],
        ['Which city lies on both Europe and Asia along the Bosporus?', 'Istanbul'],
        ['Which French city hosts a major seat of the European Parliament?', 'Strasbourg'],
      ],
    }),
  ]
}

function buildInternetAndTechQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'easy',
      tags: ['internet-tech', 'products'],
      entries: [
        ['Which company introduced the iPhone?', 'Apple'],
        ['Which company makes Windows?', 'Microsoft'],
        ['Which company develops Android?', 'Google'],
        ['Which company makes Photoshop?', 'Adobe'],
        ['Which company owns Prime Video?', 'Amazon'],
        ['Which company owns WhatsApp?', 'Meta'],
        ['Which company is behind Salesforce CRM?', 'Salesforce'],
        ['Which company operates Spotify?', 'Spotify'],
        ['Which company is behind the Zoom video app?', 'Zoom'],
        ['Which company develops Firefox?', 'Mozilla'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'easy',
      tags: ['internet-tech', 'languages'],
      entries: [
        ['Which language is known for significant whitespace and `print("Hello")` examples?', 'Python'],
        ['Which language runs in browsers and also in Node.js?', 'JavaScript'],
        ['Which language is central to many iOS apps with SwiftUI?', 'Swift'],
        ['Which language was created by Bjarne Stroustrup as an extension of C?', 'C++'],
        ['Which language is the main query language for relational databases?', 'SQL'],
        ['Which language runs on the JVM and shares its name with an island?', 'Java'],
        ['Which language is known for ownership rules in systems programming?', 'Rust'],
        ['Which language powers Ruby on Rails apps?', 'Ruby'],
        ['Which language is common in statistics with packages like ggplot2?', 'R'],
        ['Which language compiles to BEAM and builds on Erlang?', 'Elixir'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'medium',
      tags: ['internet-tech', 'acronyms'],
      entries: [
        ['What does CPU stand for?', 'Central Processing Unit'],
        ['What does GPU stand for?', 'Graphics Processing Unit'],
        ['What does URL stand for?', 'Uniform Resource Locator'],
        ['What does HTML stand for?', 'HyperText Markup Language'],
        ['What does CSS stand for?', 'Cascading Style Sheets'],
        ['What does API stand for?', 'Application Programming Interface'],
        ['What does VPN stand for?', 'Virtual Private Network'],
        ['What does RAM stand for?', 'Random Access Memory'],
        ['What does USB stand for?', 'Universal Serial Bus'],
        ['What does DNS stand for?', 'Domain Name System'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'medium',
      tags: ['internet-tech', 'concepts'],
      entries: [
        ['What do you call software released with source code available for inspection and modification?', 'Open source'],
        ['What is the standard browser error page for a missing path called?', '404 Not Found'],
        ['What is the term for unwanted bulk email?', 'Spam'],
        ['What is the secure version of HTTP called?', 'HTTPS'],
        ['What is the practice of verifying identity with a second factor beyond a password?', 'Multi-factor authentication'],
        ['What small browser file stores session and preference data?', 'Cookie'],
        ['What is the term for storing data on remote internet-connected servers?', 'Cloud computing'],
        ['What kind of database stores data in linked tables?', 'Relational database'],
        ['What malicious program demands payment to restore access?', 'Ransomware'],
        ['What square-pattern code is commonly scanned with phones?', 'QR code'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'hard',
      tags: ['internet-tech', 'tools-protocols'],
      entries: [
        ['Which repository platform owned by Microsoft uses pull requests?', 'GitHub'],
        ['Which search engine is known for privacy and a duck logo?', 'DuckDuckGo'],
        ['Which browser is the open-source flagship from Mozilla?', 'Firefox'],
        ['Which collaborative design tool is popular for live interface mockups?', 'Figma'],
        ['Which Linux distribution is known for `apt` and common server use?', 'Ubuntu'],
        ['Which platform popularized images, containers, and Dockerfiles?', 'Docker'],
        ['Which protocol is commonly used to send email between mail servers?', 'SMTP'],
        ['Which encrypted protocol is used for remote shell access and secure file transfer?', 'SSH'],
        ['Which short-range wireless standard powers tap-to-pay chips?', 'NFC'],
        ['Which spreadsheet application uses `.xlsx` files by default?', 'Excel'],
      ],
    }),
  ]
}

function buildFoodAndLifestyleQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'easy',
      tags: ['food-lifestyle', 'origins'],
      entries: [
        ['Which country is most closely associated with sushi?', 'Japan'],
        ['Which country is most closely associated with tacos?', 'Mexico'],
        ['Which country is most closely associated with paella?', 'Spain'],
        ['Which country is most closely associated with kimchi?', 'South Korea'],
        ['Which country is most closely associated with poutine?', 'Canada'],
        ['Which country is most closely associated with hummus?', 'Lebanon'],
        ['Which country is most closely associated with croissants?', 'France'],
        ['Which country is most closely associated with feijoada?', 'Brazil'],
        ['Which country is most closely associated with goulash?', 'Hungary'],
        ['Which country is most closely associated with biryani?', 'India'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'easy',
      tags: ['food-lifestyle', 'ingredients'],
      entries: [
        ['Which fruit is the main ingredient in guacamole?', 'Avocado'],
        ['Which bean is used to make tofu?', 'Soybean'],
        ['Which rice is classically used in risotto?', 'Arborio rice'],
        ['Which spice is famous for giving many curries a yellow color?', 'Turmeric'],
        ['Which ingredient is processed into chocolate?', 'Cacao'],
        ['Which legume is the base of many hummus recipes?', 'Chickpea'],
        ['Which spice comes from the inner bark of certain trees?', 'Cinnamon'],
        ['Which herb is common in pesto?', 'Basil'],
        ['Which pulse is commonly used in dals and hearty soups?', 'Lentil'],
        ['Which grain is rolled to make classic oatmeal?', 'Oat'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'medium',
      tags: ['food-lifestyle', 'kitchen-tools'],
      entries: [
        ['Which kitchen tool is used to strain pasta?', 'Colander'],
        ['Which tool removes fine citrus peel in thin strips?', 'Zester'],
        ['Which flat heavy pan is used to grill flatbreads and tortillas?', 'Griddle'],
        ['Which device whips ingredients with rotating beaters?', 'Hand mixer'],
        ['Which tool rolls pastry into thin sheets?', 'Rolling pin'],
        ['Which tool presses cooked potatoes through small holes for a smooth texture?', 'Potato ricer'],
        ['Which fine grater is often used for Parmesan and citrus?', 'Microplane'],
        ['Which device measures the real temperature inside an oven?', 'Oven thermometer'],
        ['Which kitchen tool helps separate yolks from whites?', 'Egg separator'],
        ['Which tool removes the center of an apple?', 'Apple corer'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'medium',
      tags: ['food-lifestyle', 'cooking-methods'],
      entries: [
        ['Which method browns food quickly in a little hot oil while stirring?', 'Sauteing'],
        ['Which method cooks food slowly in liquid just below boiling?', 'Simmering'],
        ['Which method uses dry oven heat for vegetables or meat?', 'Roasting'],
        ['Which method cooks food over water vapor?', 'Steaming'],
        ['Which method submerges food in hot oil until crisp?', 'Deep-frying'],
        ['Which method cooks meat low and slow with smoke?', 'Smoking'],
        ['Which method reduces food into powder with a mortar and pestle?', 'Grinding'],
        ['Which method cooks vacuum-sealed food in a controlled water bath?', 'Sous vide'],
        ['Which pastry technique cuts fat into flour for a crumbly texture?', 'Cut-in method'],
        ['Which preserving method stores vegetables in brine or vinegar?', 'Pickling'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'hard',
      tags: ['food-lifestyle', 'dishes-drinks'],
      entries: [
        ['Which Italian dessert layers coffee-soaked ladyfingers with mascarpone?', 'Tiramisu'],
        ['Which powdered Japanese green tea is whisked into a frothy drink?', 'Matcha'],
        ['Which dessert uses filo pastry, nuts, and syrup?', 'Baklava'],
        ['Which chilled Spanish soup is tomato-based and often served in summer?', 'Gazpacho'],
        ['Which sparkling Italian wine is often used for mimosas?', 'Prosecco'],
        ['Which South Asian yogurt-based drink can be sweet or salty?', 'Lassi'],
        ['Which French dessert has a brittle sugar top over custard?', 'Creme brulee'],
        ['Which coffee drink combines espresso and steamed milk with light foam?', 'Latte'],
        ['Which Mexican sauce often includes chilies and chocolate?', 'Mole'],
        ['Which Swiss dish melts cheese for dipping bread and vegetables?', 'Fondue'],
      ],
    }),
  ]
}

export const triviaSeedQuestions = [
  ...buildMoviesAndTvQuestions(),
  ...buildMusicQuestions(),
  ...buildSportsQuestions(),
  ...buildGamingQuestions(),
  ...buildScienceAndNatureQuestions(),
  ...buildHistoryAndCultureQuestions(),
  ...buildGeographyAndTravelQuestions(),
  ...buildInternetAndTechQuestions(),
  ...buildFoodAndLifestyleQuestions(),
]

const categoryCounts = new Map<SeedCategory, number>()

for (const category of CATEGORIES) {
  categoryCounts.set(category, 0)
}

for (const question of triviaSeedQuestions) {
  categoryCounts.set(question.category, (categoryCounts.get(question.category) ?? 0) + 1)
}

for (const category of CATEGORIES) {
  if (categoryCounts.get(category) !== 50) {
    throw new Error(`Expected 50 trivia seed questions for ${category}, received ${categoryCounts.get(category) ?? 0}.`)
  }
}
