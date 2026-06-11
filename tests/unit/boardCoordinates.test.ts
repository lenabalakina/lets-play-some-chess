import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  chessSquareToWorld3D,
  getDisplayFiles,
  getDisplayRanks,
  getPlayerPerspective,
  canPlayerSelectPiece,
  getLegalTargetsForPlayer,
} from '../../features/chess/boardCoordinates.ts'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('boardCoordinates', () => {
  it('getPlayerPerspective returns assigned color', () => {
    assert.equal(getPlayerPerspective('w'), 'w')
    assert.equal(getPlayerPerspective('b'), 'b')
  })

  it('white perspective: a1 bottom-left, h8 top-right in world space', () => {
    const [ax, , az] = chessSquareToWorld3D('a1', 'w')
    const [hx, , hz] = chessSquareToWorld3D('h8', 'w')
    assert.ok(ax < hx, 'a-file should be left of h-file for white')
    assert.ok(az > hz, 'rank 1 should be nearer (+Z) than rank 8 for white')
  })

  it('black perspective: mirrors files so a is on the right', () => {
    const [aFileX] = chessSquareToWorld3D('a1', 'b')
    const [hFileX] = chessSquareToWorld3D('h1', 'b')
    assert.ok(aFileX > hFileX, 'a-file should be right of h-file for black')
  })

  it('black perspective: rank 8 nearer to black camera (-Z)', () => {
    const [, , r8z] = chessSquareToWorld3D('a8', 'b')
    const [, , r1z] = chessSquareToWorld3D('a1', 'b')
    assert.ok(r8z < r1z, 'rank 8 should be closer to black side (-Z)')
  })

  it('display files/ranks reverse for black (matches 2D board)', () => {
    assert.deepEqual(getDisplayFiles('w'), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    assert.deepEqual(getDisplayFiles('b'), ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'])
    assert.deepEqual(getDisplayRanks('w'), ['1', '2', '3', '4', '5', '6', '7', '8'])
    assert.deepEqual(getDisplayRanks('b'), ['8', '7', '6', '5', '4', '3', '2', '1'])
  })

  it('canPlayerSelectPiece: white can select e2 pawn on turn 1', () => {
    assert.equal(canPlayerSelectPiece(START_FEN, 'e2', 'w', true), true)
  })

  it('canPlayerSelectPiece: black cannot select on white turn', () => {
    assert.equal(canPlayerSelectPiece(START_FEN, 'e7', 'b', false), false)
  })

  it('canPlayerSelectPiece: cannot select opponent piece on your turn', () => {
    assert.equal(canPlayerSelectPiece(START_FEN, 'e7', 'w', true), false)
  })

  it('getLegalTargetsForPlayer returns e3/e4 for e2 pawn', () => {
    const targets = getLegalTargetsForPlayer(START_FEN, 'e2', 'w')
    assert.ok(targets.includes('e3'))
    assert.ok(targets.includes('e4'))
  })

  it('getLegalTargetsForPlayer returns empty for opponent square', () => {
    assert.deepEqual(getLegalTargetsForPlayer(START_FEN, 'e7', 'w'), [])
  })
})
