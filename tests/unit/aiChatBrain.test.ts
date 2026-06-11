import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateConversationalReply } from '../../lib/aiChatBrain.ts'

describe('generateConversationalReply', () => {
  it('responds to greetings', () => {
    const reply = generateConversationalReply('hi there!', [], 'easy')
    assert.match(reply, /hey|hi|hello|happy|ready/i)
  })

  it('responds to how are you', () => {
    const reply = generateConversationalReply('how are you?', [], 'easy')
    assert.match(reply, /how|great|wonderful|doing|hope|cheerful/i)
  })

  it('responds to thanks', () => {
    const reply = generateConversationalReply('thank you!', [], 'easy')
    assert.match(reply, /welcome|anytime|happy/i)
  })
})
