const PLAYERS_KEY = 'wheel-of-wisdom.players.v1'
const HISTORY_KEY = 'wheel-of-wisdom.history.v1'
const validName = (name) => typeof name === 'string' && name.length <= 24
const validScore = (score) => Number.isSafeInteger(score) && score >= 0

export function createStorage(getStorage = () => globalThis.localStorage) {
  function read(key) {
    try {
      return JSON.parse(getStorage().getItem(key))
    } catch {
      return null
    }
  }

  function write(key, value) {
    try {
      getStorage().setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }

  return {
    loadPlayers() {
      const saved = read(PLAYERS_KEY)
      if (![2, 3].includes(saved?.count) || !Array.isArray(saved.names) ||
          saved.names.length !== 3 || !saved.names.every(validName)) {
        return { count: 2, names: ['', '', ''] }
      }
      return saved
    },
    savePlayers: (count, names) => write(PLAYERS_KEY, { count, names }),
    loadHistory() {
      const saved = read(HISTORY_KEY)
      if (!Array.isArray(saved)) return []
      return saved.filter((entry) =>
        entry && typeof entry.id === 'string' &&
        typeof entry.finishedAt === 'string' && Number.isFinite(Date.parse(entry.finishedAt)) &&
        Array.isArray(entry.players) && [2, 3].includes(entry.players.length) &&
        entry.players.every((player) => player && validName(player.name) &&
          player.name.trim() && validScore(player.total)) &&
        Number.isInteger(entry.champion) && entry.champion >= 0 && entry.champion < entry.players.length &&
        typeof entry.bonusWon === 'boolean' && typeof entry.bonusPrizeLabel === 'string' &&
        validScore(entry.bonusPrize))
    },
    saveHistory: (history) => write(HISTORY_KEY, history),
  }
}

export function recordGame(history, game, id, finishedAt = new Date().toISOString()) {
  if (game.phase !== 'game-over' || history.some((entry) => entry.id === id)) return history
  return [{
    id,
    finishedAt,
    players: game.players.map(({ name, total }) => ({ name, total })),
    champion: game.champion,
    bonusWon: game.bonusWon,
    bonusPrizeLabel: game.bonusPrizeLabel,
    bonusPrize: game.bonusPrize,
  }, ...history]
}

export function leaderboard(history) {
  const scores = new Map()
  for (const game of history) {
    const participants = new Set()
    for (const player of game.players) {
      const key = player.name.trim().toLowerCase()
      const row = scores.get(key) ?? { name: player.name.trim(), total: 0, games: 0 }
      row.total += player.total
      if (!participants.has(key)) row.games += 1
      participants.add(key)
      scores.set(key, row)
    }
  }
  return [...scores.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}
