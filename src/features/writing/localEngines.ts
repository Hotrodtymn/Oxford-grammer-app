import { checkWriting } from '../grammar/grammarChecker.ts'
import { suggestWritingImprovements } from '../style/styleChecker.ts'
import { analyzeWithEngines, type WritingEngine } from './engine.ts'

export const localGrammarEngine: WritingEngine = {
  id: 'local-grammar',
  analyze: (text) =>
    checkWriting(text).map((suggestion) => ({
      ...suggestion,
      sourceEngine: 'local-grammar',
    })),
}

export const localStyleEngine: WritingEngine = {
  id: 'local-style',
  analyze: (text) =>
    suggestWritingImprovements(text).map((suggestion) => ({
      ...suggestion,
      sourceEngine: 'local-style',
    })),
}

/** Add future local engines here without coupling the editor to their implementation. */
export const localWritingEngines: readonly WritingEngine[] = [
  localGrammarEngine,
  localStyleEngine,
]

export function analyzeWriting(text: string) {
  return analyzeWithEngines(text, localWritingEngines)
}
