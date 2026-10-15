
import test from 'node:test'
import assert from 'node:assert/strict'
import { checkWriting } from './grammarChecker.ts'

function findIssue(text, original) {
  const issue = checkWriting(text).find(
    (item) => item.original === original,
  )

  assert.ok(
    issue,
    `Expected Oxford to flag "${original}" in: ${text}`,
  )

  return issue
}

test('corrects common spelling mistakes', () => {
  const text = 'I recieved teh letter.'

  assert.equal(findIssue(text, 'recieved').suggestion, 'received')
  assert.equal(findIssue(text, 'teh').suggestion, 'the')
})

test('corrects subject–verb agreement', () => {
  const issue = findIssue('They was late.', 'They was')

  assert.equal(issue.suggestion, 'They were')
  assert.equal(issue.type, 'grammar')
})

test('corrects common your/you’re mistakes', () => {
  const issue = findIssue('Your going to love this.', 'Your going to')

  assert.equal(issue.suggestion, "You're going to")
})

test('does not flag valid possessive your or its', () => {
  const text =
    'Your welcome gift is here. The company changed its policy. Your writing is clear.'

  const issues = checkWriting(text)

  assert.equal(
    issues.some((issue) => issue.original === 'Your'),
    false,
  )

  assert.equal(
    issues.some((issue) => issue.original.toLowerCase() === 'its'),
    false,
  )
})

test('handles common article exceptions', () => {
  const text = 'She attends a university and waited an hour.'
  const issues = checkWriting(text)

  assert.equal(
    issues.some((issue) => /^(a university|an hour)$/i.test(issue.original)),
    false,
  )
})

test('detects repeated words', () => {
  const issue = findIssue('I went to to the store.', 'to to')

  assert.equal(issue.suggestion, 'to')
})

test('preserves capitalization in spelling corrections', () => {
  assert.equal(findIssue('Recieve the letter.', 'Recieve').suggestion, 'Receive')
  assert.equal(findIssue('RECIEVE the letter.', 'RECIEVE').suggestion, 'RECEIVE')
})

test('capitalizes the start of a sentence', () => {
  const issue = findIssue('hello world.', 'h')

  assert.equal(issue.suggestion, 'H')
})

test('all issue positions match the original text', () => {
  const text = 'They was late, and I recieved teh letter.'

  for (const issue of checkWriting(text)) {
    assert.ok(issue.start >= 0)
    assert.ok(issue.end <= text.length)

    assert.equal(
      text.slice(issue.start, issue.end),
      issue.original,
    )
  }
})

test('does not return overlapping issues', () => {
  const text = 'They was late, and I recieved teh letter.'
  const issues = checkWriting(text)

  for (let i = 1; i < issues.length; i++) {
    assert.ok(
      issues[i].start >= issues[i - 1].end,
      `Overlapping issues: "${issues[i - 1].original}" and "${issues[i].original}"`,
    )
  }
})
