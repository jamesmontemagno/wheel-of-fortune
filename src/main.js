import './style.css'
import {
  WHEEL_SEGMENTS, BONUS_WHEEL, VOWELS, TURN_SECONDS, BONUS_SECONDS, wheelForGame,
  BONUS_PICK_SECONDS, FINAL_ROUND, bonusLettersRemaining,
  createGame, spinWheel, guessLetter, solvePuzzle, expireTurn, usablePuzzleHistory,
  nextRound, spinBonusWheel, chooseBonusLetter, solveBonus, expireBonus, expireBonusPick,
  isLetterRevealed,
} from './game.js'
import { createStorage, recordGame, leaderboard } from './storage.js'
import { setupPWA } from './pwa.js'

const app = document.querySelector('#app')
const money = (value) => `$${value.toLocaleString('en-US')}`
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char])
const icons = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  spin: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.5-2L20 8M4 16l2.4 3A7 7 0 0 0 18 17"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4zM16 9l6 6m0-6-6 6"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6m-4 1h8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5m0 3v.1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  plane: '<path d="M10 3.5 21 12l-11 8.5 2-8.5z"/><path d="M3 12h9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12M12 9C9 9 7 8 7 6.5A2.5 2.5 0 0 1 12 6a2.5 2.5 0 0 1 5 .5C17 8 15 9 12 9z"/>',
}
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
const colors = ['#e7ab65', '#a8cdbb', '#e78371', '#f1d98a', '#a7bcd4', '#e9cb74', '#d0bbd9', '#e9ba76', '#aed0bd', '#dce1d8', '#e68b7a', '#aebfd7']

let game = null
const storage = createStorage()
const savedPlayers = storage.loadPlayers()
let playerCount = savedPlayers.count
let names = savedPlayers.names
let history = storage.loadHistory()
let seenPuzzleIds = usablePuzzleHistory(storage.loadSeenPuzzles())
let gameId
let gameRecorded = false
let lobbyPage = 'play'
let storageFailed = false
let spinning = false
let wheelAngle = 0
let vowelMode = false
let sound = false
let audio
let bonusDeadline = 0
let bonusTimer
let pickDeadline = 0
let pickTimer
let turnTimer
let turnKey = ''
let turnRemaining = TURN_SECONDS * 1000
let turnLastTick = 0
let dialogReturnFocus

function activeWheel() {
  if (!game) return WHEEL_SEGMENTS
  if (['bonus-spin', 'bonus-pick', 'bonus-solve', 'game-over'].includes(game.phase)) return BONUS_WHEEL
  return wheelForGame(game)
}

function wheelMarkup(preview = false, segments = activeWheel()) {
  const size = segments.length
  const angle = 360 / size
  const point = (degrees, radius) => {
    const radians = degrees * Math.PI / 180
    return [160 + radius * Math.cos(radians), 160 + radius * Math.sin(radians)]
  }
  const sectors = segments.map((segment, index) => {
    const center = -90 + index * angle
    const start = point(center - angle / 2, 151)
    const end = point(center + angle / 2, 151)
    const label = segment.type === 'cash' ? money(segment.value) : segment.label.toUpperCase()
    const fill = segment.type === 'bankrupt' ? '#283e36'
      : segment.type === 'trip' ? '#63a2c4'
        : segment.type === 'mystery' ? (index % 2 ? '#3f6f57' : '#d8b25f')
          : colors[index % colors.length]
    const ink = segment.type === 'bankrupt' || segment.type === 'trip' ? '#fff9ed' : segment.type === 'mystery' ? '#fffdf0' : '#243f35'
    const fontSize = segment.type === 'mystery' ? 22 : segment.type === 'cash' ? (size > 14 ? 11 : 13) : 9
    return `<g>
      <path d="M160 160 L${start.join(' ')} A151 151 0 0 1 ${end.join(' ')} Z" fill="${fill}" stroke="#fff8e9" stroke-width="1.5"/>
      <text x="160" y="48" transform="rotate(${index * angle} 160 160)" text-anchor="middle" fill="${ink}" font-size="${fontSize}" font-weight="800">${escape(label)}</text>
    </g>`
  }).join('')
  return `<div class="wheel-wrap ${preview ? 'wheel-preview' : ''}">
    <span class="wheel-pointer" aria-hidden="true"></span>
    <div class="wheel-outer">
      <svg class="wheel-disc" viewBox="0 0 320 320" style="transform:rotate(${wheelAngle}deg)" role="img" aria-label="${segments === BONUS_WHEEL ? 'Mystery prize wheel with sealed envelopes' : 'Prize wheel with cash, trip surprises, Bankrupt, and Lose a Turn spaces'}">
        <circle cx="160" cy="160" r="159" fill="#264b3b"/>
        ${sectors}
        ${Array.from({ length: size }, (_, i) => {
          const p = point(i * angle - 90 - angle / 2, 155)
          return `<circle cx="${p[0]}" cy="${p[1]}" r="2" fill="#fff9eb"/>`
        }).join('')}
      </svg>
      <div class="wheel-hub" aria-hidden="true"><span>✦</span></div>
    </div>
  </div>`
}

function header() {
  return `<header class="site-header">
    <a class="brand" href="./" aria-label="Wheel of Wisdom home"><span class="brand-mark" aria-hidden="true">✳</span><span>WHEEL <span class="brand-of">of</span><br>WISDOM<span class="brand-dot">.</span></span></a>
    <div class="header-actions">
      ${game ? `<button class="icon-button" id="new-game" aria-label="End game and return home" ${spinning ? 'disabled' : ''}>${icon('home')}</button>` : '<span class="header-note">A good time, all around.</span>'}
      <button class="icon-button" id="sound-toggle" aria-label="Turn sound ${sound ? 'off' : 'on'}" aria-pressed="${sound}">${icon(sound ? 'sound' : 'mute')}</button>
      <button class="icon-button" id="help" aria-label="How to play">${icon('help')}</button>
    </div>
  </header>`
}

function shell(content) {
  app.innerHTML = `${header()}
    ${!game ? `<nav class="lobby-tabs" aria-label="Game sections"><button id="play-tab" aria-pressed="${lobbyPage === 'play'}" class="${lobbyPage === 'play' ? 'selected' : ''}">${icon('spin')} Play</button><button id="history-tab" aria-pressed="${lobbyPage === 'history'}" class="${lobbyPage === 'history' ? 'selected' : ''}">${icon('trophy')} History</button></nav>` : ''}
    <p id="storage-notice" class="storage-notice" role="status">${storageFailed ? 'Local saving is unavailable. New names and results will only last for this visit.' : ''}</p>
    <main id="main">${content}</main>
    <footer class="site-footer"><span>A little luck. A lot of wordplay.</span><span>Made for your kind of game night <span aria-hidden="true">✦</span></span></footer>
    <dialog id="modal" aria-labelledby="dialog-title"></dialog>`
  document.querySelector('#help').onclick = showHelp
  document.querySelector('#sound-toggle').onclick = () => {
    sound = !sound
    const button = document.querySelector('#sound-toggle')
    button.innerHTML = icon(sound ? 'sound' : 'mute')
    button.setAttribute('aria-label', `Turn sound ${sound ? 'off' : 'on'}`)
    button.setAttribute('aria-pressed', String(sound))
    tone(520)
  }
  document.querySelector('.brand').onclick = (event) => {
    event.preventDefault()
    if (game && !spinning) confirmNewGame()
    else if (!game) { lobbyPage = 'play'; renderLobby() }
  }
  document.querySelector('#new-game')?.addEventListener('click', confirmNewGame)
  document.querySelector('#play-tab')?.addEventListener('click', () => {
    lobbyPage = 'play'
    renderLobby()
    document.querySelector('#play-tab').focus()
  })
  document.querySelector('#history-tab')?.addEventListener('click', () => {
    readNames()
    lobbyPage = 'history'
    renderHistory()
    document.querySelector('#history-tab').focus()
  })
}

function renderLobby() {
  lobbyPage = 'play'
  shell(`<section class="lobby">
    <div class="lobby-intro">
      <div class="eyebrow"><span class="tiny-star">✦</span> YOUR POCKET-SIZED GAME NIGHT</div>
      <h1>Good company.<br><span>Great guesses.</span></h1>
      <p class="intro-copy">Gather your people. Give it a spin.<br>Your next “I knew that!” moment starts here.</p>
      <div class="lobby-wheel">
        <span class="orbit-note note-one">a twist of luck <span aria-hidden="true">↘</span></span>
        ${wheelMarkup(true)}
        <span class="orbit-star star-one" aria-hidden="true">✧</span><span class="orbit-star star-two" aria-hidden="true">✳</span>
        <span class="wheel-sticker">${icon('trophy')} BIG WORDS.<br>BIGGER WINS.</span>
      </div>
      <div class="game-facts"><span>${icon('people')} 2–3 players</span><span>${icon('spin')} ${FINAL_ROUND} rounds + bonus</span><span>${icon('phone')} One phone</span></div>
    </div>
    <section class="setup-card" aria-labelledby="setup-title">
      <span class="card-eyebrow">FIRST THINGS FIRST</span>
      <h2 id="setup-title">Who’s playing?</h2>
      <p>Same couch. Same phone. Friendly rivalry.</p>
      <fieldset class="player-picker"><legend>Pick your party size</legend><div class="segmented-control">
        <button type="button" data-count="2" aria-pressed="${playerCount === 2}" class="${playerCount === 2 ? 'selected' : ''}">${icon('people')} 2 players</button>
        <button type="button" data-count="3" aria-pressed="${playerCount === 3}" class="${playerCount === 3 ? 'selected' : ''}">${icon('people')} 3 players</button>
      </div></fieldset>
      <form id="setup-form">
        <div class="player-inputs">${Array.from({ length: playerCount }, (_, i) => `<label class="player-field"><span class="player-avatar color-${i}">${String(i + 1).padStart(2, '0')}</span><span class="field-content"><span>PLAYER ${i + 1}</span><input name="player-${i}" aria-label="Player ${i + 1} name" maxlength="24" autocomplete="off" placeholder="Player ${i + 1}" value="${escape(names[i])}"></span><span class="field-spark" aria-hidden="true">${['✳', '✦', '✿'][i]}</span></label>`).join('')}</div>
        <div class="setup-note"><span aria-hidden="true">✧</span><span>New puzzles. Random categories.<br>A different game, every single time.</span></div>
        <button class="button button-primary start-button" type="submit">Let’s play ${icon('arrow')}</button>
      </form>
      <span class="setup-footnote">No sign-ups. Just pass the phone.</span>
    </section>
  </section>
  <section class="how-strip" aria-label="The basics">
    <div><span class="step-number">01</span><span><strong>Spin for your wisdom</strong><small>Big prizes. A few plot twists.</small></span></div>
    <div><span class="step-number">02</span><span><strong>Find the missing letters</strong><small>Trust your gut. Or buy a vowel.</small></span></div>
    <div><span class="step-number">03</span><span><strong>Make your winning guess</strong><small>Solve it. Bank it. Celebrate it.</small></span></div>
  </section>`)
  document.querySelectorAll('[data-count]').forEach((button) => {
    button.onclick = () => {
      readNames()
      playerCount = Number(button.dataset.count)
      savePlayers()
      renderLobby()
      document.querySelector(`[data-count="${playerCount}"]`).focus()
    }
  })
  document.querySelector('#setup-form').onsubmit = (event) => {
    event.preventDefault()
    readNames()
    game = createGame(names.slice(0, playerCount).map((name, i) => name.trim() || `Player ${i + 1}`), Math.random, seenPuzzleIds)
    rememberPuzzles()
    gameId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    gameRecorded = false
    tone(660)
    renderGame()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  document.querySelector('#setup-form').addEventListener('input', readNames)
}

// Boards are remembered across games so the same puzzle is not shown again.
function rememberPuzzles() {
  seenPuzzleIds = usablePuzzleHistory(game.usedPuzzleIds)
  checkSaved(storage.saveSeenPuzzles(seenPuzzleIds))
}

function readNames() {
  document.querySelectorAll('.player-field input').forEach((input, i) => { names[i] = input.value })
  savePlayers()
}

function checkSaved(success) {
  if (success) return
  storageFailed = true
  const notice = document.querySelector('#storage-notice')
  if (notice) notice.textContent = 'Local saving is unavailable. New names and results will only last for this visit.'
}

function savePlayers() {
  checkSaved(storage.savePlayers(playerCount, names))
}

function renderHistory() {
  history = [...new Map([...history, ...storage.loadHistory()].map((entry) => [entry.id, entry])).values()]
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
  const scores = leaderboard(history)
  shell(`<section class="history-page" aria-labelledby="history-title">
    <span class="card-eyebrow">THE GAME-NIGHT HALL OF FAME</span>
    <h1 id="history-title">Good times. Great scores.</h1>
    <p class="history-note">Completed games, saved on this device. Scores include banked trips and won bonus prizes.</p>
    ${history.length ? `<div class="history-layout">
      <section class="history-card" aria-labelledby="leaderboard-title"><h2 id="leaderboard-title">${icon('trophy')} Leaderboard</h2>
        <p class="history-note">Names are combined regardless of capitalization.</p>
        <ol class="leaderboard">${scores.map((player, index) => `<li><span class="rank">${index + 1}</span><span class="history-player"><strong>${escape(player.name)}</strong><small>${player.games} game${player.games === 1 ? '' : 's'}</small></span><b>${money(player.total)}</b></li>`).join('')}</ol>
      </section>
      <section class="history-card" aria-labelledby="past-games-title"><h2 id="past-games-title">Past games</h2>
        <ol class="history-games">${history.map((entry) => `<li>
          <time datetime="${escape(entry.finishedAt)}">${escape(new Date(entry.finishedAt).toLocaleString())}</time>
          <h3>${escape(entry.players[entry.champion].name)} takes the crown</h3>
          <div class="final-rankings">${[...entry.players].sort((a, b) => b.total - a.total).map((player) => `<div><span>${escape(player.name)}</span><strong>${money(player.total)}</strong></div>`).join('')}</div>
          <p class="history-note">${entry.bonusWon ? 'Bonus won' : 'Bonus revealed, not won'}: ${escape(entry.bonusPrizeLabel)} · ${money(entry.bonusPrize)}</p>
        </li>`).join('')}</ol>
      </section>
    </div>` : `<div class="history-card history-empty">${icon('trophy')}<h2>Your first chapter awaits.</h2><p>Finish a game to save the scores and start your leaderboard.</p></div>`}
    <p class="history-note">Pretend prizes, real bragging rights. Clearing browser data removes saved names and history.</p>
  </section>`)
}

function boardMarkup() {
  const words = game.puzzle.phrase.split(' ')
  const longest = Math.max(...words.map((word) => word.length))
  const isBonus = ['bonus-spin', 'bonus-pick', 'bonus-solve', 'game-over'].includes(game.phase)
  return `<section class="puzzle-section" aria-label="Puzzle board">
    <div class="puzzle-heading"><span class="category"><span aria-hidden="true">✦</span> ${escape(game.puzzle.category)}</span><span class="puzzle-meta">${isBonus ? 'THE FINAL CHALLENGE' : `${game.puzzle.phrase.replace(/[^A-Z]/gi, '').length} LETTERS`}</span></div>
    <div class="puzzle-board" style="--longest-word:${longest}">
      <div class="puzzle-words">${words.map((word) => `<div class="puzzle-word">${[...word].map((letter) => {
        const shown = isLetterRevealed(game, letter)
        return `<span class="letter-tile ${shown ? 'revealed' : ''} ${/[A-Z]/i.test(letter) ? '' : 'punctuation'}" aria-label="${shown ? escape(letter) : 'Hidden letter'}">${shown ? escape(letter) : '<span aria-hidden="true">·</span>'}</span>`
      }).join('')}</div>`).join('')}</div>
      <div class="board-caption" aria-hidden="true"><span></span> A LITTLE PIECE OF THE PUZZLE <span></span></div>
    </div>
  </section>`
}

// The bonus puzzle stays hidden until the envelope is locked in.
function sealedBoardMarkup() {
  return `<section class="puzzle-section sealed-board" aria-label="Puzzle board">
    <div class="puzzle-heading"><span class="category"><span aria-hidden="true">✦</span> BONUS PUZZLE</span><span class="puzzle-meta">SEALED</span></div>
    <div class="puzzle-board sealed"><p>${icon('gift')}<span>Your bonus puzzle stays covered until your envelope is locked in. Spin first!</span></p></div>
  </section>`
}

function playerMarkup() {
  return `<div class="scoreboard" style="--players:${game.players.length}" aria-label="Player scores">${game.players.map((player, i) => `
    <div class="player-score color-${i} ${game.activePlayer === i ? 'active-player' : ''}">
      <div class="score-name"><span class="score-dot" aria-hidden="true"></span><span>${escape(player.name)}</span>${game.activePlayer === i ? '<span class="turn-tag">UP</span>' : ''}</div>
      <strong>${money(player.round)}</strong><span class="banked-label">BANKED <b>${money(player.total)}</b></span>
      ${player.trips.length > 0 ? `<span class="trip-tag">${icon('plane')} ${player.trips.length} TRIP${player.trips.length === 1 ? '' : 'S'} HELD</span>` : ''}
    </div>`).join('')}</div>`
}

function turnBannerMarkup() {
  if (game.phase !== 'playing') return ''
  const player = game.players[game.activePlayer]
  return `<div class="turn-banner color-${game.activePlayer}" aria-live="polite">
    <span class="turn-banner-pulse" aria-hidden="true"></span>
    <span class="turn-banner-name"><small>IT’S YOUR TURN</small><strong>${escape(player.name)}</strong></span>
    <span class="turn-clock" id="turn-clock" role="timer" aria-label="Seconds left in this turn">${icon('clock')}<span id="turn-seconds">${TURN_SECONDS}</span><small>SEC</small></span>
  </div>`
}

function keyboardMarkup() {
  const bonus = game.phase === 'bonus-pick'
  const remaining = bonusLettersRemaining(game)
  const enabled = (letter) => {
    if (spinning) return false
    if (bonus) return !'RSTLNE'.includes(letter) && !game.bonusLetters.includes(letter) && (VOWELS.includes(letter) ? remaining.vowels > 0 : remaining.consonants > 0)
    if (game.phase !== 'playing' || game.usedLetters.includes(letter)) return false
    return vowelMode ? VOWELS.includes(letter) : game.action === 'consonant' && !VOWELS.includes(letter)
  }
  return `<section class="keyboard-section" aria-label="${bonus ? 'Choose bonus letters' : 'Choose a letter'}">
    <div class="keyboard-heading"><h3>${bonus ? 'Make those four letters count.' : vowelMode ? 'A little help for $250.' : game.action === 'consonant' ? 'Trust your letter instinct.' : 'Your next lucky letter?'}</h3><span>${bonus ? `${remaining.consonants} CONSONANT${remaining.consonants === 1 ? '' : 'S'} LEFT · ${remaining.vowels} VOWEL${remaining.vowels === 1 ? '' : 'S'} LEFT` : vowelMode ? 'PICK A VOWEL' : 'PICK A CONSONANT'}</span></div>
    <div class="keyboard">${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row) => `<div class="keyboard-row">${[...row].map((letter) => {
      const used = bonus ? 'RSTLNE'.includes(letter) || game.bonusLetters.includes(letter) : game.usedLetters.includes(letter)
      return `<button class="letter-key ${used ? 'used' : ''} ${VOWELS.includes(letter) ? 'vowel' : ''}" data-letter="${letter}" ${enabled(letter) ? '' : 'disabled'} aria-label="${letter}${used ? ', already chosen' : ''}">${letter}</button>`
    }).join('')}</div>`).join('')}</div>
    <p class="keyboard-footnote">${bonus ? `R, S, T, L, N, E are on the house. Pick within ${BONUS_PICK_SECONDS} seconds, then ${BONUS_SECONDS} seconds to solve.` : vowelMode ? 'Vowels cost $250, whether or not they’re in the puzzle.' : 'Spin for consonants. Buy a vowel. Or go for the solve.'}</p>
  </section>`
}

function playingControls() {
  const canBuy = game.action === 'spin' && game.players[game.activePlayer].round >= 250 && [...VOWELS].some((l) => !game.usedLetters.includes(l))
  return `<section class="wheel-panel ${spinning ? 'spinning' : ''}" aria-label="Spin and actions">
    <div class="wheel-panel-heading"><span class="card-eyebrow">A LITTLE LUCK GOES A LONG WAY</span><span aria-hidden="true">✧</span></div>
    ${wheelMarkup()}
    <div class="wheel-result">${spinning ? 'Round and round we go…' : game.pendingTrip ? `<strong>${escape(game.pendingTrip.label)}</strong>` : game.action === 'consonant' ? `<strong>${money(game.pendingValue)}</strong> per consonant` : game.lastSpin ? escape(game.lastSpin.label) : 'Your wisdom is one spin away.'}</div>
    <button class="button button-primary" id="spin" ${spinning || game.action !== 'spin' || vowelMode ? 'disabled' : ''}>${icon('spin')} ${spinning ? 'Spinning…' : 'Spin the wheel'}</button>
    <div class="secondary-actions"><button class="button button-secondary" id="buy-vowel" ${spinning || !canBuy ? 'disabled' : ''}>${vowelMode ? 'Cancel' : 'Buy a vowel'} <span>${vowelMode ? '' : '$250'}</span></button><button class="button button-secondary" id="solve" ${spinning ? 'disabled' : ''}>Solve it ${icon('arrow')}</button></div>
    <p class="wheel-note">${game.round === FINAL_ROUND ? '<strong class="double-stakes-note">DOUBLE STAKES · ALL CASH WEDGES PAY 2×</strong>' : 'Watch out for Bankrupt &amp; Lose a Turn.'}<br>${activeWheel().length} spaces this round${activeWheel().some((segment) => segment.type === 'trip') ? ' · trip surprises in play' : ''}</p>
  </section>`
}

const confettiMarkup = () => `<div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) =>
  `<span class="confetti-piece piece-${i % 6}" style="--x:${(i * 5.5 + 3).toFixed(1)}%;--delay:${(i % 9) * 0.12}s"></span>`).join('')}</div>`

function endRoundMarkup() {
  const player = game.players[game.roundWinner]
  return `<section class="celebration-card celebrating">${confettiMarkup()}<span class="celebration-icon" aria-hidden="true">✦</span><span class="card-eyebrow">NOW THAT’S A GOOD GUESS</span><h2>${escape(player.name)}<br>nailed it.</h2><p>The puzzle is solved and the winnings are safe.</p><div class="prize-amount">${money(player.total)}<span>TOTAL BANKED</span></div>${game.roundPrizes.length > 0 ? `<div class="trip-list">${game.roundPrizes.map((trip) => `<div>${icon('plane')}<span><strong>${escape(trip.label)}</strong><small>${escape(trip.note)}</small></span><b>${money(trip.value)}</b></div>`).join('')}</div>` : ''}<button class="button button-primary" id="next-round">${game.round === FINAL_ROUND ? 'On to the bonus round' : `Let’s play round ${game.round + 1}`} ${icon('arrow')}</button></section>`
}

function bonusMarkup() {
  const spinningWheel = game.phase === 'bonus-spin'
  const picking = game.phase === 'bonus-pick'
  const remaining = bonusLettersRemaining(game)
  const prizeBlock = spinningWheel
    ? `${wheelMarkup()}<p>Six sealed envelopes. One is yours.<br>Spin to lock in your mystery prize.</p><button class="button button-primary" id="bonus-spin" ${spinning ? 'disabled' : ''}>${icon('spin')} ${spinning ? 'Sealing your envelope…' : 'Spin for the mystery prize'}</button>`
    : `<div class="prize-amount mystery-prize">${icon('gift')}<span>ENVELOPE ${game.bonusSpin?.slot ?? '?'} · MYSTERY PRIZE</span></div>`
  return `<section class="bonus-card"><span class="celebration-icon" aria-hidden="true">${icon('trophy')}</span><span class="card-eyebrow">ONE LAST MOMENT OF MAGIC</span><h2>${escape(game.players[game.champion].name)},<br>this is your shot.</h2>
    ${prizeBlock}
    ${spinningWheel ? '' : picking ? `<div class="bonus-clock" id="pick-clock" role="timer" aria-label="Time remaining to pick letters"><span id="pick-seconds">${BONUS_PICK_SECONDS}</span><small>SECONDS TO PICK</small></div><p class="bonus-remaining" role="status">Still to pick: <strong>${remaining.consonants} consonant${remaining.consonants === 1 ? '' : 's'}</strong> and <strong>${remaining.vowels} vowel${remaining.vowels === 1 ? '' : 's'}</strong>.</p><p>We’ll give you <strong>R S T L N E</strong>.<br>Pick 3 more consonants and 1 vowel.<br>Solve to win cash, a car, or a dream getaway. We’ll open your envelope either way!</p>` : `<div class="bonus-clock" role="timer" aria-label="Time remaining"><span id="seconds-left">${BONUS_SECONDS}</span><small>SECONDS TO SOLVE</small></div><form id="bonus-form"><label class="sr-only" for="bonus-answer">Your bonus puzzle answer</label><input class="answer-input" id="bonus-answer" autocomplete="off" spellcheck="false" placeholder="Your winning answer…" maxlength="100" required><button class="button button-primary" type="submit">Lock in my answer ${icon('arrow')}</button></form>`}
  </section>`
}

function finalMarkup() {
  const champion = game.players[game.champion]
  const rankings = game.players.map((p, i) => ({ ...p, index: i })).sort((a, b) => b.total - a.total || (a.index === game.champion ? -1 : b.index === game.champion ? 1 : a.index - b.index))
  const prizeSymbol = { cash: '💵', car: '🚗', trip: '🌏', home: '🏡' }[game.bonusPrizeType] ?? '🎁'
  return `<section class="final-card celebrating">${confettiMarkup()}<span class="celebration-icon" aria-hidden="true">${icon('trophy')}</span><span class="card-eyebrow">THAT’S A WRAP, WORD WIZARDS</span><h2>${escape(champion.name)}<br>takes the crown.</h2><p>${game.bonusWon ? 'The bonus puzzle? Crushed it. What a finish.' : 'Not this time—but let’s see what was inside. Your banked winnings are safe.'}</p>
    <div class="envelope-reveal ${game.bonusWon ? 'bonus-win' : 'bonus-loss'}" aria-label="Opened bonus envelope">
      <div class="envelope-flap" aria-hidden="true"></div>
      <div class="envelope-prize"><span class="prize-symbol" aria-hidden="true">${prizeSymbol}</span><span class="card-eyebrow">${game.bonusWon ? 'YOU WON!' : 'INSIDE YOUR ENVELOPE · NOT WON'}</span><h3>${escape(game.bonusPrizeLabel)}</h3><strong>${money(game.bonusPrize)}</strong><p>${escape(game.bonusPrizeNote ?? '')}</p></div>
      <span class="envelope-front" aria-hidden="true">✦</span>
      ${game.bonusWon ? '<span class="prize-sparkles" aria-hidden="true">✦ ✧ ✦ ✧ ✦</span>' : ''}
    </div>
    <div class="final-rankings">${rankings.map((p, i) => `<div><span class="rank">${i + 1}</span><span>${escape(p.name)}</span><strong>${money(p.total)}</strong></div>`).join('')}</div><button class="button button-primary" id="play-again">One more round? ${icon('spin')}</button><button class="text-button" id="view-history">View history & leaderboard</button><span class="setup-footnote">${storageFailed ? 'Results kept for this visit only.' : 'Results saved on this device.'}</span></section>`
}

function renderGame() {
  if (game.phase === 'game-over' && !gameRecorded) {
    history = recordGame(history, game, gameId)
    gameRecorded = true
    checkSaved(storage.saveHistory(history))
  }
  const bonus = ['bonus-spin', 'bonus-pick', 'bonus-solve', 'game-over'].includes(game.phase)
  shell(`<section class="game-shell">
    <div class="game-topline"><div><span class="eyebrow">${bonus ? 'THE GRAND FINALE' : 'LET THE GOOD TIMES SPIN'}</span><h1>${game.phase === 'game-over' ? 'A game well played.' : bonus ? 'A little extra wisdom.' : `Round ${game.round}<span class="round-of"> / ${FINAL_ROUND}</span>${game.round === FINAL_ROUND ? '<span class="double-badge">DOUBLE STAKES</span>' : ''}`}</h1></div><div class="round-progress" aria-label="${bonus ? 'Bonus round' : `Round ${game.round} of ${FINAL_ROUND}`}">${Array.from({ length: FINAL_ROUND }, (_, i) => i + 1).map((r) => `<span class="${game.round >= r ? 'complete' : ''}">${r}</span>`).join('')}<span class="${bonus ? 'complete' : ''}">✦</span></div></div>
    ${!bonus && game.round === FINAL_ROUND ? '<div class="double-stakes-banner" role="status"><strong>DOUBLE STAKES</strong><span>Every cash wedge pays 2× this round.</span></div>' : ''}
    ${playerMarkup()}
    ${turnBannerMarkup()}
    <div class="turn-message" role="status" aria-live="polite"><span class="status-spark" aria-hidden="true">✳</span><span>${spinning ? 'A little suspense is part of the fun. Hold tight…' : escape(game.message)}</span></div>
    <div class="play-layout">
      <div class="puzzle-column">${game.phase === 'bonus-spin' ? sealedBoardMarkup() : boardMarkup()}${game.phase === 'playing' || game.phase === 'bonus-pick' ? keyboardMarkup() : `<div class="after-puzzle"><span aria-hidden="true">✧</span>${game.phase === 'round-end' ? 'Great minds. Good times. On to the next one.' : game.phase === 'game-over' ? 'The best part? You can do it all again.' : 'Deep breath. You’ve got this.'}</div>`}</div>
      ${game.phase === 'playing' ? playingControls() : game.phase === 'round-end' ? endRoundMarkup() : game.phase === 'game-over' ? finalMarkup() : bonusMarkup()}
    </div>
  </section>`)
  document.querySelectorAll('[data-letter]').forEach((button) => {
    button.onclick = () => act(() => {
      if (game.phase === 'bonus-pick') {
        chooseBonusLetter(game, button.dataset.letter)
        if (game.phase === 'bonus-solve') { clearInterval(pickTimer); startBonusTimer() }
      } else {
        guessLetter(game, button.dataset.letter)
        vowelMode = false
      }
      tone(480)
    })
  })
  document.querySelector('#spin')?.addEventListener('click', spin)
  document.querySelector('#bonus-spin')?.addEventListener('click', spinMystery)
  document.querySelector('#buy-vowel')?.addEventListener('click', () => { vowelMode = !vowelMode; renderGame() })
  document.querySelector('#solve')?.addEventListener('click', showSolve)
  document.querySelector('#next-round')?.addEventListener('click', () => act(() => { nextRound(game); rememberPuzzles(); vowelMode = false; wheelAngle = 0 }))
  document.querySelector('#play-again')?.addEventListener('click', reset)
  document.querySelector('#view-history')?.addEventListener('click', () => {
    reset()
    lobbyPage = 'history'
    renderHistory()
    document.querySelector('#history-tab').focus()
  })
  document.querySelector('#bonus-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const answer = document.querySelector('#bonus-answer').value
    if (!answer.trim()) return
    act(() => {
      if (Date.now() >= bonusDeadline) expireBonus(game)
      else solveBonus(game, answer)
      clearInterval(bonusTimer)
      if (game.bonusWon) fanfare()
      else tone(220, 0.3)
    })
  })
  if (game.phase === 'bonus-solve') updateClock()
  if (game.phase === 'bonus-pick') updatePickClock()
  syncTurnTimer()
}

function act(action) {
  if (spinning) return
  try {
    action()
    renderGame()
  } catch (error) {
    showDialog('Not quite yet', `<p>${escape(error.message)}</p><button class="button button-primary" data-close>Got it</button>`)
  }
}

// On phones the wheel takes over the screen in a modal so the spin is easy to follow.
function openSpinModal(title) {
  let dialog = document.querySelector('#spin-modal')
  if (!dialog) {
    dialog = document.createElement('dialog')
    dialog.id = 'spin-modal'
    dialog.className = 'spin-modal'
    document.body.append(dialog)
  }
  dialog.innerHTML = `<div class="spin-modal-card" role="status"><span class="card-eyebrow">${escape(title)}</span>${wheelMarkup()}<p>Round and round we go…</p></div>`
  if (!dialog.open) dialog.showModal()
  return dialog
}

function closeSpinModal() {
  const dialog = document.querySelector('#spin-modal')
  if (!dialog) return
  if (dialog.open) dialog.close()
  dialog.remove()
}

function animateSpin(result, landedIndex, segmentCount, onSettle) {
  spinning = true
  renderGame()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const duration = reduced ? 80 : 2800
  const onPhone = window.matchMedia('(max-width: 720px)').matches
  if (onPhone) {
    openSpinModal(result.phase === 'bonus-pick' ? 'SEALING YOUR ENVELOPE' : 'HERE WE GO')
  }
  const target = (360 - landedIndex * (360 / segmentCount)) % 360
  const current = ((wheelAngle % 360) + 360) % 360
  wheelAngle += 360 * 5 + ((target - current + 360) % 360)
  const wheels = [...document.querySelectorAll('.wheel-disc')]
  requestAnimationFrame(() => requestAnimationFrame(() => {
    wheels.forEach((wheel) => {
      wheel.style.transition = `transform ${duration}ms cubic-bezier(.15,.75,.13,1)`
      wheel.style.transform = `rotate(${wheelAngle}deg)`
    })
  }))
  tone(320, 0.12)
  setTimeout(() => {
    closeSpinModal()
    game = result
    spinning = false
    onSettle()
    renderGame()
    // The wheel grows on phones once it settles, so bring the result into view.
    if (onPhone) {
      document.querySelector('.wheel-wrap')?.scrollIntoView({
        block: 'center', behavior: reduced ? 'instant' : 'smooth',
      })
    }
  }, duration + 60)
}

function spin() {
  if (spinning || game.phase !== 'playing' || game.action !== 'spin') return
  const segmentCount = activeWheel().length
  const result = structuredClone(game)
  spinWheel(result)
  animateSpin(result, result.lastSpin.index, segmentCount, () => {
    tone(game.lastSpin.type === 'trip' ? 990 : game.lastSpin.type === 'cash' ? 720 : 180, game.lastSpin.type === 'trip' ? 0.3 : 0.2)
  })
}

function spinMystery() {
  if (spinning || game.phase !== 'bonus-spin') return
  const segmentCount = BONUS_WHEEL.length
  const result = structuredClone(game)
  spinBonusWheel(result)
  wheelAngle = 0
  animateSpin(result, result.bonusSpin.index, segmentCount, () => {
    tone(840, 0.25)
    startPickTimer()
  })
}

function startPickTimer() {
  pickDeadline = Date.now() + BONUS_PICK_SECONDS * 1000
  clearInterval(pickTimer)
  pickTimer = setInterval(updatePickClock, 200)
}

function updatePickClock() {
  if (game?.phase !== 'bonus-pick') {
    clearInterval(pickTimer)
    return
  }
  if (!pickDeadline) return
  const remaining = Math.max(0, Math.ceil((pickDeadline - Date.now()) / 1000))
  const display = document.querySelector('#pick-seconds')
  if (display) {
    display.textContent = remaining
    display.closest('.bonus-clock').classList.toggle('urgent', remaining <= 10)
  }
  if (remaining === 0) {
    clearInterval(pickTimer)
    tone(200, 0.25)
    pickDeadline = 0
    expireBonusPick(game)
    startBonusTimer()
    renderGame()
  }
}

function startBonusTimer() {
  bonusDeadline = Date.now() + BONUS_SECONDS * 1000
  clearInterval(bonusTimer)
  bonusTimer = setInterval(updateClock, 200)
}

function syncTurnTimer() {
  const running = game?.phase === 'playing'
  if (!running) {
    clearInterval(turnTimer)
    turnTimer = undefined
    turnKey = ''
    return
  }
  const key = `${game.round}:${game.activePlayer}:${game.turnSerial}`
  if (key !== turnKey) {
    turnKey = key
    turnRemaining = TURN_SECONDS * 1000
  }
  turnLastTick = Date.now()
  paintTurnClock()
  if (!turnTimer) turnTimer = setInterval(tickTurnClock, 250)
}

function tickTurnClock() {
  if (game?.phase !== 'playing') {
    syncTurnTimer()
    return
  }
  const now = Date.now()
  const elapsed = now - turnLastTick
  turnLastTick = now
  // The clock pauses while the wheel spins or a dialog is open, so nobody loses a turn to an animation.
  if (spinning || document.querySelector('dialog[open]')) return
  turnRemaining = Math.max(0, turnRemaining - elapsed)
  paintTurnClock()
  if (turnRemaining === 0) {
    clearInterval(turnTimer)
    turnTimer = undefined
    vowelMode = false
    tone(200, 0.25)
    act(() => expireTurn(game))
  }
}

function paintTurnClock() {
  const seconds = Math.ceil(turnRemaining / 1000)
  const clock = document.querySelector('#turn-clock')
  const display = document.querySelector('#turn-seconds')
  if (display) display.textContent = seconds
  clock?.classList.toggle('urgent', seconds <= 5)
}

function updateClock() {
  if (game?.phase !== 'bonus-solve') return
  const remaining = Math.max(0, Math.ceil((bonusDeadline - Date.now()) / 1000))
  const clock = document.querySelector('#seconds-left')
  if (clock) {
    clock.textContent = remaining
    clock.closest('.bonus-clock').classList.toggle('urgent', remaining <= 5)
  }
  if (remaining === 0) {
    clearInterval(bonusTimer)
    expireBonus(game)
    renderGame()
  }
}

function showDialog(title, content) {
  const dialog = document.querySelector('#modal')
  dialogReturnFocus = document.activeElement
  dialog.innerHTML = `<button class="icon-button dialog-close" data-close aria-label="Close dialog">${icon('close')}</button><h2 id="dialog-title">${title}</h2>${content}`
  dialog.querySelectorAll('[data-close]').forEach((button) => { button.onclick = () => dialog.close() })
  dialog.onclose = () => dialogReturnFocus?.focus()
  dialog.onclick = (event) => { if (event.target === dialog) dialog.close() }
  dialog.showModal()
  return dialog
}

function showSolve() {
  const dialog = showDialog('Got a good feeling?', `<p>Guess the whole puzzle. A wrong answer passes the turn, so make it count.</p><form id="solve-form"><label for="answer">Your answer</label><input id="answer" class="answer-input" placeholder="I think it’s…" autocomplete="off" spellcheck="false" maxlength="100" required><button class="button button-primary" type="submit">This is my answer ${icon('arrow')}</button><button class="text-button" type="button" data-close>Keep thinking</button></form>`)
  dialog.querySelector('#answer').focus()
  dialog.querySelector('#solve-form').onsubmit = (event) => {
    event.preventDefault()
    const answer = dialog.querySelector('#answer').value
    if (!answer.trim()) return
    dialog.close()
    act(() => {
      solvePuzzle(game, answer)
      vowelMode = false
      if (game.phase === 'round-end') fanfare()
      else tone(200, 0.25)
    })
  }
}

function showHelp() {
  showDialog('A good time, explained.', `<p>A pass-and-play word game for 2 or 3 people. Play together on this device; no accounts or connection needed after loading.</p><ol class="rules-list">
    <li><strong>Spin, then pick a consonant.</strong> Earn the wheel value for every matching letter. A miss passes the phone. You have ${TURN_SECONDS} seconds per turn; the clock pauses while the wheel spins or this window is open.</li>
    <li><strong>Vowels are $250.</strong> Buy one before spinning if you have enough round cash. They don’t earn cash, and a miss still costs a turn.</li>
    <li><strong>Watch those tricky wedges.</strong> Round one has a single Bankrupt, and Bankrupt never lands twice in a row. Bankrupt wipes your current round cash and any held trips. Lose a Turn leaves your money alone. Both pass the turn.</li>
    <li><strong>Chase the trip surprises.</strong> The wheel grows each round, and from round two a Trip wedge reveals a surprise getaway. Claim it with a matching consonant and solve that round to bank it. Once claimed, that wedge becomes cash for the rest of the round, even if the trip is later lost.</li>
    <li><strong>Solve it to bank it.</strong> Only the solver keeps their round winnings, with a $1,000 minimum. A wrong solve passes the turn. The final round doubles cash wedges. The lowest banked score starts each new round; ties follow the rotating player order.</li>
    <li><strong>Finish with a flourish.</strong> After ${FINAL_ROUND} rounds, the highest banked score enters the bonus round. Ties use a random draw. Spin for hidden cash, a car, a world trip, or a cabin. The bonus puzzle stays covered until your envelope is locked in. Start with R S T L N E, then pick 3 consonants and a vowel within ${BONUS_PICK_SECONDS} seconds; if that clock runs out you solve with the letters you have. You then have ${BONUS_SECONDS} seconds and one guess to win it. The envelope opens even if you miss or run out of time.</li>
    <li><strong>Keep the memories.</strong> Names and completed game scores save on this device. Visit History for past games and total scores by name. Unfinished games are not saved.</li>
  </ol><p class="fair-play-note">Friendly house rules, original puzzles, pretend money. An independent fan-made game, not affiliated with the television show.</p><button class="button button-primary" data-close>Sounds like game night ${icon('arrow')}</button>`)
}

function confirmNewGame() {
  const dialog = showDialog('Call it a game?', `<p>${game.phase === 'game-over' ? 'Your completed results remain in History.' : 'Returning home discards this unfinished game. Only completed games appear in History.'} Your saved names and past results stay. Ready for a fresh start?</p><button class="button button-primary" id="confirm-reset">Start fresh</button><button class="text-button" data-close>Stay in the game</button>`)
  dialog.querySelector('#confirm-reset').onclick = reset
}

function reset() {
  closeSpinModal()
  clearInterval(bonusTimer)
  clearInterval(pickTimer)
  clearInterval(turnTimer)
  turnTimer = undefined
  turnKey = ''
  game = null
  vowelMode = false
  wheelAngle = 0
  bonusDeadline = 0
  pickDeadline = 0
  renderLobby()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

// A short rising fanfare marks a solved round or a won bonus.
function fanfare() {
  [0, 150, 300, 480].forEach((delay, index) => {
    setTimeout(() => tone([523, 659, 784, 1047][index], index === 3 ? 0.45 : 0.18), delay)
  })
}

function tone(frequency, duration = 0.09) {
  if (!sound) return
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume().catch(() => {})
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.045, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration)
    oscillator.start()
    oscillator.stop(audio.currentTime + duration)
  } catch { /* Sound is optional on browsers without Web Audio. */ }
}

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input, textarea') || document.querySelector('dialog[open]')) return
  if (/^[a-z]$/i.test(event.key)) document.querySelector(`[data-letter="${event.key.toUpperCase()}"]:not(:disabled)`)?.click()
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return
  if (game?.phase === 'bonus-solve') updateClock()
  if (game?.phase === 'bonus-pick') updatePickClock()
  if (game?.phase === 'playing') turnLastTick = Date.now()
})

renderLobby()
setupPWA()
