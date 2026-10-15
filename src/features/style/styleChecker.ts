export type WritingStyleSuggestion = {
  id: string
  message: string
  original: string
  suggestion: string
  type: 'style'
  start: number
  end: number
}

function preserveCapitalization(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase()
  if (original[0] === original[0].toUpperCase()) {
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
  ) => {
    suggestions.push({
      id: `style-${start}-${original}`,
      message,
      original,
      suggestion: preserveCapitalization(original, suggestion),
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

  const directRequestPattern = /\bI just wanted to reach out and ask if you could possibly\s+((?:review|send|share|check|confirm|provide|help|take|let|explain|consider|look)\b[^.!?\n]*[^\s.!?])/gi
  for (const match of text.matchAll(directRequestPattern)) {
    const start = match.index ?? 0
    const precedingText = text.slice(0, start)
    const lastSentenceBoundary = Math.max(
      precedingText.lastIndexOf('.'),
      precedingText.lastIndexOf('!'),
      precedingText.lastIndexOf('?'),
      precedingText.lastIndexOf('\n'),
    )

    if (precedingText.slice(lastSentenceBoundary + 1).trim().length > 0) continue

    const original = match[0]
    addSuggestion(
      original,
      `could you ${match[1]}`,
      'Optional: make this request more direct while keeping the request.',
      start,
    )
  }

  return suggestions.sort((a, b) => a.start - b.start)
}
