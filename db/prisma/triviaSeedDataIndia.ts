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
  region: 'india'
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
    }),
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

  // Include region in the normalized hash so Indian and international
  // seeds never collide on the unique `hash` column — even when a question
  // string happens to be identical across the two pools.
  const normalizedHash = JSON.stringify({
    region: 'india',
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
    region: 'india',
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
        .filter((tag) => tag.length > 0),
    ),
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
      tags: ['bollywood', 'hindi-films', 'blockbusters'],
      entries: [
        ['Shah Rukh Khan played Raj Malhotra in which 1995 romantic blockbuster?', 'Dilwale Dulhania Le Jayenge'],
        ['Aamir Khan played Phunsukh Wangdu in which 2009 film?', '3 Idiots'],
        ['Rajkumar Hirani directed which film starring Aamir Khan as an alien named PK?', 'PK'],
        ['Kabhi Khushi Kabhie Gham was directed by which filmmaker?', 'Karan Johar'],
        ['Which 2001 Aamir Khan film about cricket was Oscar-nominated?', 'Lagaan'],
        ['Ranbir Kapoor played Jordan in which 2011 musical drama?', 'Rockstar'],
        ['Which 2013 Deepika Padukone and Ranveer Singh film was directed by Sanjay Leela Bhansali?', 'Goliyon Ki Raasleela Ram-Leela'],
        ['Which Salman Khan action franchise started in 2010 with a film named after a policeman?', 'Dabangg'],
        ['Which Shah Rukh Khan film features him as an NRI businessman returning to India in 2004?', 'Swades'],
        ['Which 2016 Aamir Khan film is based on the lives of the Phogat wrestling sisters?', 'Dangal'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'easy',
      tags: ['south-indian-cinema', 'telugu', 'tamil'],
      entries: [
        ['Rajamouli directed which two-part Telugu epic starring Prabhas?', 'Baahubali'],
        ['Which 2022 Telugu action drama starring Ram Charan and NTR Jr won an Oscar for Best Original Song?', 'RRR'],
        ['"Naatu Naatu" is a song from which Indian film?', 'RRR'],
        ['Rajinikanth played a robot named Chitti in which 2010 Tamil science-fiction film?', 'Enthiran'],
        ['Which 2018 Tamil gangster drama starring Rajinikanth was directed by Pa. Ranjith?', 'Kaala'],
        ['Which 2022 Kannada film directed by Prashanth Neel stars Yash as a gold smuggler?', 'KGF: Chapter 2'],
        ['Which 2022 Malayalam political drama stars Mammootty as a chief minister?', 'Bheeshma Parvam'],
        ['Which Tamil film starring Vijay Sethupathi and Fahadh Faasil was released in 2022?', 'Vikram'],
        ['Which 2023 pan-India Telugu film stars Prabhas and Kriti Sanon in a mythological love story?', 'Adipurush'],
        ['Which Mani Ratnam epic released in 2022 is based on a Kalki Krishnamurthy novel?', 'Ponniyin Selvan: I'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'medium',
      tags: ['bollywood-actors', 'legends'],
      entries: [
        ['Who played the lead role in the 1975 film Sholay as Jai?', 'Amitabh Bachchan'],
        ['Which actor earned the title Tragedy King of Hindi cinema?', 'Dilip Kumar'],
        ['Who played Paro in Sanjay Leela Bhansali\u2019s Devdas (2002)?', 'Aishwarya Rai'],
        ['Who was the first Indian actress to win a Miss World title in 1994?', 'Aishwarya Rai'],
        ['Who is known as the Shahenshah of Bollywood and starred in Don?', 'Amitabh Bachchan'],
        ['Which actress starred in Chandni and Lamhe and is called the first female superstar of Hindi cinema?', 'Sridevi'],
        ['Which actor played Veeru opposite Amitabh Bachchan in Sholay?', 'Dharmendra'],
        ['Which Khan is nicknamed Bhaijaan and hosts Bigg Boss?', 'Salman Khan'],
        ['Which actress headlined Mother India (1957) as Radha?', 'Nargis'],
        ['Which actor directed and starred in Guide and Jewel Thief?', 'Dev Anand'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'medium',
      tags: ['bollywood-directors', 'auteurs'],
      entries: [
        ['Who directed the 1960 historical epic Mughal-e-Azam?', 'K. Asif'],
        ['Who directed Sholay, Zanjeer\u2019s screenwriter team, and later Mr. India\u2019s story?', 'Ramesh Sippy'],
        ['Which filmmaker is famous for Black, Devdas, and Bajirao Mastani?', 'Sanjay Leela Bhansali'],
        ['Which director is known for DDLJ, Dharma Productions, and Koffee with Karan?', 'Karan Johar'],
        ['Who directed the 2015 crime drama NH10 and produced Love Aaj Kal?', 'Anushka Sharma'],
        ['Which auteur directed Pather Panchali, Aparajito, and Apur Sansar?', 'Satyajit Ray'],
        ['Which filmmaker directed Lagaan, Taare Zameen Par, and Laapataa Ladies?', 'Aamir Khan'],
        ['Which director gave Hindi cinema Gangs of Wasseypur and Sacred Games?', 'Anurag Kashyap'],
        ['Which Malayalam auteur directed Drishyam (2013)?', 'Jeethu Joseph'],
        ['Which director made Bombay (1995) and Dil Se? (1998)', 'Mani Ratnam'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Movies & TV',
      difficulty: 'hard',
      tags: ['classic-cinema', 'parallel-cinema'],
      entries: [
        ['Who directed the 1960 classic Mughal-e-Azam released in color in 2004?', 'K. Asif'],
        ['Guru Dutt directed which 1957 film about a struggling poet?', 'Pyaasa'],
        ['Which 1953 Bimal Roy film about a rickshaw puller won at Cannes?', 'Do Bigha Zamin'],
        ['Who directed Garam Hawa, a partition classic from 1973?', 'M.S. Sathyu'],
        ['Which Raj Kapoor film features the song Mera Joota Hai Japani?', 'Shree 420'],
        ['Which parallel cinema film by Shyam Benegal stars Shabana Azmi as a village lower-caste woman?', 'Ankur'],
        ['Which Satyajit Ray film completes the Apu Trilogy after Pather Panchali and Aparajito?', 'Apur Sansar'],
        ['Who directed the 1969 film Bhuvan Shome that launched the Indian New Wave?', 'Mrinal Sen'],
        ['Which 1987 Shekhar Kapur film is based on the life of a bandit queen?', 'Bandit Queen'],
        ['Which 1961 Bimal Roy film stars Dilip Kumar in a double role with Vyjayanthimala?', 'Gunga Jumna'],
      ],
    }),
  ]
}

function buildMusicQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'easy',
      tags: ['playback-singers', 'legends'],
      entries: [
        ['Who is called the Nightingale of India and sang for seven decades?', 'Lata Mangeshkar'],
        ['Who sang "Kuch Kuch Hota Hai" and is Lata Mangeshkar\u2019s younger sister?', 'Asha Bhosle'],
        ['Who is nicknamed the Sehra of Bollywood and sang the melody Mere Sapno Ki Rani?', 'Kishore Kumar'],
        ['Which playback singer sang most Rajesh Khanna songs of the 70s?', 'Kishore Kumar'],
        ['Who sang iconic ghazals with Jagjit Singh and was his wife?', 'Chitra Singh'],
        ['Which male singer sang Gulabi Aankhen Jo Teri Dekhi?', 'Mohammed Rafi'],
        ['Who sang Chura Liya Hai Tumne Jo Dil Ko with Mohammed Rafi?', 'Asha Bhosle'],
        ['Who sang the Hindi version of Jai Ho from Slumdog Millionaire?', 'Sukhwinder Singh'],
        ['Who sang Tujhe Dekha To Ye Jaana Sanam from DDLJ?', 'Lata Mangeshkar'],
        ['Who sang Pal Pal Dil Ke Paas in the original 1973 film Blackmail?', 'Kishore Kumar'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'easy',
      tags: ['composers', 'film-music'],
      entries: [
        ['Who composed music for Roja, Bombay, and Slumdog Millionaire?', 'A.R. Rahman'],
        ['Which duo composed songs for Dil Chahta Hai and Rock On?', 'Shankar-Ehsaan-Loy'],
        ['Who composed the background score for Baahubali and RRR?', 'M.M. Keeravani'],
        ['Which composer created Sholay\u2019s iconic soundtrack with R.D. Burman?', 'R.D. Burman'],
        ['Who composed the music for Mughal-e-Azam?', 'Naushad'],
        ['Which duo is famous for Karz, Satyam Shivam Sundaram, and Hero?', 'Laxmikant-Pyarelal'],
        ['Which composer was known for ghazal-based film scores in the 70s and 80s?', 'Khayyam'],
        ['Who composed the music of Dilwale Dulhania Le Jayenge?', 'Jatin-Lalit'],
        ['Who composed the score for the 2001 film Lagaan?', 'A.R. Rahman'],
        ['Who composed the music for the TV series Mahabharat (1988)?', 'Rajkamal'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'medium',
      tags: ['classical', 'hindustani-carnatic'],
      entries: [
        ['Which classical vocalist is famous for his thumris and the Benaras gharana?', 'Pandit Jasraj'],
        ['Who played the sitar at Woodstock and is the father of Norah Jones and Anoushka?', 'Ravi Shankar'],
        ['Which legendary sarod maestro had sons Amaan Ali Bangash and Ayaan Ali Bangash?', 'Amjad Ali Khan'],
        ['Which classical vocalist was a leader of the Jaipur-Atrauli gharana?', 'Kishori Amonkar'],
        ['Who is a renowned Carnatic vocalist and the first Indian musician awarded the Bharat Ratna (1998)?', 'M.S. Subbulakshmi'],
        ['Which flautist popularised Hindustani classical bansuri globally?', 'Hariprasad Chaurasia'],
        ['Which tabla maestro collaborated with John McLaughlin in Shakti?', 'Zakir Hussain'],
        ['Which santoor maestro popularised the instrument in Hindustani classical music?', 'Shivkumar Sharma'],
        ['Which Carnatic composer is considered one of the Trinity along with Dikshitar and Syama Sastri?', 'Tyagaraja'],
        ['Which shehnai maestro was a Bharat Ratna awardee in 2001?', 'Bismillah Khan'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'medium',
      tags: ['indian-pop', 'indie'],
      entries: [
        ['Which band by Farhan Akhtar, Arjun Rampal, and Luke Kenny appeared in Rock On!!?', 'Magik'],
        ['Which Punjabi rapper released "Ban" and "Brown Munde"?', 'AP Dhillon'],
        ['Which indie artist sang "Aashiyan" and "Sun Raha Hai" (male)?', 'Ankit Tiwari'],
        ['Which indie singer-songwriter released the album Amit Trivedi Unplugged?', 'Amit Trivedi'],
        ['Which folk-fusion band from Rajasthan is fronted by Bhanwari Devi?', 'Manganiyar'],
        ['Which rapper released the album "Still Rollin" in 2023?', 'Shubh'],
        ['Which artist rose to fame with the track "Makhna" in 1998?', 'Yo Yo Honey Singh'],
        ['Which singer is known as the Queen of Sufi in India?', 'Kavita Seth'],
        ['Which Coke Studio India season featured AR Rahman as producer?', 'Season 1'],
        ['Which Indian rock band from Delhi released Roobaroo?', 'Agnee'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Music',
      difficulty: 'hard',
      tags: ['music-history', 'instruments'],
      entries: [
        ['Which Indian classical instrument has 11 to 22 sympathetic strings under the main strings?', 'Sitar'],
        ['Which instrument is played by striking the strings with wooden hammers and is prominent in Kashmir?', 'Santoor'],
        ['Which Indian double-reed instrument is associated with weddings and temple music?', 'Shehnai'],
        ['Which percussion instrument comes in a pair and is essential to Hindustani classical music?', 'Tabla'],
        ['Which ancient south Indian string instrument is traditionally played seated with seven main strings?', 'Veena'],
        ['Which fretless string instrument does Amjad Ali Khan play?', 'Sarod'],
        ['Which two-headed barrel drum is central to Carnatic music?', 'Mridangam'],
        ['Which wind instrument is a bamboo flute used in Hindustani classical?', 'Bansuri'],
        ['Which drone instrument provides continuous pitch in Indian classical performances?', 'Tanpura'],
        ['Which Rabindranath Tagore song is India\u2019s national anthem?', 'Jana Gana Mana'],
      ],
    }),
  ]
}

function buildSportsQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'easy',
      tags: ['cricket', 'indian-team'],
      entries: [
        ['Who is nicknamed the Master Blaster and scored the first ODI double century?', 'Sachin Tendulkar'],
        ['Who captained India to the 2011 ICC Cricket World Cup title?', 'MS Dhoni'],
        ['Who captained India to the 1983 World Cup title?', 'Kapil Dev'],
        ['Which wicketkeeper-batter scored a World Cup-winning six in the 2011 final?', 'MS Dhoni'],
        ['Who holds the record for the most runs in Test cricket for India?', 'Sachin Tendulkar'],
        ['Which Indian spinner is nicknamed the Turbanator?', 'Harbhajan Singh'],
        ['Which Indian pacer is known as the Thunderbolt and played in the 1983 World Cup?', 'Kapil Dev'],
        ['Who captained India to the 2007 T20 World Cup title?', 'MS Dhoni'],
        ['Who was the first Indian to score a triple century in Tests?', 'Virender Sehwag'],
        ['Which Indian fast bowler is nicknamed The Boom Boom in IPL commentary?', 'Jasprit Bumrah'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'easy',
      tags: ['ipl', 't20-leagues'],
      entries: [
        ['Which IPL franchise is owned by Shah Rukh Khan?', 'Kolkata Knight Riders'],
        ['Which IPL franchise has won five IPL titles under MS Dhoni\u2019s leadership through 2023?', 'Chennai Super Kings'],
        ['Which Mumbai-based franchise has won five IPL titles?', 'Mumbai Indians'],
        ['Who is the all-time leading run scorer in IPL history?', 'Virat Kohli'],
        ['Which IPL team did Virat Kohli captain until 2021?', 'Royal Challengers Bangalore'],
        ['Which team won the inaugural 2008 IPL?', 'Rajasthan Royals'],
        ['Which left-arm spinner was captain of Mumbai Indians before Rohit Sharma?', 'Harbhajan Singh'],
        ['Which player has hit the most sixes in IPL history through 2023?', 'Chris Gayle'],
        ['Which Pune-based IPL franchise lifted a trophy in 2016?', 'Rising Pune Supergiant'],
        ['Which former India captain led Sunrisers Hyderabad to their 2016 IPL title?', 'David Warner'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'medium',
      tags: ['olympics', 'individual-medalists'],
      entries: [
        ['Who won India\u2019s first individual Olympic gold in 2008?', 'Abhinav Bindra'],
        ['Who won gold in javelin at the Tokyo 2020 Olympics?', 'Neeraj Chopra'],
        ['Which female wrestler won bronze at Rio 2016?', 'Sakshi Malik'],
        ['Which Indian shuttler won silver at Rio 2016?', 'PV Sindhu'],
        ['Which boxer won bronze at the 2012 London Olympics for India?', 'MC Mary Kom'],
        ['Which wrestler won silver for India at Tokyo 2020?', 'Ravi Kumar Dahiya'],
        ['Who was the first Indian woman to win an individual Olympic medal (bronze in 2000)?', 'Karnam Malleswari'],
        ['Which shooter won silver at London 2012?', 'Vijay Kumar'],
        ['Which Indian hockey legend is called The Wizard?', 'Dhyan Chand'],
        ['Which Indian shooter won a silver medal at Beijing 2008 in trap?', 'Vijay Kumar'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'medium',
      tags: ['badminton', 'tennis', 'other-sports'],
      entries: [
        ['Which Indian shuttler won the World Championship gold in 2019?', 'PV Sindhu'],
        ['Which Indian is nicknamed the Punekar Rocket in badminton?', 'Saina Nehwal'],
        ['Which tennis player paired with Mahesh Bhupathi to win Grand Slam doubles titles?', 'Leander Paes'],
        ['Which Indian chess player is the first grandmaster from India?', 'Viswanathan Anand'],
        ['Who won the FIDE World Chess Championship five times for India?', 'Viswanathan Anand'],
        ['Which Indian boxer fought as Magnificent Mary in the ring?', 'MC Mary Kom'],
        ['Which Indian football club has won the most I-League titles through 2020?', 'East Bengal'],
        ['Which Indian was called The Flying Sikh after narrowly missing bronze in 1960 Rome Olympics?', 'Milkha Singh'],
        ['Who is nicknamed Payyoli Express and won Asian Games medals in the 80s?', 'PT Usha'],
        ['Which Indian tennis player won the US Open junior title in 1989 and later men\u2019s doubles majors?', 'Leander Paes'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Sports',
      difficulty: 'hard',
      tags: ['cricket-records', 'history'],
      entries: [
        ['Who scored the first ODI double century, against South Africa in 2010?', 'Sachin Tendulkar'],
        ['Who scored the fastest Test double century by an Indian (against Sri Lanka, 2017)?', 'Virender Sehwag'],
        ['Which Indian captain scored a century on Test debut in 1989?', 'Mohammad Azharuddin'],
        ['Who is the only Indian to take all 10 wickets in a Test innings?', 'Anil Kumble'],
        ['Which Indian batter holds the record for most ODI hundreds?', 'Sachin Tendulkar'],
        ['Who was the first Indian to hit six sixes in an over in T20 internationals?', 'Yuvraj Singh'],
        ['Who won the 2002 ICC Champions Trophy with India as joint winner?', 'Sri Lanka'],
        ['Which Indian became the first captain to win every ICC white-ball trophy through 2024?', 'Rohit Sharma'],
        ['Who is the first Indian cricketer to be knighted or receive the Rajiv Gandhi Khel Ratna?', 'Viswanathan Anand'],
        ['Which Indian batter has the record for most Tests played (through 2013)?', 'Sachin Tendulkar'],
      ],
    }),
  ]
}

function buildGamingQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'easy',
      tags: ['bgmi', 'battle-royale'],
      entries: [
        ['Which battle royale launched in India in 2021 is published by Krafton for Indian users?', 'Battlegrounds Mobile India'],
        ['Which game replaced PUBG Mobile in India after it was banned in 2020?', 'Battlegrounds Mobile India'],
        ['Which popular battle royale by Garena was banned in India in 2022?', 'Free Fire'],
        ['Which Indian streamer popularised BGMI and is known as Dynamo?', 'Aaditya Sawant'],
        ['Which Indian BGMI player is a co-owner of Team Xspark?', 'Scout'],
        ['Which Indian streamer is known as Mortal?', 'Naman Mathur'],
        ['Which team won the BGMI Masters Series 2022 in India?', 'Team SouL'],
        ['Which BGMI team is owned by CarryMinati?', 'S8UL'],
        ['Which mobile game by Activision is popular in Indian esports and features multiplayer modes?', 'Call of Duty: Mobile'],
        ['Which battle royale by Epic Games is popular globally and in India?', 'Fortnite'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'easy',
      tags: ['youtubers', 'content-creators'],
      entries: [
        ['Which Indian YouTuber is known for Minecraft content as LOLiT?', 'Gamerfleet'],
        ['Which creator is behind the CarryIsLive gaming channel?', 'Ajey Nagar'],
        ['Which Indian YouTuber popularised GTA RP with his channel Techno Gamerz?', 'Ujjwal Chaurasia'],
        ['Which Indian creator is famous for GTA V videos as Chaos?', 'Techno Gamerz'],
        ['Which Indian streamer runs the channel Lakshay Chaudhary?', 'Lakshay Chaudhary'],
        ['Which Indian creator is one of the most popular Minecraft streamers as Notgonnalie?', 'Thara Bhai Joginder'],
        ['Which Indian content creator hosts Republic of Gamers tournaments and streams BGMI?', 'Tanmay Singh'],
        ['Which creator is known as Total Gaming and hid his face for years?', 'Ajay'],
        ['Which Indian esports team ran the YouTube channel Team SouL?', 'Team SouL'],
        ['Which creator streams Valorant as GodLike Esports founder?', 'GodLike Esports'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'medium',
      tags: ['indian-game-studios', 'indigenous'],
      entries: [
        ['Which Indian studio made the ASCII-art dungeon crawler Asura?', 'Ogre Head Studio'],
        ['Which Bangalore studio made Raji: An Ancient Epic?', 'Nodding Heads Games'],
        ['Which Indian game from 2020 was a Nintendo Indie World highlight?', 'Raji: An Ancient Epic'],
        ['Which Hyderabad studio published Dr. Driving?', 'SUD Inc.'],
        ['Which popular Indian mobile cricket game was published by Nextwave Multimedia?', 'World Cricket Championship'],
        ['Which Indian studio developed Real Cricket?', 'Nautilus Mobile'],
        ['Which Indian game development engine is widely used and launched by Unity in Pune?', 'Unity'],
        ['Which Delhi studio made the strategy game Missile Command (Indian variant)?', 'Yellow Monkey Studios'],
        ['Which gaming company is headquartered in Bengaluru and known for Moonfrog Labs hits?', 'Moonfrog Labs'],
        ['Which Indian mythology-inspired action game was made by Nodding Heads Games?', 'Raji: An Ancient Epic'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'medium',
      tags: ['esports-tournaments', 'titles'],
      entries: [
        ['Which MOBA by Krafton launched globally is popular in Indian esports?', 'Valorant'],
        ['Which FPS by Riot is a big Indian esports title through 2024?', 'Valorant'],
        ['Which Indian Valorant team is owned by Gods Reign?', 'Gods Reign'],
        ['Which cross-platform FIFA football title is widely played in Indian cafes?', 'FIFA'],
        ['Which Supercell mobile strategy game is hugely popular in India?', 'Clash of Clans'],
        ['Which mobile MOBA by Moonton is played across India?', 'Mobile Legends: Bang Bang'],
        ['Which card game by Hearthstone\u2019s genre is popular in India and made by Ubisoft?', 'Hearthstone'],
        ['Which Indian college esports event runs nationally and was hosted by Trinity Gaming?', 'TEC Cup'],
        ['Which Indian team won the BGIS 2021 tournament?', 'Skylightz Gaming'],
        ['Which Indian BGMI player is known as Ghatak and captained Team SouL?', 'Ghatak'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Gaming',
      difficulty: 'hard',
      tags: ['gaming-history', 'india'],
      entries: [
        ['Which arcade cabinet era first reached Indian cities in the 1980s with games like Pac-Man?', 'Pac-Man'],
        ['Which PC-bang style gaming cafes grew in Indian metros in the 2000s and hosted Counter-Strike?', 'Counter-Strike'],
        ['Which Indian title from Sports Interactive is popular for cricket simulation since 2003?', 'Cricket 07'],
        ['Which India-only version of PUBG Mobile launched in 2021?', 'Battlegrounds Mobile India'],
        ['Which 2008 MMO game by Dhruva Interactive had Indian mythology influence?', 'Asura'],
        ['Which Indian indie game won an IGDC (India Game Developer Conference) award in 2021?', 'Raji: An Ancient Epic'],
        ['Which Indian studio made the free-to-play mobile game Teen Patti Gold?', 'Octro'],
        ['Which Indian mobile title from 99Games is a puzzle hit called Dhoom?', 'Dhoom 3 The Game'],
        ['Which Indian real-money rummy platform became publicly listed in 2024?', 'Rummy Culture'],
        ['Which Indian esports venue hosted the BGMI Masters Series 2022 finals in Bengaluru?', 'Gachibowli Indoor Stadium'],
      ],
    }),
  ]
}

function buildScienceAndNatureQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'easy',
      tags: ['space', 'isro'],
      entries: [
        ['Which Indian space organisation launched Chandrayaan missions?', 'ISRO'],
        ['Chandrayaan-3 successfully landed near which pole of the Moon in 2023?', 'South pole'],
        ['Which Indian mission reached Mars orbit in 2014?', 'Mangalyaan'],
        ['Who was the founder of ISRO, also called the Father of the Indian Space Programme?', 'Vikram Sarabhai'],
        ['Who was the first Indian in space, travelling on a Soyuz in 1984?', 'Rakesh Sharma'],
        ['Which ISRO centre in Thiruvananthapuram focuses on launch vehicle development?', 'Vikram Sarabhai Space Centre'],
        ['Which Indian satellite series provides weather data?', 'INSAT'],
        ['Which Indian rocket family has lifted heavy satellites since the 2000s?', 'GSLV'],
        ['Which Indian planetary orbiter mapped the Moon in 2008?', 'Chandrayaan-1'],
        ['Which Indian spaceport launches most ISRO missions?', 'Sriharikota'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'easy',
      tags: ['wildlife', 'fauna'],
      entries: [
        ['Which big cat is India\u2019s national animal?', 'Bengal tiger'],
        ['Which bird is India\u2019s national bird?', 'Indian peacock'],
        ['Which flower is India\u2019s national flower?', 'Lotus'],
        ['Which tree is India\u2019s national tree?', 'Banyan'],
        ['Which Indian state has the Asiatic lions at Gir National Park?', 'Gujarat'],
        ['Which national park in Assam is famed for the one-horned rhinoceros?', 'Kaziranga'],
        ['Which tiger reserve in Uttarakhand was India\u2019s first such reserve?', 'Jim Corbett'],
        ['Which freshwater dolphin is the national aquatic animal of India?', 'Gangetic dolphin'],
        ['Which Himalayan goat is the source of pashmina wool?', 'Changthangi'],
        ['Which Indian bird is the heaviest flying bird and is critically endangered?', 'Great Indian Bustard'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'medium',
      tags: ['scientists', 'nobel'],
      entries: [
        ['Which Indian physicist won the 1930 Nobel Prize for work on light scattering?', 'C.V. Raman'],
        ['Which Indian-American astrophysicist won the 1983 Nobel Prize in Physics?', 'Subrahmanyan Chandrasekhar'],
        ['Which Indian scientist is the Missile Man of India and later became President?', 'A.P.J. Abdul Kalam'],
        ['Which Indian mathematician is famous for collaborating with G.H. Hardy?', 'Srinivasa Ramanujan'],
        ['Which Indian statistician developed the Mahalanobis distance?', 'P.C. Mahalanobis'],
        ['Which Indian biologist won the 1983 World Food Prize?', 'M.S. Swaminathan'],
        ['Who founded the Tata Institute of Fundamental Research?', 'Homi J. Bhabha'],
        ['Which Indian chemist is credited with India\u2019s Green Revolution alongside M.S. Swaminathan?', 'Norman Borlaug'],
        ['Which Bengali scientist is known for early work on microwave radio in the 1890s?', 'Jagadish Chandra Bose'],
        ['Which Indian engineer is known as the father of India\u2019s computer revolution?', 'F.C. Kohli'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'medium',
      tags: ['geography-nature', 'rivers-mountains'],
      entries: [
        ['Which mountain range separates India from the Tibetan plateau?', 'Himalayas'],
        ['Which Indian desert covers parts of Rajasthan and Gujarat?', 'Thar Desert'],
        ['Which river is considered the most sacred in Hinduism?', 'Ganges'],
        ['Which river is the longest entirely within India?', 'Godavari'],
        ['Which peninsular Indian plateau is the largest plateau in the country?', 'Deccan Plateau'],
        ['Which mangrove forest on the India-Bangladesh border hosts Bengal tigers?', 'Sundarbans'],
        ['Which range runs along India\u2019s western coast and is a UNESCO biodiversity hotspot?', 'Western Ghats'],
        ['Which Indian lake in Rajasthan is a salty lake and flamingo habitat?', 'Sambhar Lake'],
        ['Which river originates near Mana Pass and flows through Kashmir before reaching Pakistan?', 'Indus'],
        ['Which fertile plain drains the Ganga and Brahmaputra rivers?', 'Indo-Gangetic Plain'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Science & Nature',
      difficulty: 'hard',
      tags: ['advanced-science', 'india'],
      entries: [
        ['Which Nobel-winning effect did C.V. Raman discover in 1928?', 'Raman scattering'],
        ['Which Indian-origin physicist co-founded string field theory using Sen-Sen relations?', 'Ashoke Sen'],
        ['Which Indian mathematician introduced the partition function formula with Hardy?', 'Srinivasa Ramanujan'],
        ['Which Indian particle physics project operates underground at INO?', 'India-based Neutrino Observatory'],
        ['Which ISRO radar imaging satellite series is named after earth observation?', 'RISAT'],
        ['Which Indian PC was India\u2019s first indigenously built microcomputer in the 1970s?', 'Siemens 7.551'],
        ['Which Indian-origin astronaut flew on STS-107 Columbia and died in 2003?', 'Kalpana Chawla'],
        ['Which Indian-American NASA astronaut commanded ISS Expedition 33?', 'Sunita Williams'],
        ['Which Indian cyclotron is located at VECC Kolkata?', 'Variable Energy Cyclotron'],
        ['Which Indian physicist co-developed the Bose-Einstein statistics with Einstein?', 'Satyendra Nath Bose'],
      ],
    }),
  ]
}

function buildHistoryAndCultureQuestions() {
  return [
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'easy',
      tags: ['freedom-struggle', 'leaders'],
      entries: [
        ['Who is known as the Father of the Nation in India?', 'Mahatma Gandhi'],
        ['Who was the first Prime Minister of independent India?', 'Jawaharlal Nehru'],
        ['Who was the first President of independent India?', 'Rajendra Prasad'],
        ['Who was nicknamed the Iron Man of India?', 'Sardar Vallabhbhai Patel'],
        ['Who led the Indian National Army against the British?', 'Subhas Chandra Bose'],
        ['Who founded the Indian National Congress in 1885?', 'Allan Octavian Hume'],
        ['Who famously said "Swaraj is my birthright"?', 'Bal Gangadhar Tilak'],
        ['Which leader led the Salt March in 1930?', 'Mahatma Gandhi'],
        ['Which leader started the Quit India Movement in 1942?', 'Mahatma Gandhi'],
        ['Which woman leader is associated with the Indian National Army\u2019s Rani of Jhansi regiment?', 'Lakshmi Sahgal'],
      ],
    }),
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'easy',
      tags: ['empires', 'dynasties'],
      entries: [
        ['Which emperor is known for the edicts of Dharma across his empire after the Kalinga War?', 'Ashoka'],
        ['Which Mughal emperor built the Taj Mahal?', 'Shah Jahan'],
        ['Which Mughal emperor founded the empire after the First Battle of Panipat in 1526?', 'Babur'],
        ['Which Maratha warrior king founded the Maratha empire in the 17th century?', 'Chhatrapati Shivaji Maharaj'],
        ['Which medieval dynasty built the Brihadeeswarar Temple at Thanjavur?', 'Chola'],
        ['Which southern dynasty ruled much of Karnataka and built Hampi?', 'Vijayanagara'],
        ['Which dynasty did Chandragupta Maurya found in 322 BCE?', 'Maurya'],
        ['Which Gupta ruler is called the Indian Napoleon for his conquests?', 'Samudragupta'],
        ['Which last Mughal emperor was exiled to Rangoon after 1857?', 'Bahadur Shah II'],
        ['Which Delhi Sultanate ruler shifted the capital to Daulatabad?', 'Muhammad bin Tughlaq'],
      ],
    }),
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'medium',
      tags: ['monuments-heritage', 'unesco'],
      entries: [
        ['Which Mughal-era fort in Agra is a UNESCO World Heritage Site?', 'Agra Fort'],
        ['Which cave complex in Maharashtra is famous for Buddhist rock-cut sculptures and the sleeping Buddha?', 'Ajanta Caves'],
        ['Which rock-cut site in Maharashtra features the Kailasa temple?', 'Ellora Caves'],
        ['Which UNESCO site in Odisha is known as the Black Pagoda and is a Surya temple?', 'Konark Sun Temple'],
        ['Which Rajasthan fort nicknamed The Golden Fort is in Jaisalmer?', 'Jaisalmer Fort'],
        ['Which UNESCO site contains the ruins of the Vijayanagara Empire in Karnataka?', 'Hampi'],
        ['Which Delhi tomb is a precursor to the Taj Mahal and a UNESCO site?', 'Humayun\u2019s Tomb'],
        ['Which monument built by Qutub-ud-din Aibak in Delhi is a UNESCO site?', 'Qutub Minar'],
        ['Which UNESCO-listed living tradition is a classical dance form of Odisha?', 'Odissi'],
        ['Which UNESCO site houses the India\u2019s oldest Buddhist stupa in Madhya Pradesh?', 'Sanchi Stupa'],
      ],
    }),
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'medium',
      tags: ['festivals', 'traditions'],
      entries: [
        ['Which festival is known as the festival of colors?', 'Holi'],
        ['Which festival is known as the festival of lights?', 'Diwali'],
        ['Which harvest festival is celebrated in Punjab in April?', 'Baisakhi'],
        ['Which festival marks the end of Ramadan for Indian Muslims?', 'Eid al-Fitr'],
        ['Which 10-day Marathi festival celebrates Lord Ganesha?', 'Ganesh Chaturthi'],
        ['Which West Bengal festival honors goddess Durga in autumn?', 'Durga Puja'],
        ['Which kite-flying festival is celebrated in Gujarat on January 14?', 'Uttarayan'],
        ['Which Tamil harvest festival is celebrated in mid-January over four days?', 'Pongal'],
        ['Which Kerala festival marks the homecoming of King Mahabali?', 'Onam'],
        ['Which Assamese festival celebrates the harvest with community feasting?', 'Bihu'],
      ],
    }),
    ...buildQuestionSet({
      category: 'History & Culture',
      difficulty: 'hard',
      tags: ['modern-history', 'india'],
      entries: [
        ['In which year did the Indian Rebellion begin?', '1857'],
        ['Who was the last Viceroy of India?', 'Louis Mountbatten'],
        ['Which treaty partitioned Bengal in 1905 and was later reversed?', 'Partition of Bengal'],
        ['Which Indian ruler signed the Treaty of Purandar with the British in 1782?', 'Madhavrao Peshwa'],
        ['Which Indian state became the first to be linguistically reorganized in 1953?', 'Andhra State'],
        ['Which Indian Prime Minister declared Emergency in 1975?', 'Indira Gandhi'],
        ['Which economic reform year opened up India\u2019s economy under PM Narasimha Rao?', '1991'],
        ['Which Indian state joined the Union last, in 1975, after a referendum?', 'Sikkim'],
        ['Which treaty in 1972 between India and Pakistan followed the 1971 war?', 'Shimla Agreement'],
        ['Which city was India\u2019s capital before New Delhi, until 1911?', 'Calcutta'],
      ],
    }),
  ]
}

function buildGeographyAndTravelQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'easy',
      tags: ['states-capitals', 'india'],
      entries: [
        ['What is the capital of Maharashtra?', 'Mumbai'],
        ['What is the capital of Karnataka?', 'Bengaluru'],
        ['What is the capital of Tamil Nadu?', 'Chennai'],
        ['What is the capital of West Bengal?', 'Kolkata'],
        ['What is the capital of Telangana?', 'Hyderabad'],
        ['What is the capital of Kerala?', 'Thiruvananthapuram'],
        ['What is the capital of Gujarat?', 'Gandhinagar'],
        ['What is the capital of Rajasthan?', 'Jaipur'],
        ['What is the capital of Uttar Pradesh?', 'Lucknow'],
        ['What is the capital of Punjab (India)?', 'Chandigarh'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'easy',
      tags: ['rivers', 'water-bodies'],
      entries: [
        ['Which river flows through Varanasi?', 'Ganges'],
        ['Which river flows through Ahmedabad?', 'Sabarmati'],
        ['Which river is known as Dakshin Ganga?', 'Godavari'],
        ['Which river is the lifeline of Tamil Nadu and flows into the Bay of Bengal?', 'Kaveri'],
        ['Which river rises in the Amarkantak plateau and flows westward?', 'Narmada'],
        ['Which river flows through Delhi?', 'Yamuna'],
        ['Which river forms the boundary between India and Pakistan near Punjab?', 'Sutlej'],
        ['Which river rises in Tibet and flows through Assam?', 'Brahmaputra'],
        ['Which lake in Kashmir is famous for shikara rides?', 'Dal Lake'],
        ['Which Indian lake is the largest saltwater lake in India (on the coast of Odisha)?', 'Chilika Lake'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'medium',
      tags: ['landmarks', 'cities'],
      entries: [
        ['Which city is called the Silicon Valley of India?', 'Bengaluru'],
        ['Which city is called the Pink City?', 'Jaipur'],
        ['Which city is called the Blue City of Rajasthan?', 'Jodhpur'],
        ['Which city is called the City of Joy?', 'Kolkata'],
        ['Which Kerala city is famous for Chinese fishing nets in the harbor?', 'Kochi'],
        ['Which UT city is a planned city designed by Le Corbusier?', 'Chandigarh'],
        ['Which Rajasthan city is known as the Venice of the East?', 'Udaipur'],
        ['Which Karnataka city is called Temple City of Karnataka?', 'Mysuru'],
        ['Which Uttarakhand city is called Gateway of Himalayas and is a pilgrimage hub?', 'Haridwar'],
        ['Which coastal city in Andhra Pradesh is a major port and navy base?', 'Visakhapatnam'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'medium',
      tags: ['national-parks', 'wildlife'],
      entries: [
        ['Which national park in Uttarakhand is the oldest in India (1936)?', 'Jim Corbett National Park'],
        ['Which reserve in Madhya Pradesh inspired The Jungle Book?', 'Pench Tiger Reserve'],
        ['Which park in Rajasthan is a famous tiger reserve next to the Aravalli range?', 'Ranthambore'],
        ['Which national park in Karnataka is near the town of Hunsur?', 'Nagarhole'],
        ['Which Andhra Pradesh park is famous for the Eastern Ghats tigers?', 'Nagarjunsagar-Srisailam'],
        ['Which park in Gujarat houses the Asiatic lion?', 'Gir'],
        ['Which park in West Bengal is a UNESCO-listed mangrove reserve?', 'Sundarbans'],
        ['Which park in Assam is famous for one-horned rhinoceros?', 'Kaziranga'],
        ['Which park in Uttarakhand borders Nepal and is part of the Terai Arc?', 'Rajaji'],
        ['Which park in Kerala is known for Periyar Lake and elephant sightings?', 'Periyar'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Geography & Travel',
      difficulty: 'hard',
      tags: ['advanced-geography', 'india'],
      entries: [
        ['Which Indian state has the longest coastline?', 'Gujarat'],
        ['Which Indian state is the largest by area?', 'Rajasthan'],
        ['Which is the smallest Indian state by area?', 'Goa'],
        ['Which mountain peak is the highest entirely within India?', 'Kangchenjunga'],
        ['Which river forms the Sundarbans delta with the Ganga and Meghna?', 'Brahmaputra'],
        ['Which Indian UT is the southernmost point in India?', 'Andaman and Nicobar Islands'],
        ['Which Indian state shares borders with Bhutan, Myanmar, and Bangladesh?', 'Arunachal Pradesh'],
        ['Which is India\u2019s highest motorable pass in Ladakh?', 'Umling La'],
        ['Which Andhra region contains the Krishna-Godavari delta?', 'Coastal Andhra'],
        ['Which Indian island chain lies in the Arabian Sea?', 'Lakshadweep'],
      ],
    }),
  ]
}

function buildInternetAndTechQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'easy',
      tags: ['indian-startups', 'unicorns'],
      entries: [
        ['Which Bengaluru e-commerce company was founded by Sachin and Binny Bansal?', 'Flipkart'],
        ['Which Mumbai-based edtech is known as the online learning platform with India\u2019s Teacher?', 'Byju\u2019s'],
        ['Which food delivery company is nicknamed Swiggy Pop?', 'Swiggy'],
        ['Which ride-hailing app founded by Bhavish Aggarwal competed with Uber in India?', 'Ola'],
        ['Which payments unicorn was founded by Vijay Shekhar Sharma?', 'Paytm'],
        ['Which Indian hotel aggregator was founded by Ritesh Agarwal?', 'OYO'],
        ['Which Indian social network founded by Aprameya Radhakrishna is named after music?', 'Koo'],
        ['Which short-video app by ShareChat is popular in India?', 'Moj'],
        ['Which Indian super-app by Reliance includes JioCinema?', 'MyJio'],
        ['Which online pharmacy platform was acquired by Reliance in 2020?', 'Netmeds'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'easy',
      tags: ['telecom', 'internet'],
      entries: [
        ['Which Indian company launched Jio in 2016 and disrupted telecom pricing?', 'Reliance Industries'],
        ['Which leader led Reliance Jio\u2019s launch?', 'Mukesh Ambani'],
        ['Which Indian network operator is nicknamed Vi after a merger?', 'Vodafone Idea'],
        ['Which Indian telecom company is led by Sunil Bharti Mittal?', 'Bharti Airtel'],
        ['Which Indian IT city is called Cyberabad?', 'Hyderabad'],
        ['Which Indian IT hub is called Silicon Plateau?', 'Bengaluru'],
        ['Which Indian city is a major IT hub known for Infopark and TechnoPark?', 'Kochi'],
        ['Which Indian BPO pioneer listed on NYSE is headquartered in Mumbai?', 'WNS'],
        ['Which Indian IT services company is nicknamed the TCS of Pune?', 'Infosys'],
        ['Which Indian IT company was founded by Narayana Murthy in 1981?', 'Infosys'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'medium',
      tags: ['tech-leaders', 'founders'],
      entries: [
        ['Who is the CEO of Google (Alphabet) since 2015, born in Madurai?', 'Sundar Pichai'],
        ['Who is the CEO of Microsoft since 2014, born in Hyderabad?', 'Satya Nadella'],
        ['Who is the CEO of Adobe since 2007?', 'Shantanu Narayen'],
        ['Who is the CEO of Palo Alto Networks?', 'Nikesh Arora'],
        ['Who founded Sun Microsystems alongside Scott McNealy and Andy Bechtolsheim?', 'Vinod Khosla'],
        ['Who is the co-founder of Hotmail and later founded JaiHind.org?', 'Sabeer Bhatia'],
        ['Who is the current chairman of HCL Technologies after Shiv Nadar\u2019s transition?', 'Roshni Nadar'],
        ['Who founded Indigo Airlines along with Rahul Bhatia?', 'Rakesh Gangwal'],
        ['Who is the CEO of Zerodha, India\u2019s leading broker?', 'Nithin Kamath'],
        ['Who founded Zoho Corporation in 1996?', 'Sridhar Vembu'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'medium',
      tags: ['apps', 'services'],
      entries: [
        ['Which Indian UPI service by NPCI is the de facto instant payment system?', 'UPI'],
        ['Which Indian payments app was built on UPI and rolled out by NPCI?', 'BHIM'],
        ['Which Indian ride-hailing service started as TaxiForSure competitor and was acquired by Ola?', 'TaxiForSure'],
        ['Which Indian grocery app by BigBasket\u2019s creator was TATA acquired?', 'BigBasket'],
        ['Which Indian music streaming service was rebranded as JioSaavn?', 'Saavn'],
        ['Which Indian investigative news app was banned from Google Play in 2021?', 'Tiranga News'],
        ['Which Indian logistics service is famous for Dunzo?', 'Dunzo'],
        ['Which Indian fintech processed the most UPI transactions in 2023?', 'PhonePe'],
        ['Which Indian startup popularised the Aadhaar-based eKYC?', 'UIDAI'],
        ['Which Indian government app is used for vaccination certificates?', 'CoWIN'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Internet & Tech',
      difficulty: 'hard',
      tags: ['tech-history', 'advanced'],
      entries: [
        ['Which Indian-American physicist co-founded Sun Microsystems?', 'Vinod Khosla'],
        ['Which Indian-American is the creator of USB and served at Intel?', 'Ajay Bhatt'],
        ['Which Indian is credited with founding Hotmail in 1996?', 'Sabeer Bhatia'],
        ['Which Indian tech executive wrote Hit Refresh about transforming Microsoft?', 'Satya Nadella'],
        ['Which Indian company launched the low-cost cryogenic-engine rocket for ISRO?', 'ISRO'],
        ['Which Indian electric two-wheeler company was founded by Bhavish Aggarwal?', 'Ola Electric'],
        ['Which Indian-American computer scientist won the 2008 Turing Award?', 'Barbara Liskov'],
        ['Which Indian scientist leads the CERT-In agency for cyber security response?', 'CERT-In'],
        ['Which Indian biometric identity program is the world\u2019s largest?', 'Aadhaar'],
        ['Which Indian chipmaker by Vedanta-Foxconn joint venture was announced in 2022 (then scrapped)?', 'Vedanta-Foxconn'],
      ],
    }),
  ]
}

function buildFoodAndLifestyleQuestions() {
  return [
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'easy',
      tags: ['street-food', 'snacks'],
      entries: [
        ['Which Mumbai street food is a spiced potato patty in a bun with chutneys?', 'Vada Pav'],
        ['Which Delhi street dish is crisp shells filled with spiced water?', 'Pani Puri'],
        ['Which Chennai snack is a thin, crisp lentil-rice crepe?', 'Dosa'],
        ['Which Gujarati snack is a steamed savory cake made from fermented chickpea batter?', 'Dhokla'],
        ['Which Indian street snack wraps spiced potato filling in a fried pastry triangle?', 'Samosa'],
        ['Which Punjabi bread is stuffed with paneer or potatoes and cooked on a tawa?', 'Paratha'],
        ['Which Hyderabad dish is a spiced layered rice with meat or vegetables?', 'Hyderabadi Biryani'],
        ['Which Kolkata sweet is a soft cottage cheese ball in sugar syrup?', 'Rasgulla'],
        ['Which Bengali sweet is flattened cottage cheese soaked in saffron syrup?', 'Sandesh'],
        ['Which chaat features yogurt, chickpeas, potatoes, and tamarind chutney?', 'Dahi Puri'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'easy',
      tags: ['spices', 'drinks'],
      entries: [
        ['Which yellow spice is a staple of Indian curry blends and is called haldi?', 'Turmeric'],
        ['Which spice is harvested from Kashmir and is among the most expensive in the world?', 'Saffron'],
        ['Which Indian tea brand is known for its Darjeeling and Assam blends?', 'Tata Tea'],
        ['Which masala tea is spiced with cardamom, ginger, and cinnamon?', 'Masala Chai'],
        ['Which yoghurt-based drink from Punjab is sweet or salted?', 'Lassi'],
        ['Which Indian cooling summer drink is made with mango pulp?', 'Aam Panna'],
        ['Which south Indian drink combines coffee decoction and milk in a steel tumbler?', 'Filter Coffee'],
        ['Which Indian cooking fat is clarified butter?', 'Ghee'],
        ['Which pungent asafoetida spice is used to temper lentils?', 'Hing'],
        ['Which Indian kitchen staple is a fermented pickle made with chilies, lemons, or mangoes?', 'Achar'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'medium',
      tags: ['regional-dishes', 'india'],
      entries: [
        ['Which Andhra dish is a spicy chicken curry with a thick gravy?', 'Andhra Chicken'],
        ['Which Kerala breakfast is a rice-flour noodle served with coconut milk?', 'Idiyappam'],
        ['Which Tamil Nadu breakfast is a fermented rice and lentil dumpling?', 'Idli'],
        ['Which Bengali fish curry uses mustard oil and mustard paste?', 'Shorshe Ilish'],
        ['Which Goan pork dish is cooked in vinegar and chili?', 'Vindaloo'],
        ['Which Rajasthani dish is a trio of dumplings, lentils, and sweet crumble?', 'Dal Baati Churma'],
        ['Which Kashmiri dish is slow-cooked meat in red chili gravy?', 'Rogan Josh'],
        ['Which Odisha milk-based sweet is known for a creamy texture?', 'Chhena Poda'],
        ['Which Hyderabad dessert is steamed wheat porridge with ghee and nuts?', 'Haleem'],
        ['Which Telugu tamarind-tangy chutney is eaten with rice?', 'Gongura Pachadi'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'medium',
      tags: ['lifestyle-brands', 'fashion'],
      entries: [
        ['Which Indian luxury label is associated with weddings and is founded by Sabyasachi Mukherjee?', 'Sabyasachi'],
        ['Which Indian menswear brand is known as India\u2019s couture king, founded by Manish Malhotra?', 'Manish Malhotra'],
        ['Which Indian sari is woven in Banaras with brocade and zari?', 'Banarasi'],
        ['Which south Indian sari is hand-woven in Kanchipuram?', 'Kanjeevaram'],
        ['Which Indian ayurvedic brand is known for natural cosmetics, started by Vivek Sahni?', 'Kama Ayurveda'],
        ['Which Indian wellness brand is founded by Ramdev?', 'Patanjali'],
        ['Which Indian denim brand is known for its jeans and started in Delhi in 1978?', 'Killer Jeans'],
        ['Which Indian yoga form is named after a Punjabi guru and means path of breath?', 'Sudarshan Kriya'],
        ['Which Indian retailer is nicknamed Big Bazaar\u2019s parent?', 'Future Group'],
        ['Which Indian perfume capital city is known for attar?', 'Kannauj'],
      ],
    }),
    ...buildQuestionSet({
      category: 'Food & Lifestyle',
      difficulty: 'hard',
      tags: ['heritage-cuisine', 'advanced'],
      entries: [
        ['Which Awadhi biryani is famously slow-cooked with dum sealing?', 'Lucknowi Biryani'],
        ['Which Chettinad dish is a fiery chicken curry with roasted spices?', 'Chettinad Chicken'],
        ['Which Parsi dish combines meat and lentils with Persian influence?', 'Dhansak'],
        ['Which Konkani fish curry uses kokum and coconut?', 'Konkani Fish Curry'],
        ['Which Assamese dish is a spicy pork preparation with bamboo shoots?', 'Pork with Bamboo Shoots'],
        ['Which Mughlai dish is chicken or lamb in a rich saffron cream?', 'Shahi Korma'],
        ['Which Himachal dish is slow-cooked lamb in yogurt and Kashmiri chili?', 'Chha Gosht'],
        ['Which Sikkimese fermented drink is made from finger millet?', 'Tongba'],
        ['Which Goan Christmas treat is a layered sweet with coconut?', 'Bebinca'],
        ['Which Kerala payasam uses jaggery and coconut milk?', 'Ada Pradhaman'],
      ],
    }),
  ]
}

/* ══════════════════════════════════════════════════════════════════════════
   Exports
   ══════════════════════════════════════════════════════════════════════════ */

export const triviaSeedQuestionsIndia = [
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

// Sanity-check at import time: fail loudly if any category drifts from 50.
const categoryCounts = new Map<SeedCategory, number>()
for (const category of CATEGORIES) {
  categoryCounts.set(category, 0)
}

for (const question of triviaSeedQuestionsIndia) {
  categoryCounts.set(question.category, (categoryCounts.get(question.category) ?? 0) + 1)
}

for (const category of CATEGORIES) {
  if (categoryCounts.get(category) !== 50) {
    throw new Error(
      `Expected 50 Indian trivia seed questions for ${category}, received ${categoryCounts.get(category) ?? 0}.`,
    )
  }
}
