import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestWritingImprovements } from './styleChecker.ts'
import { checkWriting } from '../grammar/grammarChecker.ts'

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

test('shortens common wordy phrases and selected repetition', () => {
  for (const [text, original, expected] of [
    ['We left due to the fact that it was late.', 'due to the fact that', 'because'],
    ['At this point in time, we should begin.', 'At this point in time', 'Now'],
    ['Each and every applicant replied.', 'Each and every', 'Each'],
  ]) {
    const suggestion = findSuggestion(text, original)
    assert.equal(suggestion.suggestion, expected)
    assert.equal(text.slice(suggestion.start, suggestion.end), original)
  }
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

test('makes a supported ask-if request more direct and keeps punctuation', () => {
  const text = 'I just wanted to ask if you could possibly send the report?'
  const suggestion = findSuggestion(
    text,
    'I just wanted to ask if you could possibly send the report',
  )

  assert.equal(suggestion.suggestion, 'Could you send the report')
  assert.equal(
    text.slice(0, suggestion.start) + suggestion.suggestion + text.slice(suggestion.end),
    'Could you send the report?',
  )
})

test('shortens wanted-to-ask requests while preserving names and punctuation', () => {
  const text = "I wanted to ask if you could possibly review Jordan's draft?"
  const suggestion = findSuggestion(
    text,
    "I wanted to ask if you could possibly review Jordan's draft",
  )

  assert.equal(suggestion.suggestion, "Could you review Jordan's draft")
  assert.equal(
    text.slice(0, suggestion.start) + suggestion.suggestion + text.slice(suggestion.end),
    "Could you review Jordan's draft?",
  )
})

test('shortens possible-for-you requests without changing the request target', () => {
  const text = 'Would it be possible for you to send the revised report!'
  const suggestion = findSuggestion(
    text,
    'Would it be possible for you to send the revised report',
  )

  assert.equal(suggestion.suggestion, 'Could you send the revised report')
  assert.equal(
    text.slice(0, suggestion.start) + suggestion.suggestion + text.slice(suggestion.end),
    'Could you send the revised report!',
  )
})

test('shortens wondering-if requests at sentence start and after a comma', () => {
  for (const [text, expected] of [
    ['I was wondering if you could possibly check the dates.', 'Could you check the dates.'],
    ['The dates are ready, I was wondering if you could possibly check them?', 'The dates are ready, could you check them?'],
  ]) {
    const suggestion = suggestWritingImprovements(text).find(
      (item) => item.original.includes('I was wondering'),
    )
    assert.ok(suggestion)
    assert.equal(
      text.slice(0, suggestion.start) + suggestion.suggestion + text.slice(suggestion.end),
      expected,
    )
  }
})

test('suggests all applicable improvements in the reported sentence', () => {
  const text = 'Due to the fact that I am currently working on this project, I just wanted to ask if you could possibly review the changes at this point in time.'
  const suggestions = suggestWritingImprovements(text)

  assert.deepEqual(
    suggestions.map(({ original, suggestion }) => ({ original, suggestion })),
    [
      { original: 'Due to the fact that', suggestion: 'Because' },
      {
        original: 'I just wanted to ask if you could possibly review the changes',
        suggestion: 'could you review the changes',
      },
      { original: 'at this point in time', suggestion: 'now' },
    ],
  )
  for (const suggestion of suggestions) {
    assert.equal(text.slice(suggestion.start, suggestion.end), suggestion.original)
  }
})

test('applying all improvements keeps the request lowercase after a comma and retains the period', () => {
  const text = 'Due to the fact that I am currently working on this project, I just wanted to ask if you could possibly review the changes at this point in time.'
  let updated = text

  for (const original of [
    'Due to the fact that',
    'I just wanted to ask if you could possibly review the changes',
    'at this point in time',
  ]) {
    const suggestion = findSuggestion(updated, original)
    updated =
      updated.slice(0, suggestion.start) +
      suggestion.suggestion +
      updated.slice(suggestion.end)
  }

  assert.equal(
    updated,
    'Because I am currently working on this project, could you review the changes now.',
  )
})

test('applying a suggestion in the reported sentence changes only its span', () => {
  const text = 'Due to the fact that I am currently working on this project, I just wanted to ask if you could possibly review the changes at this point in time.'
  const suggestion = findSuggestion(text, 'at this point in time')
  const updated = text.slice(0, suggestion.start) + suggestion.suggestion + text.slice(suggestion.end)

  assert.equal(
    updated,
    'Due to the fact that I am currently working on this project, I just wanted to ask if you could possibly review the changes now.',
  )
  assert.equal(updated.slice(0, suggestion.start), text.slice(0, suggestion.start))
  assert.equal(updated.slice(suggestion.start + suggestion.suggestion.length), text.slice(suggestion.end))
})

test('preserves all-uppercase capitalization and surrounding punctuation', () => {
  const text = 'DUE TO THE FACT THAT we were late, we missed it!'
  const suggestion = findSuggestion(text, 'DUE TO THE FACT THAT')

  assert.equal(suggestion.suggestion, 'BECAUSE')
  assert.equal(
    text.slice(0, suggestion.start) + suggestion.suggestion + text.slice(suggestion.end),
    'BECAUSE we were late, we missed it!',
  )
})

test('does not suggest changes to other valid request wording', () => {
  assert.deepEqual(
    suggestWritingImprovements('Could you please review the draft? I wanted to ask for your feedback.'),
    [],
  )
})

test('does not change concise wording or weaken uncertain contexts', () => {
  assert.deepEqual(
    suggestWritingImprovements('We finished to save time. The report is current now.'),
    [],
  )
  assert.deepEqual(
    suggestWritingImprovements('My note: I just wanted to ask if you could possibly send the report.'),
    [],
  )
})

test('does not rewrite a request embedded inside a sentence', () => {
  assert.deepEqual(
    suggestWritingImprovements('My colleague said I just wanted to reach out and ask if you could possibly review the draft.'),
    [],
  )
})

test('does not rewrite unsupported, already direct, or quoted request wording', () => {
  for (const text of [
    'Would it be possible for you to arrive before lunch?',
    'I wanted to ask whether you could possibly review the draft.',
    'Could you possibly send the file?',
    'The client asked, "Would it be possible for you to send the report?"',
  ]) {
    assert.deepEqual(suggestWritingImprovements(text), [], text)
  }
})

test('keeps one safe sentence rewrite when narrower style matches overlap it', () => {
  const text = 'I wanted to ask if you could possibly review the notes in order to send them due to the fact that the team is waiting.'
  const suggestions = suggestWritingImprovements(text)

  assert.equal(suggestions.length, 1)
  assert.equal(
    suggestions[0].original,
    'I wanted to ask if you could possibly review the notes in order to send them due to the fact that the team is waiting',
  )
  assert.equal(
    suggestions[0].suggestion,
    'Could you review the notes in order to send them due to the fact that the team is waiting',
  )
  assert.equal(text.slice(suggestions[0].start, suggestions[0].end), suggestions[0].original)
  assert.equal(
    text.slice(0, suggestions[0].start) + suggestions[0].suggestion + text.slice(suggestions[0].end),
    'Could you review the notes in order to send them due to the fact that the team is waiting.',
  )
})

test('keeps accurate offsets for multiple suggestions', () => {
  const text = 'In order to finish, we started early. Due to the fact that it was late, we left. I just wanted to reach out and ask if you could possibly review the draft.'
  const suggestions = suggestWritingImprovements(text)

  assert.equal(suggestions.length, 3)
  for (const suggestion of suggestions) {
    assert.equal(text.slice(suggestion.start, suggestion.end), suggestion.original)
  }
})

test('applying one suggestion leaves other text intact and finds updated offsets', () => {
  const text = 'In order to finish, we left due to the fact that it was late.'
  const [first] = suggestWritingImprovements(text)
  const updated = text.slice(0, first.start) + first.suggestion + text.slice(first.end)
  const remaining = suggestWritingImprovements(updated)

  assert.equal(updated, 'To finish, we left due to the fact that it was late.')
  assert.equal(remaining.length, 1)
  assert.equal(remaining[0].start, updated.indexOf('due to the fact that'))
  assert.equal(updated.slice(remaining[0].start, remaining[0].end), remaining[0].original)
})

test('keeps grammar and style spans separate and applies them safely in a passage', () => {
  const originalText =
    'Due to the fact that they was late, I just wanted to ask if you could possibly review the draft at this point in time.'
  const grammarIssues = checkWriting(originalText)
  const styleSuggestions = suggestWritingImprovements(originalText)
  const highlightedSpans = [...grammarIssues, ...styleSuggestions]
    .sort((a, b) => a.start - b.start)
    .map(({ original, suggestion, type, start, end }) => ({
      original,
      suggestion,
      type,
      start,
      end,
      highlightedText: originalText.slice(start, end),
    }))

  assert.deepEqual(
    grammarIssues.map(({ original, suggestion, type }) => ({ original, suggestion, type })),
    [{ original: 'they was', suggestion: 'they were', type: 'grammar' }],
  )
  assert.deepEqual(
    styleSuggestions.map(({ original, suggestion, type }) => ({ original, suggestion, type })),
    [
      { original: 'Due to the fact that', suggestion: 'Because', type: 'style' },
      {
        original: 'I just wanted to ask if you could possibly review the draft',
        suggestion: 'could you review the draft',
        type: 'style',
      },
      { original: 'at this point in time', suggestion: 'now', type: 'style' },
    ],
  )
  for (let index = 0; index < highlightedSpans.length; index += 1) {
    const span = highlightedSpans[index]
    assert.equal(span.highlightedText, span.original)
    if (index > 0) {
      assert.ok(highlightedSpans[index - 1].end <= span.start)
    }
  }

  let updatedText = originalText
  const applyCurrent = (engine, original) => {
    const result = engine(updatedText).find((item) => item.original === original)
    assert.ok(result, `Expected current text to include a result for "${original}"`)
    assert.equal(updatedText.slice(result.start, result.end), result.original)
    updatedText =
      updatedText.slice(0, result.start) +
      result.suggestion +
      updatedText.slice(result.end)
  }

  applyCurrent(checkWriting, 'they was')
  applyCurrent(suggestWritingImprovements, 'Due to the fact that')
  applyCurrent(suggestWritingImprovements, 'I just wanted to ask if you could possibly review the draft')
  applyCurrent(suggestWritingImprovements, 'at this point in time')

  assert.equal(
    updatedText,
    'Because they were late, could you review the draft now.',
  )
})
