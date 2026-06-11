import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { moderateChatMessage } from '../../lib/chatModeration.ts'

describe('moderateChatMessage', () => {
  it('allows friendly messages', () => {
    const result = moderateChatMessage('good luck!')
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.text, 'good luck!')
  })

  it('blocks toxic gaming slang', () => {
    const result = moderateChatMessage('ez noob')
    assert.equal(result.ok, false)
  })

  it('blocks profanity', () => {
    const result = moderateChatMessage('you are a bitch')
    assert.equal(result.ok, false)
  })

  it('rejects empty messages', () => {
    const result = moderateChatMessage('   ')
    assert.equal(result.ok, false)
  })
})
