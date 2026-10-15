import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestWritingImprovements } from './styleChecker.ts'

function findSuggestion(text, original) {
  const suggestion = suggestWritingImprovements(text).find(
    (item) => item.original === original,
  )

  assert.ok(suggestion, `Expected Oxford to suggest an improvement for "${original}" in: ${text}`)
  return suggestion
}

test('suggests a concise alternative for in order to', () => {
  const text = 'In order to finish, we started early.'
  const suggestion = findSuggestion(text, 'In order to')

  assert.equal(suggestion.suggestion, 'To')
  assert.equal(suggestion.type, 'style')
  assert.equal(text.slice(suggestion.start, suggestion.end), suggestion.original)
})

test('suggests a more direct request while retaining its action', () => {
  const text = 'I just wanted to reach out and ask if you could possibly review the draft.'
  const suggestion = findSuggestion(
    text,
    'I just wanted to reach out and ask if you could possibly review the draft',
  )

  assert.equal(suggestion.suggestion, 'Could you review the draft')
  assert.equal(
    text.slice(0, suggestion.start) + suggestion.suggestion + text.slice(suggestion.end),
    'Could you review the draft.',
  )
})

test('does not suggest changes to other valid request wording', () => {
  assert.deepEqual(
    suggestWritingImprovements('Could you please review the draft? I wanted to ask for your feedback.'),
    [],
  )
})

test('does not rewrite a request embedded inside a sentence', () => {
  assert.deepEqual(
    suggestWritingImprovements('My colleague said I just wanted to reach out and ask if you could possibly review the draft.'),
    [],
  )
})

test('keeps accurate offsets for multiple suggestions', () => {
  const text = 'In order to finish, we started early. I just wanted to reach out and ask if you could possibly review the draft.'
  const suggestions = suggestWritingImprovements(text)

  assert.equal(suggestions.length, 2)
  for (const suggestion of suggestions) {
    assert.equal(text.slice(suggestion.start, suggestion.end), suggestion.original)
  }
})
