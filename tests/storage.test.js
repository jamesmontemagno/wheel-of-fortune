import test from 'node:test'
import assert from 'node:assert/strict'
import { createStorage, recordGame, leaderboard } from '../src/storage.js'

function memoryStorage() {
  const values = new Map()
  return {
    get length() { return values.size },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
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
  assert.equal(blocked.saveHistory(recordGame([], finishedGame(), 'blocked')), false)
  assert.deepEqual(blocked.loadHistory(), [])
  assert.equal(blocked.loadPlayers().count, 2)
  for (const value of ['{broken', 'null', '{}', '{"count":3,"names":[null]}', '[{"players":null}]']) {
    const storage = createStorage(() => ({ length: 1, key: () => 'wheel-of-wisdom.history.v1.bad', getItem: () => value }))
    assert.deepEqual(storage.loadHistory(), [])
    assert.equal(storage.loadPlayers().count, 2)
  }
})

test('completed games persist snapshots exactly once, including a lost bonus', () => {
  const game = finishedGame()
  const history = recordGame([], game, 'one', '2026-09-20T12:00:00Z')
  assert.equal(recordGame(history, game, 'one'), history)
  game.players[0].total = 0
  assert.equal(history[0].players[0].total, 51000)
  assert.equal(recordGame(history, { ...game, phase: 'playing' }, 'two'), history)
  const lost = { ...finishedGame(), bonusWon: false, players: [{ name: 'Ada', total: 1000 }, { name: 'Grace', total: 0 }] }
  const both = recordGame(history, lost, 'two')
  const local = memoryStorage()
  const storage = createStorage(() => local)
  assert.equal(storage.saveHistory(both), true)
  assert.deepEqual(storage.loadHistory(), both)
  assert.equal(both[0].players[0].total, 1000)
})

test('history validation rejects invalid scores and champions without losing valid records', () => {
  const [entry] = recordGame([], finishedGame(), 'one')
  const values = [entry, { ...entry, champion: 9 }, { ...entry, finishedAt: 'bad' },
    { ...entry, players: [{ name: 'Ada', total: -1 }, { name: 'Grace', total: 0 }] }]
  const local = memoryStorage()
  values.forEach((entry, index) => local.setItem(`wheel-of-wisdom.history.v1.${index}`, JSON.stringify(entry)))
  const storage = createStorage(() => local)
  assert.deepEqual(storage.loadHistory(), [entry])
})

test('games saved from stale tabs never overwrite each other', () => {
  const local = memoryStorage()
  const firstTab = createStorage(() => local)
  const secondTab = createStorage(() => local)
  const firstHistory = firstTab.loadHistory()
  const secondHistory = secondTab.loadHistory()
  firstTab.saveHistory(recordGame(firstHistory, finishedGame(), 'one', '2026-09-20T12:00:00Z'))
  secondTab.saveHistory(recordGame(secondHistory, finishedGame(), 'two', '2026-09-21T12:00:00Z'))
  assert.deepEqual(firstTab.loadHistory().map((entry) => entry.id), ['two', 'one'])
  assert.equal(leaderboard(secondTab.loadHistory())[0].total, 102000)
})

test('history can be cleared after migration to native storage', () => {
  const local = memoryStorage()
  const storage = createStorage(() => local)
  storage.savePlayers(2, ['Ada', 'Grace', ''])
  storage.saveHistory(recordGame([], finishedGame(), 'one'))
  assert.equal(storage.clearHistory(), true)
  assert.deepEqual(storage.loadHistory(), [])
  assert.deepEqual(storage.loadPlayers(), { count: 2, names: ['Ada', 'Grace', ''] })
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

test('played puzzles persist and invalid entries are ignored', () => {
  const local = memoryStorage()
  const storage = createStorage(() => local)
  assert.deepEqual(storage.loadSeenPuzzles(), [])
  assert.equal(storage.saveSeenPuzzles(['puzzle-1-1', 'puzzle-1-1', 'puzzle-2-3', 7]), true)
  assert.deepEqual(createStorage(() => local).loadSeenPuzzles(), ['puzzle-1-1', 'puzzle-2-3'])
  local.setItem('wheel-of-wisdom.puzzles.v1', '{"nope":true}')
  assert.deepEqual(storage.loadSeenPuzzles(), [])
  local.setItem('wheel-of-wisdom.puzzles.v1', JSON.stringify([1, 'ok', 'x'.repeat(65)]))
  assert.deepEqual(storage.loadSeenPuzzles(), ['ok'])
  const blocked = createStorage(() => { throw new Error('Storage blocked') })
  assert.deepEqual(blocked.loadSeenPuzzles(), [])
  assert.equal(blocked.saveSeenPuzzles(['puzzle-1-1']), false)
})
