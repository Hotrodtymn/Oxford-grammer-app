import test from 'node:test'
import assert from 'node:assert/strict'
import { checkWriting } from './grammarChecker.ts'

function findIssue(text, original) {
  const issue = checkWriting(text).find(
    (item) => item.original === original,
  )

  assert.ok(issue, `Expected Oxford to flag "${original}" in: ${text}`)
  return issue
}

test('corrects common spelling mistakes', () => {
  assert.equal(findIssue('I recieved teh letter.', 'recieved').suggestion, 'received')
  assert.equal(findIssue('I recieved teh letter.', 'teh').suggestion, 'the')
})

test('corrects dont to don\'t', () => {
  assert.equal(findIssue('I dont know.', 'dont').suggestion, "don't")
  assert.equal(findIssue('DONT stop.', 'DONT').suggestion, "DON'T")
})

test('corrects subject–verb agreement', () => {
  const issue = findIssue('They was late.', 'They was')
  assert.equal(issue.suggestion, 'They were')
  assert.equal(issue.type, 'grammar')
})

test('returns one issue for subject–verb rules with shared corrections', () => {
  for (const [text, original, suggestion] of [
    ['She have a plan.', 'She have', 'She has'],
    ['He do the work.', 'He do', 'He does'],
  ]) {
    const matches = checkWriting(text).filter((issue) => issue.original === original)
    assert.equal(matches.length, 1)
    assert.equal(matches[0].suggestion, suggestion)
  }
})

test('corrects missing third-person singular verb endings', () => {
  const issue = findIssue('She go to work.', 'She go')
  assert.equal(issue.suggestion, 'She goes')
  assert.equal(issue.type, 'grammar')
})

test('uses the base verb after a modal', () => {
  const issue = findIssue('He can sings.', 'can sings')
  assert.equal(issue.suggestion, 'can sing')
})

test('uses a gerund after look forward to', () => {
  const issue = findIssue('I look forward to meet you.', 'look forward to meet')
  assert.equal(issue.suggestion, 'look forward to meeting')
})

test('flags a clear comma splice and suggests a semicolon', () => {
  const text = 'I went home, I ate dinner.'
  const issue = findIssue(text, ',')
  assert.equal(issue.suggestion, ';')
  assert.equal(
    text.slice(0, issue.start) + issue.suggestion + text.slice(issue.end),
    'I went home; I ate dinner.',
  )
})

test('flags a clear run-on between independent clauses', () => {
  const text = 'I went home I ate dinner.'
  const issue = findIssue(text, ' ')
  assert.equal(issue.suggestion, '; ')
  assert.equal(
    text.slice(0, issue.start) + issue.suggestion + text.slice(issue.end),
    'I went home; I ate dinner.',
  )
})

test('adds a missing space after sentence punctuation', () => {
  const text = 'I am here.She is there.'
  const issue = findIssue(text, '.S')
  assert.equal(issue.suggestion, '. S')
})

test('removes spaces before punctuation, including periods', () => {
  for (const [text, original, suggestion] of [
    ['Hello , world.', ' ,', ','],
    ['Is this right ?', ' ?', '?'],
    ['That is surprising .', ' .', '.'],
  ]) {
    assert.equal(findIssue(text, original).suggestion, suggestion)
  }
})

test('does not flag valid clause joins, abbreviations, or decimals', () => {
  const text = 'I went home, and I ate dinner. Dr.Smith paid 3.5 dollars.'
  const issues = checkWriting(text)
  assert.equal(issues.some((issue) => issue.message.includes('clauses may')), false)
  assert.equal(issues.some((issue) => issue.original === '.S'), false)
  assert.equal(issues.some((issue) => issue.original === '.5'), false)
})

test('corrects your when you mean you are', () => {
  assert.equal(findIssue('Your going to love this.', 'Your going to').suggestion, "You're going to")
})

test('does not flag valid possessive your or its', () => {
  const issues = checkWriting('Your welcome gift is here. The company changed its policy. Your writing is clear.')
  assert.equal(issues.some((issue) => issue.original === 'Your'), false)
  assert.equal(issues.some((issue) => issue.original.toLowerCase() === 'its'), false)
})

test('does not confuse possessive gerund phrases with you are or they are', () => {
  const text = 'Your going to the store was unexpected. Their going to work surprised us.'
  const issues = checkWriting(text)
  assert.equal(issues.some((issue) => /^(Your|Their) going to$/.test(issue.original)), false)
})

test('handles common article exceptions', () => {
  const issues = checkWriting('She attends a university and waited an hour.')
  assert.equal(issues.some((issue) => /^(a university|an hour)$/i.test(issue.original)), false)
})

test('detects repeated words', () => {
  assert.equal(findIssue('I went to to the store.', 'to to').suggestion, 'to')
})

test('preserves capitalization in spelling corrections', () => {
  assert.equal(findIssue('Recieve the letter.', 'Recieve').suggestion, 'Receive')
  assert.equal(findIssue('RECIEVE the letter.', 'RECIEVE').suggestion, 'RECEIVE')
})

test('preserves capitalization in grammar corrections', () => {
  assert.equal(findIssue('SHE CAN SINGS.', 'CAN SINGS').suggestion, 'CAN SING')
  assert.equal(findIssue('SHE GO to work.', 'SHE GO').suggestion, 'SHE GOES')
})

test('capitalizes the start of a sentence', () => {
  assert.equal(findIssue('hello world.', 'h').suggestion, 'H')
})

test('all issue positions match the original text', () => {
  const text = 'They was late, and I recieved teh letter.'
  for (const issue of checkWriting(text)) {
    assert.ok(issue.start >= 0)
    assert.ok(issue.end <= text.length)
    assert.equal(text.slice(issue.start, issue.end), issue.original)
  }
})

test('recomputes accurate issue offsets after applying a suggestion', () => {
  const original = 'She go home. I recieved teh letter.'
  const firstIssue = findIssue(original, 'She go')
  const corrected = original.slice(0, firstIssue.start) + firstIssue.suggestion + original.slice(firstIssue.end)
  const remaining = findIssue(corrected, 'recieved')

  assert.equal(remaining.start, corrected.indexOf('recieved'))
  assert.equal(corrected.slice(remaining.start, remaining.end), 'recieved')
})

test('does not return overlapping issues', () => {
  const issues = checkWriting('They was late, and I recieved teh letter.')
  for (let i = 1; i < issues.length; i++) {
    assert.ok(issues[i].start >= issues[i - 1].end)
  }
})


test('corrects commonly confused their and they’re', () => {
  const text = 'Their going to the store.'
  const sentenceStart = findIssue(text, 'Their going to the store')
  assert.equal(sentenceStart.suggestion, "They're going to the store")
  assert.equal(
    text.slice(0, sentenceStart.start) + sentenceStart.suggestion + text.slice(sentenceStart.end),
    "They're going to the store.",
  )

  assert.equal(
    findIssue('Their going to be late.', 'Their going to').suggestion,
    "They're going to",
  )

  assert.equal(
    findIssue('There going to be late.', 'There going to').suggestion,
    "They're going to",
  )
})

test('corrects there and their confusion', () => {
  assert.equal(
    findIssue('Their is a problem.', 'Their is').suggestion,
    'There is',
  )

  assert.equal(
    findIssue('Their were several options.', 'Their were').suggestion,
    'There were',
  )

  assert.equal(
    findIssue('There message is clear.', 'There message').suggestion,
    'Their message',
  )
})

test('corrects to much and to many', () => {
  assert.equal(
    findIssue('There is to much noise.', 'to much').suggestion,
    'too much',
  )

  assert.equal(
    findIssue('There are to many choices.', 'to many').suggestion,
    'too many',
  )
})

test('corrects its before an article when it means it is', () => {
  assert.equal(findIssue('Its a lovely day.', 'Its a').suggestion, "It's a")
  assert.equal(findIssue('The plan is its the best option.', 'its the').suggestion, "it's the")
})

test('corrects its before auxiliary verbs when it means it is or it has', () => {
  assert.equal(findIssue('Its been a long day.', 'Its been').suggestion, "It's been")
  assert.equal(findIssue('Its not ready.', 'Its not').suggestion, "It's not")
})

test('corrects its definitely going to', () => {
  assert.equal(
    findIssue('its definitely going to be a long day.', 'its definitely going to').suggestion,
    "it's definitely going to",
  )
})

test('corrects then in selected comparison phrases', () => {
  assert.equal(findIssue('I would rather then wait.', 'rather then').suggestion, 'rather than')
  assert.equal(findIssue('No sooner then we arrived, it rained.', 'No sooner then').suggestion, 'No sooner than')
  assert.equal(findIssue('There was no other then that route.', 'other then').suggestion, 'other than')
})

test('does not flag valid possessive its or temporal then', () => {
  const text = 'The dog chased its ball, then rested. The device uses its definitely readable display. It is better than nothing.'
  const issues = checkWriting(text)
  assert.equal(issues.some((issue) => /\bits\b/i.test(issue.original)), false)
  assert.equal(issues.some((issue) => /\bthen\b/i.test(issue.original)), false)
})

test('keeps valid uses of their, there, and its unflagged', () => {
  const text = 'Their message arrived. The message is there. The dog wagged its tail.'
  const issues = checkWriting(text)
  assert.equal(issues.some((issue) => issue.original === 'Their message'), false)
  assert.equal(issues.some((issue) => issue.original === 'there'), false)
  assert.equal(issues.some((issue) => issue.original === 'its tail'), false)
})

test('does not flag valid possessive their', () => {
  const issues = checkWriting(
    'Their car is outside. Their going was unexpected. Their going to the store was unexpected. I heard their going was unexpected.',
  )

  assert.equal(
    issues.some((issue) => issue.original === 'Their car'),
    false,
  )

  assert.equal(
    issues.some((issue) => issue.original === 'Their going'),
    false,
  )
})
