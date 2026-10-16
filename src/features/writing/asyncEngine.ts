import type { WritingEngineSuggestion } from './engine.ts'
import { analyzeWithEngines, type WritingEngine } from './engine.ts'

export type WritingEngineState =
  | 'idle'
  | 'loading'
  | 'analyzing'
  | 'ready'
  | 'unavailable'
  | 'error'

export type AsyncWritingEngineProgress = 'loading' | 'analyzing'

export interface AsyncWritingEngineContext {
  readonly signal: AbortSignal
  /** Engines can report model loading and inference progress without owning UI. */
  readonly reportProgress: (state: AsyncWritingEngineProgress) => void
}

/** Optional async contract. Existing synchronous engines do not need to implement it. */
export interface AsyncWritingEngine {
  readonly id: string
  analyzeAsync(
    text: string,
    context: AsyncWritingEngineContext,
  ): Promise<WritingEngineSuggestion[]>
}

export interface AsyncWritingAnalysisSnapshot {
  /** Monotonically increasing request number for this analyzer instance. */
  readonly revision: number
  /** Exact document text analyzed; use this to reject stale actions. */
  readonly documentText: string
  readonly suggestions: WritingEngineSuggestion[]
  readonly state: WritingEngineState
  readonly error?: unknown
}

/**
 * Runs synchronous local engines immediately, then optionally enriches them with
 * one async engine. New requests abort and supersede old ones; stale callbacks
 * are ignored, and async failures leave the local results available.
 */
export class AsyncWritingAnalyzer {
  private revision = 0
  private activeController: AbortController | undefined
  private readonly localEngines: readonly WritingEngine[]
  private readonly asyncEngine: AsyncWritingEngine | undefined

  constructor(
    localEngines: readonly WritingEngine[],
    asyncEngine?: AsyncWritingEngine,
  ) {
    this.localEngines = localEngines
    this.asyncEngine = asyncEngine
  }

  async analyze(
    text: string,
    onUpdate: (snapshot: AsyncWritingAnalysisSnapshot) => void = () => {},
  ): Promise<AsyncWritingAnalysisSnapshot> {
    this.activeController?.abort()
    const controller = new AbortController()
    this.activeController = controller
    const revision = ++this.revision
    const localSuggestions = analyzeWithEngines(text, this.localEngines)
    const current = () =>
      this.revision === revision && !controller.signal.aborted
    const publish = (snapshot: AsyncWritingAnalysisSnapshot) => {
      if (current()) onUpdate(snapshot)
      return snapshot
    }

    if (!this.asyncEngine) {
      return publish({
        revision,
        documentText: text,
        suggestions: localSuggestions,
        state: 'unavailable',
      })
    }

    publish({
      revision,
      documentText: text,
      suggestions: localSuggestions,
      state: 'loading',
    })

    try {
      const asyncSuggestions = await this.asyncEngine.analyzeAsync(text, {
        signal: controller.signal,
        reportProgress: (state) => {
          if (current()) {
            publish({ revision, documentText: text, suggestions: localSuggestions, state })
          }
        },
      })
      const validSuggestions = asyncSuggestions.filter((suggestion) =>
        hasValidRange(text, suggestion),
      )
      return publish({
        revision,
        documentText: text,
        suggestions: [...localSuggestions, ...validSuggestions].sort(
          (a, b) => a.start - b.start || a.end - b.end,
        ),
        state: 'ready',
      })
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return {
          revision,
          documentText: text,
          suggestions: localSuggestions,
          state: 'unavailable',
        }
      }
      return publish({
        revision,
        documentText: text,
        suggestions: localSuggestions,
        state: 'error',
        error,
      })
    }
  }

  cancel(): void {
    this.revision += 1
    this.activeController?.abort()
    this.activeController = undefined
  }
}

/** Require both the same analysis revision and exact source document before acting. */
export function isAnalysisCurrent(
  snapshot: AsyncWritingAnalysisSnapshot,
  documentText: string,
  currentRevision: number,
): boolean {
  return snapshot.revision === currentRevision && snapshot.documentText === documentText
}

/** Safe apply guard for results produced by an asynchronous analysis. */
export function canApplyAsyncSuggestion(
  snapshot: AsyncWritingAnalysisSnapshot,
  suggestion: WritingEngineSuggestion,
  documentText: string,
  currentRevision: number,
): boolean {
  return (
    isAnalysisCurrent(snapshot, documentText, currentRevision) &&
    hasValidRange(documentText, suggestion)
  )
}

function hasValidRange(text: string, suggestion: WritingEngineSuggestion): boolean {
  return (
    Number.isInteger(suggestion.start) &&
    Number.isInteger(suggestion.end) &&
    suggestion.start >= 0 &&
    suggestion.end >= suggestion.start &&
    suggestion.end <= text.length &&
    text.slice(suggestion.start, suggestion.end) === suggestion.original
  )
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
