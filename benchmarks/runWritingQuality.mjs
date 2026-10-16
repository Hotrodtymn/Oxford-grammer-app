import cases from './writingQuality.cases.mjs'
import { checkWriting } from '../src/features/grammar/grammarChecker.ts'
import { suggestWritingImprovements } from '../src/features/style/styleChecker.ts'

const engines = {
  grammar: checkWriting,
  style: suggestWritingImprovements,
}

const summary = {
  totalCases: cases.length,
  passedCases: 0,
  failedCases: 0,
  expected: 0,
  matched: 0,
  missed: 0,
  unexpected: 0,
  unexpectedOnUnchanged: 0,
  incorrect: 0,
  byEngine: {},
  byCategory: {},
}
const failures = []

function resultKey(result) {
  return `${result.original}\u0000${result.suggestion}\u0000${result.type}`
}

for (const benchmarkCase of cases) {
  const run = engines[benchmarkCase.engine]
  if (!run) throw new Error(`Unknown engine "${benchmarkCase.engine}" in ${benchmarkCase.id}`)
  if (benchmarkCase.unchanged && benchmarkCase.expected.length > 0) {
    throw new Error(`Unchanged case ${benchmarkCase.id} cannot have expected results`)
  }

  const actual = run(benchmarkCase.input)
  const expectedCounts = new Map()
  for (const expected of benchmarkCase.expected) {
    const key = resultKey(expected)
    expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + 1)
  }

  const category = summary.byCategory[benchmarkCase.category] ??= {
    cases: 0,
    passedCases: 0,
    expected: 0,
    matched: 0,
    missed: 0,
    unexpected: 0,
    unexpectedOnUnchanged: 0,
    incorrect: 0,
  }
  const engine = summary.byEngine[benchmarkCase.engine] ??= {
    cases: 0,
    expected: 0,
    matched: 0,
    missed: 0,
    unexpected: 0,
    incorrect: 0,
  }
  category.cases += 1
  engine.cases += 1

  let caseFailed = false
  for (const expected of benchmarkCase.expected) {
    summary.expected += 1
    category.expected += 1
    engine.expected += 1
    const key = resultKey(expected)
    const count = expectedCounts.get(key) ?? 0
    const matchIndex = actual.findIndex((result) => resultKey(result) === key)

    if (matchIndex >= 0 && count > 0) {
      actual.splice(matchIndex, 1)
      expectedCounts.set(key, count - 1)
      summary.matched += 1
      category.matched += 1
      engine.matched += 1
      continue
    }

    caseFailed = true
    summary.missed += 1
    category.missed += 1
    engine.missed += 1
    const unsuitable = actual.find((result) => result.original === expected.original)
    if (unsuitable) {
      summary.incorrect += 1
      category.incorrect += 1
      engine.incorrect += 1
      failures.push(
        `${benchmarkCase.id}: incorrect suggestion for "${expected.original}"; expected "${expected.suggestion}", got "${unsuitable.suggestion}"`,
      )
    } else {
      failures.push(
        `${benchmarkCase.id}: missed ${expected.type} result "${expected.original}" → "${expected.suggestion}"`,
      )
    }
  }

  for (const result of actual) {
    caseFailed = true
    summary.unexpected += 1
    category.unexpected += 1
    engine.unexpected += 1
    if (benchmarkCase.unchanged) {
      summary.unexpectedOnUnchanged += 1
      category.unexpectedOnUnchanged += 1
    }
    failures.push(
      `${benchmarkCase.id}: unexpected ${result.type} result "${result.original}" → "${result.suggestion}"`,
    )
  }

  if (caseFailed) {
    summary.failedCases += 1
  } else {
    summary.passedCases += 1
    category.passedCases += 1
  }
}

console.log(`Oxford writing quality benchmark: ${summary.totalCases} cases`)
console.log(`Cases passed: ${summary.passedCases}; cases with failures: ${summary.failedCases}`)
console.log(
  `Expected results: ${summary.expected}; correctly detected: ${summary.matched}; missed: ${summary.missed}; incorrect suggestions: ${summary.incorrect}; unexpected results: ${summary.unexpected}; unexpected on unchanged text: ${summary.unexpectedOnUnchanged}`,
)
console.log('\nBy engine (style remains separate from grammar/spelling):')
for (const [name, result] of Object.entries(summary.byEngine)) {
  console.log(
    `  ${name}: ${result.matched}/${result.expected} expected detected; ${result.missed} missed; ${result.incorrect} incorrect; ${result.unexpected} unexpected (${result.cases} cases)`,
  )
}
console.log('\nBy category:')
for (const [name, result] of Object.entries(summary.byCategory)) {
  console.log(
    `  ${name}: ${result.matched}/${result.expected} expected detected; ${result.missed} missed; ${result.incorrect} incorrect; ${result.unexpected} unexpected (${result.passedCases}/${result.cases} cases passed)`,
  )
}

if (failures.length > 0) {
  console.log('\nFailures:')
  for (const failure of failures) console.log(`  - ${failure}`)
  process.exitCode = 1
} else {
  console.log('\nAll benchmark cases passed.')
}
