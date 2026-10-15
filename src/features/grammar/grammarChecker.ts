export type WritingIssue = {
  id: string
  message: string
  original: string
  suggestion: string
  type: 'grammar' | 'spelling'
  start: number
  end: number
}

type Rule = {
  pattern: RegExp
  message: string
  suggestion: (match: RegExpMatchArray) => string
}

const spellingCorrections: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  recieved: 'received',
  recieving: 'receiving',
  seperate: 'separate',
  definately: 'definitely',
  definatelyy: 'definitely',
  occured: 'occurred',
  occuring: 'occurring',
  untill: 'until',
  becuase: 'because',
  wich: 'which',
  thier: 'their',
  adress: 'address',
  goverment: 'government',
  enviroment: 'environment',
  begining: 'beginning',
  tommorow: 'tomorrow',
  alwasy: 'always',
  freind: 'friend',
  wierd: 'weird',
  alot: 'a lot',
  doesnt: "doesn't",
  didnt: "didn't",
  dont: "don't",
  cant: "can't",
  wont: "won't",
  wouldnt: "wouldn't",
  shouldnt: "shouldn't",
  couldnt: "couldn't",
  havent: "haven't",
  hasnt: "hasn't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  didntve: "didn't have",
  becasue: 'because',
  calender: 'calendar',
  comming: 'coming',
  concious: 'conscious',
  existance: 'existence',
  foriegn: 'foreign',
  grammer: 'grammar',
  happend: 'happened',
  immediatly: 'immediately',
  knowlege: 'knowledge',
  liesure: 'leisure',
  occassion: 'occasion',
  priviledge: 'privilege',
  relevent: 'relevant',
  succesful: 'successful',
  truely: 'truly',
  usefull: 'useful',
  acheive: 'achieve',
  arguement: 'argument',
  basicly: 'basically',
  buisness: 'business',
  consistant: 'consistent',
  diferent: 'different',
  embarass: 'embarrass',
  independant: 'independent',
  maintainance: 'maintenance',
  neccessary: 'necessary',
  occurrance: 'occurrence',
  recomend: 'recommend',
  tomatos: 'tomatoes',
  governer: 'governor',
}

const grammarRules: Rule[] = [
  {
    pattern: /\b(he|she|it)\s+(go|do|have|like|want|need|work|play|eat|walk|talk|live|study|watch|carry)\b/gi,
    message: 'Use the verb form ending in "s" with this subject.',
    suggestion: (match) => {
      const verb = match[2].toLowerCase()
      const thirdPerson = verb === 'have'
        ? 'has'
        : verb === 'do'
          ? 'does'
          : verb.endsWith('y') && !/[aeiou]y$/.test(verb)
            ? `${verb.slice(0, -1)}ies`
            : /(?:s|sh|ch|x|z|o)$/.test(verb)
              ? `${verb}es`
              : `${verb}s`
      return `${match[1]} ${thirdPerson}`
    },
  },
  {
    pattern: /\b(can|could|may|might|must|shall|should|will|would)\s+(sings|goes|does|has|likes|wants|needs|works|plays|eats|walks|talks|lives|studies|watches|carries)\b/gi,
    message: 'Use the base form of the verb after a modal verb.',
    suggestion: (match) => {
      const verb = match[2].toLowerCase()
      const base = verb === 'goes' ? 'go'
        : verb === 'does' ? 'do'
          : verb === 'has' ? 'have'
            : verb === 'studies' ? 'study'
              : verb === 'carries' ? 'carry'
                : verb.endsWith('ies') ? `${verb.slice(0, -3)}y`
                  : verb.endsWith('es') && /(?:s|sh|ch|x|z|o)es$/.test(verb)
                    ? verb.slice(0, -2)
                    : verb.endsWith('s') ? verb.slice(0, -1) : verb
      return `${match[1]} ${base}`
    },
  },
  {
    pattern: /\b(look forward to)\s+(meet|see|speak|talk|hear|work|visit|read|learn|join|travel|go)\b/gi,
    message: 'Use the -ing form after "look forward to".',
    suggestion: (match) => {
      const gerunds: Record<string, string> = {
        meet: 'meeting', see: 'seeing', speak: 'speaking', talk: 'talking',
        hear: 'hearing', work: 'working', visit: 'visiting', read: 'reading',
        learn: 'learning', join: 'joining', travel: 'traveling', go: 'going',
      }
      return `${match[1]} ${gerunds[match[2].toLowerCase()]}`
    },
  },
  {
    pattern: /\b(this|that|it)\s+are\b/gi,
    message: 'This subject usually takes "is", not "are".',
    suggestion: (match) => `${match[1]} is`,
  },
  {
    pattern: /\b(these|those)\s+is\b/gi,
    message: 'These subjects usually take "are", not "is".',
    suggestion: (match) => `${match[1]} are`,
  },
  {
    pattern: /\b(you|they|we)\s+is\b/gi,
    message: 'This subject usually takes "are", not "is".',
    suggestion: (match) => `${match[1]} are`,
  },
  {
    pattern: /\b(i|you|we|they)\s+has\b/gi,
    message: 'This subject usually takes "have", not "has".',
    suggestion: (match) => `${match[1]} have`,
  },
  {
    pattern: /\b(he|she|it)\s+don't\b/gi,
    message: 'Use "doesn’t" with this subject.',
    suggestion: (match) => `${match[1]} doesn't`,
  },
  {
    pattern: /\b(he|she|it)\s+doesn't\s+has\b/gi,
    message: 'After "doesn’t", use the base verb "have".',
    suggestion: (match) => match[0].replace(/has$/i, 'have'),
  },
  {
    pattern: /\b(he|she|it)\s+doesn't\s+goes\b/gi,
    message: 'After "doesn’t", use the base verb "go".',
    suggestion: (match) => match[0].replace(/goes$/i, 'go'),
  },
  {
    pattern: /\b(he|she|it)\s+doesn't\s+likes\b/gi,
    message: 'After "doesn’t", use the base verb "like".',
    suggestion: (match) => match[0].replace(/likes$/i, 'like'),
  },
  {
    pattern: /\b(they|we|you)\s+was\b/gi,
    message: 'This subject usually takes "were", not "was".',
    suggestion: (match) => `${match[1]} were`,
  },
  {
    pattern: /\b(he|she|it)\s+were\b/gi,
    message: 'This subject usually takes "was", not "were".',
    suggestion: (match) => `${match[1]} was`,
  },
  {
    pattern: /\bi\s+is\b/gi,
    message: 'Use "am" with "I".',
    suggestion: () => 'I am',
  },
  {
    pattern: /\bi\s+are\b/gi,
    message: 'Use "am" with "I".',
    suggestion: () => 'I am',
  },
  {
    pattern: /\b(there)\s+is\s+(many|several|few)\b/gi,
    message: 'Use "are" with plural nouns.',
    suggestion: (match) => `${match[1]} are ${match[2]}`,
  },
  {
    pattern: /\b(we|they|you)\s+wasn't\b/gi,
    message: 'Use "weren’t" with this subject.',
    suggestion: (match) => `${match[1]} weren't`,
  },
  {
    pattern: /\b(he|she|it)\s+weren't\b/gi,
    message: 'Use "wasn’t" with this subject.',
    suggestion: (match) => `${match[1]} wasn't`,
  },
  {
    pattern: /\b(could|would|should|might|must)\s+of\b/gi,
    message: 'Use "have" rather than "of" after this modal verb.',
    suggestion: (match) => `${match[1]} have`,
  },
  {
    pattern:
      /\b(a)\s+((?!(?:university|unicorn|uniform|unique|unit|user|usual|useful|european|eulogy|one|once)\b)[aeiou][a-z]*)\b/gi,
    message: 'Use "an" before a vowel sound.',
    suggestion: (match) => `an ${match[2]}`,
  },
  {
    pattern:
      /\b(an)\s+((?!(?:hour|honest|honor|honour|heir|herb)\b)[^aeiou\s][a-z]*)\b/gi,
    message: 'Check the article before this word.',
    suggestion: (match) => `a ${match[2]}`,
  },
  {
    pattern: /\byour\s+(going to)(?=\s+(?:be|have|like|love|see|go|help|win|finish|start|join)\b)/gi,
    message: 'Check whether you mean "you’re" (you are).',
    suggestion: (match) => `you're ${match[1]}`,
  },
  {
    pattern: /\byoure\b/gi,
    message: 'Use an apostrophe in "you’re" when you mean "you are".',
    suggestion: () => "you're",
  },

  {
    pattern: /\btheir\s+(going to)(?=\s+(?:be|have|like|love|see|go|help|win|finish|start|join)\b)/gi,
    message: 'Check whether you mean "they’re" (they are).',
    suggestion: (match) => `they're ${match[1]}`,
  },
  {
    pattern: /\btheir\s+going to\s+the store(?=[.!?]?(?:\s|$))/gi,
    message: 'Check whether you mean "they’re" (they are).',
    suggestion: () => "they're going to the store",
  },
  {
    pattern: /\bthere\s+(going to)(?=\s+(?:be|have|like|love|see|go|help|win|finish|start|join)\b)/gi,
    message: 'Check whether you mean "they’re" (they are).',
    suggestion: (match) => `they're ${match[1]}`,
  },
  {
    pattern: /\bthere\s+(message|messages|letter|letters|car|cars|book|books|phone|phones|name|names|idea|ideas|house|houses|dog|dogs|team|teams)\b/gi,
    message: 'Use "their" to show that something belongs to them.',
    suggestion: (match) => `their ${match[1]}`,
  },
  {
    pattern: /\btheir\s+(is|are|was|were)\b/gi,
    message: 'Check whether you mean "there" to refer to a place or existence.',
    suggestion: (match) => `there ${match[1]}`,
  },
  {
    pattern: /\bto\s+(much|many)\b/gi,
    message: 'Use "too" to mean excessively.',
    suggestion: (match) => `too ${match[1]}`,
  },
  {
    pattern: /\bits\s+(a|an|the)\b/gi,
    message: 'Use "it’s" (it is) before an article.',
    suggestion: (match) => `it's ${match[1]}`,
  },
  {
    pattern: /\bits\s+(is|was|has|had|will|would|can|could|should|does|did|not|been)\b/gi,
    message: 'Use "it’s" (it is or it has) in this sentence.',
    suggestion: (match) => `it's ${match[1]}`,
  },
  {
    pattern: /\bits\s+(definitely)\s+(going to)\b/gi,
    message: 'Use "it’s" (it is) before this phrase.',
    suggestion: (match) => `it's ${match[1]} ${match[2]}`,
  },
  {
    pattern: /\b(rather|other|no sooner)\s+then\b/gi,
    message: 'Use "than" in this comparison or fixed phrase.',
    suggestion: (match) => `${match[1]} than`,
  },

  {
    pattern: /\b(the|a|an|to|of|in|on|at|for|with)\s+\1\b/gi,
    message: 'This word may have been repeated accidentally.',
    suggestion: (match) => match[1],
  },
]

function preserveCase(original: string, suggestion: string): string {
  if (original === original.toUpperCase()) {
    return suggestion.toUpperCase()
  }

  if (original[0] === original[0].toUpperCase()) {
    return suggestion[0].toUpperCase() + suggestion.slice(1)
  }

  return suggestion
}

export function checkWriting(text: string): WritingIssue[] {
  const issues: WritingIssue[] = []

  const addIssue = (
    type: WritingIssue['type'],
    message: string,
    original: string,
    suggestion: string,
    start: number,
  ) => {
    if (!original.length) return

    issues.push({
      id: `${type}-${start}-${original}`,
      type,
      message,
      original,
      suggestion,
      start,
      end: start + original.length,
    })
  }

  for (const rule of grammarRules) {
    for (const match of text.matchAll(rule.pattern)) {
      const original = match[0]

      addIssue(
        'grammar',
        rule.message,
        original,
        preserveCase(original, rule.suggestion(match)),
        match.index ?? 0,
      )
    }
  }

  const spellingPattern = /\b[a-z']+\b/gi

  for (const match of text.matchAll(spellingPattern)) {
    const original = match[0]
    const suggestion = spellingCorrections[original.toLowerCase()]

    if (!suggestion) continue

    addIssue(
      'spelling',
      `Possible spelling mistake: "${original}".`,
      original,
      preserveCase(original, suggestion),
      match.index ?? 0,
    )
  }

  const punctuationPattern = /([!?.,])\1+/g

  for (const match of text.matchAll(punctuationPattern)) {
    const original = match[0]

    addIssue(
      'grammar',
      'Repeated punctuation may be unnecessary.',
      original,
      original[0],
      match.index ?? 0,
    )
  }

  const spaceBeforePunctuation = /\s+([.,!?;:])/g

  for (const match of text.matchAll(spaceBeforePunctuation)) {
    addIssue(
      'grammar',
      'Remove the space before this punctuation mark.',
      match[0],
      match[1],
      match.index ?? 0,
    )
  }

  const missingSpacePattern = /([,!?:])([A-Za-z])/g

  for (const match of text.matchAll(missingSpacePattern)) {
    addIssue(
      'grammar',
      'Consider adding a space after this punctuation mark.',
      match[0],
      `${match[1]} ${match[2]}`,
      match.index ?? 0,
    )
  }

  const sentenceBoundaryPattern = /\b(i|you|he|she|it|we|they)\s+(am|is|are|was|were|went|go|goes|got|have|has|had|know|knew|think|thought|want|wanted|need|needed|like|liked|said|saw|made|took|came|left|work|works|worked|play|plays|played|eat|eats|ate|feel|felt|look|looks|looked)\b[^.!?]{1,55}?([,;]?)(\s+)(i|you|he|she|it|we|they)\s+(am|is|are|was|were|went|go|goes|got|have|has|had|know|knew|think|thought|want|wanted|need|needed|like|liked|said|saw|made|took|came|left|work|works|worked|play|plays|played|eat|eats|ate|feel|felt|look|looks|looked)\b/gi

  for (const match of text.matchAll(sentenceBoundaryPattern)) {
    const boundary = match[3]
    const whitespace = match[4]
    const secondSubjectIndex = (match.index ?? 0) + match[0].lastIndexOf(match[5])
    const whitespaceIndex = secondSubjectIndex - whitespace.length
    const clauseGap = text.slice(
      (match.index ?? 0) + match[1].length + match[2].length,
      secondSubjectIndex,
    )

    if (/\b(?:and|but|or|so|yet|for|nor)\b/i.test(clauseGap)) continue

    if (boundary === ',') {
      const boundaryIndex = text.lastIndexOf(',', whitespaceIndex)
      addIssue(
        'grammar',
        'These clauses may be joined with a semicolon or a conjunction.',
        boundary,
        ';',
        boundaryIndex,
      )
    } else if (!boundary && whitespace.length === 1 && !/[\r\n]/.test(whitespace)) {
      addIssue(
        'grammar',
        'These clauses may need punctuation between them.',
        whitespace,
        '; ',
        whitespaceIndex,
      )
    }
  }

  const missingSentenceSpacePattern = /([.!?])([A-Z])/g

  for (const match of text.matchAll(missingSentenceSpacePattern)) {
    const start = match.index ?? 0
    const precedingText = text.slice(Math.max(0, start - 8), start)
    if (/\b(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|etc)\.$/i.test(`${precedingText}${match[1]}`)) {
      continue
    }

    addIssue(
      'grammar',
      'Add a space after this sentence-ending punctuation.',
      match[0],
      `${match[1]} ${match[2]}`,
      start,
    )
  }

  const repeatedWordPattern = /\b([a-z]+)(\s+)\1\b/gi

  for (const match of text.matchAll(repeatedWordPattern)) {
    addIssue(
      'grammar',
      'This word appears to be repeated.',
      match[0],
      preserveCase(match[1], match[1]),
      match.index ?? 0,
    )
  }

  const lowercaseIPattern = /\bi\b/g

  for (const match of text.matchAll(lowercaseIPattern)) {
    addIssue(
      'grammar',
      'The pronoun "I" should be capitalized.',
      match[0],
      'I',
      match.index ?? 0,
    )
  }

  const capitalizationPattern = /(^\s*[a-z]|[.!?]\s+[a-z])/g

  for (const match of text.matchAll(capitalizationPattern)) {
    const letterIndex = match[0].search(/[a-z]/)
    if (letterIndex < 0) continue

    const letter = match[0][letterIndex]
    const start = (match.index ?? 0) + letterIndex

    addIssue(
      'grammar',
      'Consider capitalizing the start of this sentence.',
      letter,
      letter.toUpperCase(),
      start,
    )
  }

  issues.sort(
    (a, b) =>
      a.start - b.start ||
      (b.end - b.start) - (a.end - a.start),
  )

  const filtered: WritingIssue[] = []

  for (const issue of issues) {
    const overlaps = filtered.some(
      (existing) =>
        issue.start < existing.end && issue.end > existing.start,
    )

    if (!overlaps) filtered.push(issue)
  }

  return filtered
}
