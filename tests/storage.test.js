import test from 'node:test'
import assert from 'node:assert/strict'
import { createStorage, recordGame, leaderboard } from '../src/storage.js'

function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

const finishedGame = () => ({
  phase: 'game-over',
  players: [{ name: 'Ada', total: 51000 }, { name: 'Grace', total: 2000 }],
  champion: 0,
  bonusWon: true,
  bonusPrizeLabel: 'A Shiny Little Roadster',
  bonusPrize: 50000,
})

test('player names and party size survive a new storage instance', () => {
  const local = memoryStorage()
  const storage = createStorage(() => local)
  assert.deepEqual(storage.loadPlayers(), { count: 2, names: ['', '', ''] })
  assert.equal(storage.savePlayers(3, ['Ada', 'Grace', 'Linus']), true)
  assert.deepEqual(createStorage(() => local).loadPlayers(), { count: 3, names: ['Ada', 'Grace', 'Linus'] })
})

test('blocked, corrupt, and malformed storage gracefully falls back', () => {
  const blocked = createStorage(() => { throw new Error('Storage blocked') })
  assert.equal(blocked.savePlayers(2, ['', '', '']), false)
  assert.equal(blocked.saveHistory([]), false)
  assert.deepEqual(blocked.loadHistory(), [])
  assert.equal(blocked.loadPlayers().count, 2)
  for (const value of ['{broken', 'null', '{}', '{"count":3,"names":[null]}', '[{"players":null}]']) {
    const storage = createStorage(() => ({ getItem: () => value }))
    assert.deepEqual(storage.loadHistory(), [])
    assert.equal(storage.loadPlayers().count, 2)
  }
})

test('completed games persist snapshots exactly once, including a lost bonus', () => {
  const game = finishedGame()
  const history = recordGame([], game, 'one')
  assert.equal(recordGame(history, game, 'one'), history)
  game.players[0].total = 0
  assert.equal(history[0].players[0].total, 51000)
  assert.equal(recordGame(history, { ...game, phase: 'playing' }, 'two'), history)
  const lost = { ...finishedGame(), bonusWon: false, players: [{ name: 'Ada', total: 1000 }, { name: 'Grace', total: 0 }] }
  const both = recordGame(history, lost, 'two')
  const storage = createStorage(() => local)
  const local = memoryStorage()
  assert.equal(storage.saveHistory(both), true)
  assert.deepEqual(storage.loadHistory(), both)
  assert.equal(both[0].players[0].total, 1000)
})

test('history validation rejects invalid scores and champions without losing valid records', () => {
  const [entry] = recordGame([], finishedGame(), 'one')
  const values = [entry, { ...entry, champion: 9 }, { ...entry, finishedAt: 'bad' },
    { ...entry, players: [{ name: 'Ada', total: -1 }, { name: 'Grace', total: 0 }] }]
  const storage = createStorage(() => ({ getItem: () => JSON.stringify(values) }))
  assert.deepEqual(storage.loadHistory(), [entry])
})

test('leaderboard sums final scores by trimmed case-insensitive names, with safe keys', () => {
  const history = [
    { players: [{ name: ' Ada ', total: 100 }, { name: 'Grace', total: 400 }] },
    { players: [{ name: 'ADA', total: 500 }, { name: '__proto__', total: 0 }] },
    { players: [{ name: 'Ada', total: 50 }, { name: 'ada', total: 50 }] },
  ]
  assert.deepEqual(leaderboard(history), [
    { name: 'Ada', total: 700, games: 3 },
    { name: 'Grace', total: 400, games: 1 },
    { name: '__proto__', total: 0, games: 1 },
  ])
})
