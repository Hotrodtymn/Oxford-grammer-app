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

test('corrects subject–verb agreement', () => {
  const issue = findIssue('They was late.', 'They was')
  assert.equal(issue.suggestion, 'They were')
  assert.equal(issue.type, 'grammar')
})

test('corrects your when you mean you are', () => {
  assert.equal(findIssue('Your going to love this.', 'Your going to').suggestion, "You're going to")
})

test('does not flag valid possessive your or its', () => {
  const issues = checkWriting('Your welcome gift is here. The company changed its policy. Your writing is clear.')
  assert.equal(issues.some((issue) => issue.original === 'Your'), false)
  assert.equal(issues.some((issue) => issue.original.toLowerCase() === 'its'), false)
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

test('does not return overlapping issues', () => {
  const issues = checkWriting('They was late, and I recieved teh letter.')
  for (let i = 1; i < issues.length; i++) {
    assert.ok(issues[i].start >= issues[i - 1].end)
  }
})
