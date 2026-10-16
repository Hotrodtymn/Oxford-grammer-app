import type { WritingIssue } from '../grammar/grammarChecker.ts'
import type { WritingStyleSuggestion } from '../style/styleChecker.ts'

export type WritingEngineSuggestion =
  | (WritingIssue & { sourceEngine: string })
  | (WritingStyleSuggestion & { sourceEngine: string })

export interface WritingEngine {
  /** Stable identifier for the engine that produced these suggestions. */
  readonly id: string
  /** Analyze the supplied document and return source-ranged suggestions. */
  analyze(text: string): WritingEngineSuggestion[]
}

/** Run registered engines and merge their suggestions in document order. */
export function analyzeWithEngines(
  text: string,
  engines: readonly WritingEngine[],
): WritingEngineSuggestion[] {
  return engines
    .flatMap((engine) => engine.analyze(text))
    .sort((a, b) => a.start - b.start || a.end - b.end)
}
