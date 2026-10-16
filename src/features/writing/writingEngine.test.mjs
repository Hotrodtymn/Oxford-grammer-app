import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeWithEngines } from './engine.ts'
import {
  AsyncWritingAnalyzer,
  canApplyAsyncSuggestion,
  isAnalysisCurrent,
} from './asyncEngine.ts'
import {
  localGrammarEngine,
  localStyleEngine,
  localWritingEngines,
  analyzeWriting,
} from './localEngines.ts'

test('grammar adapter preserves kinds, source identity, messages, and source offsets', () => {
  const text = 'She go home. I recieved teh letter.'
  const results = localGrammarEngine.analyze(text)

  assert.deepEqual(
    results.map(({ original, suggestion, type, sourceEngine }) => ({
      original,
      suggestion,
      type,
      sourceEngine,
    })),
    [
      { original: 'She go', suggestion: 'She goes', type: 'grammar', sourceEngine: 'local-grammar' },
      { original: 'recieved', suggestion: 'received', type: 'spelling', sourceEngine: 'local-grammar' },
      { original: 'teh', suggestion: 'the', type: 'spelling', sourceEngine: 'local-grammar' },
    ],
  )
  for (const result of results) {
    assert.equal(text.slice(result.start, result.end), result.original)
    assert.ok(result.message.length > 0)
  }
})

test('style adapter remains distinct from grammar and spelling results', () => {
  const text = 'In order to finish, we started early.'
  const [result] = localStyleEngine.analyze(text)

  assert.equal(result.original, 'In order to')
  assert.equal(result.suggestion, 'To')
  assert.equal(result.type, 'style')
  assert.equal(result.sourceEngine, 'local-style')
  assert.equal(result.message.length > 0, true)
  assert.equal(text.slice(result.start, result.end), result.original)
  assert.deepEqual(localGrammarEngine.analyze(text), [])
})

test('combines registered engines in source order without changing their results', () => {
  const text = 'In order to finish, She go home.'
  const results = analyzeWithEngines(text, [localStyleEngine, localGrammarEngine])

  assert.deepEqual(
    results.map(({ original, type, sourceEngine }) => ({ original, type, sourceEngine })),
    [
      { original: 'In order to', type: 'style', sourceEngine: 'local-style' },
      { original: 'She go', type: 'grammar', sourceEngine: 'local-grammar' },
    ],
  )
  for (const result of results) {
    assert.equal(text.slice(result.start, result.end), result.original)
  }
})

test('supports empty input and ordinary valid text with no results', () => {
  assert.deepEqual(analyzeWriting(''), [])
  assert.deepEqual(
    analyzeWithEngines(
      'Your report is ready, and we can review it tomorrow.',
      localWritingEngines,
    ),
    [],
  )
})

test('allows another engine to be registered without changing the router', () => {
  const futureEngine = {
    id: 'future-local-engine',
    analyze: () => [],
  }

  assert.deepEqual(analyzeWithEngines('A valid sentence.', [futureEngine]), [])
})

test('async analyzer keeps local results and reports loading, inference, and ready states', async () => {
  const text = 'She go home.'
  const asyncSuggestion = {
    ...localGrammarEngine.analyze('She go home.')[0],
    id: 'async:rewrite',
    original: 'home',
    suggestion: 'back',
    start: 7,
    end: 11,
    sourceEngine: 'optional-model',
  }
  const states = []
  const analyzer = new AsyncWritingAnalyzer(localWritingEngines, {
    id: 'optional-model',
    async analyzeAsync(_text, { reportProgress }) {
      reportProgress('analyzing')
      return [asyncSuggestion]
    },
  })

  const result = await analyzer.analyze(text, ({ state, suggestions }) => {
    states.push({ state, suggestionCount: suggestions.length })
  })

  assert.deepEqual(states.map(({ state }) => state), ['loading', 'analyzing', 'ready'])
  assert.equal(result.state, 'ready')
  assert.equal(result.documentText, text)
  assert.equal(result.suggestions[0].original, 'She go')
  assert.equal(result.suggestions.at(-1).sourceEngine, 'optional-model')
})

test('cancels a superseded analysis and suppresses its stale update', async () => {
  let resolveFirst
  let firstSignal
  const firstUpdates = []
  const analyzer = new AsyncWritingAnalyzer([], {
    id: 'delayed-engine',
    analyzeAsync(text, { signal }) {
      if (text === 'first') {
        firstSignal = signal
        return new Promise((resolve) => { resolveFirst = resolve })
      }
      return Promise.resolve([])
    },
  })

  const first = analyzer.analyze('first', (snapshot) => firstUpdates.push(snapshot))
  const second = await analyzer.analyze('second')
  resolveFirst([])
  const stale = await first

  assert.equal(firstSignal.aborted, true)
  assert.deepEqual(firstUpdates.map(({ state }) => state), ['loading'])
  assert.equal(second.state, 'ready')
  assert.equal(isAnalysisCurrent(stale, 'second', second.revision), false)
})

test('rejects a stale suggestion even when its old text still occurs at that range', async () => {
  const text = 'Fix this sentence.'
  const suggestion = {
    ...localGrammarEngine.analyze('She go home.')[0],
    original: 'this',
    suggestion: 'that',
    start: 4,
    end: 8,
    sourceEngine: 'optional-model',
  }
  const analyzer = new AsyncWritingAnalyzer([], {
    id: 'optional-model',
    analyzeAsync: async () => [suggestion],
  })
  const snapshot = await analyzer.analyze(text)

  assert.equal(canApplyAsyncSuggestion(snapshot, suggestion, text, snapshot.revision), true)
  assert.equal(canApplyAsyncSuggestion(snapshot, suggestion, `New: ${text}`, snapshot.revision), false)
  assert.equal(canApplyAsyncSuggestion(snapshot, suggestion, text, snapshot.revision + 1), false)
})

test('async engine failure retains local grammar and style suggestions', async () => {
  const text = 'In order to finish, She go home.'
  const analyzer = new AsyncWritingAnalyzer(localWritingEngines, {
    id: 'optional-model',
    analyzeAsync: async () => { throw new Error('model unavailable') },
  })

  const result = await analyzer.analyze(text)

  assert.equal(result.state, 'error')
  assert.match(result.error.message, /model unavailable/)
  assert.deepEqual(result.suggestions.map(({ type }) => type), ['style', 'grammar'])
})

test('missing async engine leaves local analysis ready to use and reports unavailable', async () => {
  const result = await new AsyncWritingAnalyzer(localWritingEngines).analyze('She go home.')

  assert.equal(result.state, 'unavailable')
  assert.equal(result.suggestions[0].sourceEngine, 'local-grammar')
})
