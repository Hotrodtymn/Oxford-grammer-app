export type WritingStyleSuggestion = {
  id: string
  message: string
  original: string
  suggestion: string
  type: 'style'
  start: number
  end: number
}

function preserveCapitalization(
  original: string,
  replacement: string,
  capitalizeInitial = true,
): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase()
  if (capitalizeInitial && original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

export function suggestWritingImprovements(text: string): WritingStyleSuggestion[] {
  const suggestions: WritingStyleSuggestion[] = []

  const addSuggestion = (
    original: string,
    suggestion: string,
    message: string,
    start: number,
    capitalizeInitial = true,
  ) => {
    suggestions.push({
      id: `style-${start}-${original}`,
      message,
      original,
      suggestion: preserveCapitalization(original, suggestion, capitalizeInitial),
      type: 'style',
      start,
      end: start + original.length,
    })
  }

  const wordyPhrasePattern = /\bin order to\b/gi
  for (const match of text.matchAll(wordyPhrasePattern)) {
    addSuggestion(
      match[0],
      'to',
      'Optional: “to” is more concise here.',
      match.index ?? 0,
    )
  }

  const phraseReplacements: [RegExp, string, string][] = [
    [/\bdue to the fact that\b/gi, 'because', 'Optional: “because” is more concise here.'],
    [/\bat this point in time\b/gi, 'now', 'Optional: “now” is more concise here.'],
    [/\beach and every\b/gi, 'each', 'Optional: “each” keeps the meaning without repetition.'],
  ]

  for (const [pattern, replacement, message] of phraseReplacements) {
    for (const match of text.matchAll(pattern)) {
      addSuggestion(match[0], replacement, message, match.index ?? 0)
    }
  }

  const supportedAction =
    '(?:review|send|share|check|confirm|provide|help|take|let|explain|consider|look)'
  const requestPatterns = [
    new RegExp(
      `\\bI just wanted to (?:reach out and )?ask if you could possibly\\s+(${supportedAction}\\b[^.!?\\n]*?)(?=\\s+at this point in time\\b|[.!?\\n]|$)`,
      'gi',
    ),
    new RegExp(
      `\\bI wanted to ask if you could possibly\\s+(${supportedAction}\\b[^.!?\\n]*?)(?=\\s+at this point in time\\b|[.!?\\n]|$)`,
      'gi',
    ),
    new RegExp(
      `\\bWould it be possible for you to\\s+(${supportedAction}\\b[^.!?\\n]*?)(?=\\s+at this point in time\\b|[.!?\\n]|$)`,
      'gi',
    ),
    new RegExp(
      `\\bI was wondering if you could possibly\\s+(${supportedAction}\\b[^.!?\\n]*?)(?=\\s+at this point in time\\b|[.!?\\n]|$)`,
      'gi',
    ),
  ]

  for (const pattern of requestPatterns) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0
      const precedingText = text.slice(0, start)
      const lastSentenceBoundary = Math.max(
        precedingText.lastIndexOf('.'),
        precedingText.lastIndexOf('!'),
        precedingText.lastIndexOf('?'),
        precedingText.lastIndexOf('\n'),
      )

      const sentencePrefix = precedingText.slice(lastSentenceBoundary + 1)
      if (
        sentencePrefix.trim().length > 0 &&
        !/,\s*$/.test(sentencePrefix)
      ) continue

      addSuggestion(
        match[0],
        `could you ${match[1].trimEnd()}`,
        'Optional: make this request more direct while keeping the request.',
        start,
        sentencePrefix.trim().length === 0,
      )
    }
  }

  const orderedSuggestions = suggestions.sort(
    (a, b) => a.start - b.start || b.end - a.end,
  )
  const nonOverlappingSuggestions: WritingStyleSuggestion[] = []
  for (const suggestion of orderedSuggestions) {
    const previous = nonOverlappingSuggestions.at(-1)
    if (!previous || suggestion.start >= previous.end) {
      nonOverlappingSuggestions.push(suggestion)
    }
  }

  return nonOverlappingSuggestions
}
