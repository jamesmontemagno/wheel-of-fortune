import './style.css'
import {
  WHEEL_SEGMENTS, VOWELS, createGame, spinWheel, guessLetter, solvePuzzle,
  nextRound, chooseBonusLetter, solveBonus, expireBonus, isLetterRevealed,
} from './game.js'

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
}
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
const colors = ['#e7ab65', '#a8cdbb', '#e78371', '#f1d98a', '#a7bcd4', '#e9cb74', '#d0bbd9', '#e9ba76', '#aed0bd', '#dce1d8', '#e68b7a', '#aebfd7']

let game = null
let playerCount = 2
let names = ['', '', '']
let spinning = false
let wheelAngle = 0
let vowelMode = false
let sound = false
let audio
let bonusDeadline = 0
let bonusTimer
let dialogReturnFocus

function wheelMarkup(preview = false) {
  const size = WHEEL_SEGMENTS.length
  const angle = 360 / size
  const point = (degrees, radius) => {
    const radians = degrees * Math.PI / 180
    return [160 + radius * Math.cos(radians), 160 + radius * Math.sin(radians)]
  }
  const sectors = WHEEL_SEGMENTS.map((segment, index) => {
    const center = -90 + index * angle
    const start = point(center - angle / 2, 151)
    const end = point(center + angle / 2, 151)
    const label = segment.type === 'cash' ? money(segment.value) : segment.label.toUpperCase()
    return `<g>
      <path d="M160 160 L${start.join(' ')} A151 151 0 0 1 ${end.join(' ')} Z" fill="${segment.type === 'bankrupt' ? '#283e36' : colors[index % colors.length]}" stroke="#fff8e9" stroke-width="1.5"/>
      <text x="160" y="48" transform="rotate(${index * angle} 160 160)" text-anchor="middle" fill="${segment.type === 'bankrupt' ? '#fff9ed' : '#243f35'}" font-size="${segment.type === 'cash' ? 14 : 9}" font-weight="800">${escape(label)}</text>
    </g>`
  }).join('')
  return `<div class="wheel-wrap ${preview ? 'wheel-preview' : ''}">
    <span class="wheel-pointer" aria-hidden="true"></span>
    <div class="wheel-outer">
      <svg class="wheel-disc" viewBox="0 0 320 320" style="transform:rotate(${wheelAngle}deg)" role="img" aria-label="Prize wheel with cash, Bankrupt, and Lose a Turn spaces">
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
    <a class="brand" href="./" aria-label="Wheel of Fortune home"><span class="brand-mark" aria-hidden="true">✳</span><span>WHEEL <span class="brand-of">of</span><br>FORTUNE<span class="brand-dot">.</span></span></a>
    <div class="header-actions">
      ${game ? `<button class="icon-button" id="new-game" aria-label="End game and return home" ${spinning ? 'disabled' : ''}>${icon('home')}</button>` : '<span class="header-note">A good time, all around.</span>'}
      <button class="icon-button" id="sound-toggle" aria-label="Turn sound ${sound ? 'off' : 'on'}" aria-pressed="${sound}">${icon(sound ? 'sound' : 'mute')}</button>
      <button class="icon-button" id="help" aria-label="How to play">${icon('help')}</button>
    </div>
  </header>`
}

function shell(content) {
  app.innerHTML = `${header()}<main id="main">${content}</main>
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
  }
  document.querySelector('#new-game')?.addEventListener('click', confirmNewGame)
}

function renderLobby() {
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
      <div class="game-facts"><span>${icon('people')} 2–3 players</span><span>${icon('spin')} 3 rounds + bonus</span><span>${icon('phone')} One phone</span></div>
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
    <div><span class="step-number">01</span><span><strong>Spin for your fortune</strong><small>Big prizes. A few plot twists.</small></span></div>
    <div><span class="step-number">02</span><span><strong>Find the missing letters</strong><small>Trust your gut. Or buy a vowel.</small></span></div>
    <div><span class="step-number">03</span><span><strong>Make your winning guess</strong><small>Solve it. Bank it. Celebrate it.</small></span></div>
  </section>`)
  document.querySelectorAll('[data-count]').forEach((button) => {
    button.onclick = () => {
      readNames()
      playerCount = Number(button.dataset.count)
      renderLobby()
      document.querySelector(`[data-count="${playerCount}"]`).focus()
    }
  })
  document.querySelector('#setup-form').onsubmit = (event) => {
    event.preventDefault()
    readNames()
    game = createGame(names.slice(0, playerCount).map((name, i) => name.trim() || `Player ${i + 1}`))
    tone(660)
    renderGame()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

function readNames() {
  document.querySelectorAll('.player-field input').forEach((input, i) => { names[i] = input.value })
}

function boardMarkup() {
  const words = game.puzzle.phrase.split(' ')
  const longest = Math.max(...words.map((word) => word.length))
  const isBonus = ['bonus-pick', 'bonus-solve', 'game-over'].includes(game.phase)
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

function playerMarkup() {
  return `<div class="scoreboard" style="--players:${game.players.length}" aria-label="Player scores">${game.players.map((player, i) => `
    <div class="player-score color-${i} ${game.activePlayer === i ? 'active-player' : ''}">
      <div class="score-name"><span class="score-dot" aria-hidden="true"></span><span>${escape(player.name)}</span>${game.activePlayer === i ? '<span class="turn-tag">UP</span>' : ''}</div>
      <strong>${money(player.round)}</strong><span class="banked-label">BANKED <b>${money(player.total)}</b></span>
    </div>`).join('')}</div>`
}

function keyboardMarkup() {
  const bonus = game.phase === 'bonus-pick'
  const consonantsChosen = game.bonusLetters.filter((l) => !VOWELS.includes(l)).length
  const vowelsChosen = game.bonusLetters.filter((l) => VOWELS.includes(l)).length
  const enabled = (letter) => {
    if (spinning) return false
    if (bonus) return !'RSTLNE'.includes(letter) && !game.bonusLetters.includes(letter) && (VOWELS.includes(letter) ? vowelsChosen < 1 : consonantsChosen < 3)
    if (game.phase !== 'playing' || game.usedLetters.includes(letter)) return false
    return vowelMode ? VOWELS.includes(letter) : game.action === 'consonant' && !VOWELS.includes(letter)
  }
  return `<section class="keyboard-section" aria-label="${bonus ? 'Choose bonus letters' : 'Choose a letter'}">
    <div class="keyboard-heading"><h3>${bonus ? 'Make those four letters count.' : vowelMode ? 'A little help for $250.' : game.action === 'consonant' ? 'Trust your letter instinct.' : 'Your next lucky letter?'}</h3><span>${bonus ? `${consonantsChosen}/3 consonants · ${vowelsChosen}/1 vowel` : vowelMode ? 'PICK A VOWEL' : 'PICK A CONSONANT'}</span></div>
    <div class="keyboard">${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row) => `<div class="keyboard-row">${[...row].map((letter) => {
      const used = bonus ? 'RSTLNE'.includes(letter) || game.bonusLetters.includes(letter) : game.usedLetters.includes(letter)
      return `<button class="letter-key ${used ? 'used' : ''} ${VOWELS.includes(letter) ? 'vowel' : ''}" data-letter="${letter}" ${enabled(letter) ? '' : 'disabled'} aria-label="${letter}${used ? ', already chosen' : ''}">${letter}</button>`
    }).join('')}</div>`).join('')}</div>
    <p class="keyboard-footnote">${bonus ? 'R, S, T, L, N, E are on the house. Your 20 seconds start after your fourth pick.' : vowelMode ? 'Vowels cost $250, whether or not they’re in the puzzle.' : 'Spin for consonants. Buy a vowel. Or go for the solve.'}</p>
  </section>`
}

function playingControls() {
  const canBuy = game.action === 'spin' && game.players[game.activePlayer].round >= 250 && [...VOWELS].some((l) => !game.usedLetters.includes(l))
  return `<section class="wheel-panel" aria-label="Spin and actions">
    <div class="wheel-panel-heading"><span class="card-eyebrow">A LITTLE LUCK GOES A LONG WAY</span><span aria-hidden="true">✧</span></div>
    ${wheelMarkup()}
    <div class="wheel-result">${spinning ? 'Round and round we go…' : game.action === 'consonant' ? `<strong>${money(game.pendingValue)}</strong> per consonant` : game.lastSpin ? escape(game.lastSpin.label) : 'Your fortune is one spin away.'}</div>
    <button class="button button-primary" id="spin" ${spinning || game.action !== 'spin' || vowelMode ? 'disabled' : ''}>${icon('spin')} ${spinning ? 'Spinning…' : 'Spin the wheel'}</button>
    <div class="secondary-actions"><button class="button button-secondary" id="buy-vowel" ${spinning || !canBuy ? 'disabled' : ''}>${vowelMode ? 'Cancel' : 'Buy a vowel'} <span>${vowelMode ? '' : '$250'}</span></button><button class="button button-secondary" id="solve" ${spinning ? 'disabled' : ''}>Solve it ${icon('arrow')}</button></div>
    <p class="wheel-note">${game.round === 3 ? 'DOUBLE STAKES · All cash wedges pay 2×' : 'Watch out for Bankrupt & Lose a Turn.'}</p>
  </section>`
}

function endRoundMarkup() {
  const player = game.players[game.roundWinner]
  return `<section class="celebration-card"><span class="celebration-icon" aria-hidden="true">✦</span><span class="card-eyebrow">NOW THAT’S A GOOD GUESS</span><h2>${escape(player.name)}<br>nailed it.</h2><p>The puzzle is solved and the winnings are safe.</p><div class="prize-amount">${money(player.total)}<span>TOTAL BANKED</span></div><button class="button button-primary" id="next-round">${game.round === 3 ? 'On to the bonus round' : `Let’s play round ${game.round + 1}`} ${icon('arrow')}</button></section>`
}

function bonusMarkup() {
  const picking = game.phase === 'bonus-pick'
  return `<section class="bonus-card"><span class="celebration-icon" aria-hidden="true">${icon('trophy')}</span><span class="card-eyebrow">ONE LAST MOMENT OF MAGIC</span><h2>${escape(game.players[game.champion].name)},<br>this is your shot.</h2><div class="prize-amount">${money(game.bonusPrize)}<span>BONUS PRIZE</span></div>
    ${picking ? '<p>We’ll give you <strong>R S T L N E</strong>.<br>Pick 3 more consonants and 1 vowel.</p>' : `<div class="bonus-clock" role="timer" aria-label="Time remaining"><span id="seconds-left">20</span><small>SECONDS TO SOLVE</small></div><form id="bonus-form"><label class="sr-only" for="bonus-answer">Your bonus puzzle answer</label><input class="answer-input" id="bonus-answer" autocomplete="off" spellcheck="false" placeholder="Your winning answer…" maxlength="100" required><button class="button button-primary" type="submit">Lock in my answer ${icon('arrow')}</button></form>`}
  </section>`
}

function finalMarkup() {
  const champion = game.players[game.champion]
  const rankings = game.players.map((p, i) => ({ ...p, index: i })).sort((a, b) => b.total - a.total || (a.index === game.champion ? -1 : b.index === game.champion ? 1 : a.index - b.index))
  return `<section class="final-card"><span class="celebration-icon" aria-hidden="true">${icon('trophy')}</span><span class="card-eyebrow">THAT’S A WRAP, WORD WIZARDS</span><h2>${escape(champion.name)}<br>takes the crown.</h2><p>${game.bonusWon ? 'The bonus puzzle? Crushed it. What a finish.' : 'No bonus this time. Still a game-night champion.'}</p><div class="final-rankings">${rankings.map((p, i) => `<div><span class="rank">${i + 1}</span><span>${escape(p.name)}</span><strong>${money(p.total)}</strong></div>`).join('')}</div><button class="button button-primary" id="play-again">One more round? ${icon('spin')}</button><span class="setup-footnote">New game. Fresh puzzles. Same good company.</span></section>`
}

function renderGame() {
  const bonus = ['bonus-pick', 'bonus-solve', 'game-over'].includes(game.phase)
  shell(`<section class="game-shell">
    <div class="game-topline"><div><span class="eyebrow">${bonus ? 'THE GRAND FINALE' : 'LET THE GOOD TIMES SPIN'}</span><h1>${game.phase === 'game-over' ? 'A game well played.' : bonus ? 'A little extra fortune.' : `Round ${game.round}<span class="round-of"> / 3</span>${game.round === 3 ? '<span class="double-badge">DOUBLE STAKES</span>' : ''}`}</h1></div><div class="round-progress" aria-label="${bonus ? 'Bonus round' : `Round ${game.round} of 3`}">${[1, 2, 3].map((r) => `<span class="${game.round >= r ? 'complete' : ''}">${r}</span>`).join('')}<span class="${bonus ? 'complete' : ''}">✦</span></div></div>
    ${playerMarkup()}
    <div class="turn-message" role="status" aria-live="polite"><span class="status-spark" aria-hidden="true">✳</span><span>${spinning ? 'A little suspense is part of the fun. Hold tight…' : escape(game.message)}</span></div>
    <div class="play-layout">
      <div class="puzzle-column">${boardMarkup()}${game.phase === 'playing' || game.phase === 'bonus-pick' ? keyboardMarkup() : `<div class="after-puzzle"><span aria-hidden="true">✧</span>${game.phase === 'round-end' ? 'Great minds. Good times. On to the next one.' : game.phase === 'game-over' ? 'The best part? You can do it all again.' : 'Deep breath. You’ve got this.'}</div>`}</div>
      ${game.phase === 'playing' ? playingControls() : game.phase === 'round-end' ? endRoundMarkup() : game.phase === 'game-over' ? finalMarkup() : bonusMarkup()}
    </div>
  </section>`)
  document.querySelectorAll('[data-letter]').forEach((button) => {
    button.onclick = () => act(() => {
      if (game.phase === 'bonus-pick') {
        chooseBonusLetter(game, button.dataset.letter)
        if (game.phase === 'bonus-solve') startBonusTimer()
      } else {
        guessLetter(game, button.dataset.letter)
        vowelMode = false
      }
      tone(480)
    })
  })
  document.querySelector('#spin')?.addEventListener('click', spin)
  document.querySelector('#buy-vowel')?.addEventListener('click', () => { vowelMode = !vowelMode; renderGame() })
  document.querySelector('#solve')?.addEventListener('click', showSolve)
  document.querySelector('#next-round')?.addEventListener('click', () => act(() => { nextRound(game); vowelMode = false; wheelAngle = 0 }))
  document.querySelector('#play-again')?.addEventListener('click', reset)
  document.querySelector('#bonus-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const answer = document.querySelector('#bonus-answer').value
    if (!answer.trim()) return
    act(() => {
      if (Date.now() >= bonusDeadline) expireBonus(game)
      else solveBonus(game, answer)
      clearInterval(bonusTimer)
      tone(game.bonusWon ? 880 : 220, 0.3)
    })
  })
  if (game.phase === 'bonus-solve') updateClock()
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

function spin() {
  if (spinning || game.phase !== 'playing' || game.action !== 'spin') return
  const result = structuredClone(game)
  spinWheel(result)
  spinning = true
  renderGame()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const duration = reduced ? 80 : 2800
  const target = (360 - result.lastSpin.index * (360 / WHEEL_SEGMENTS.length)) % 360
  const current = ((wheelAngle % 360) + 360) % 360
  wheelAngle += 360 * 5 + ((target - current + 360) % 360)
  const wheel = document.querySelector('.wheel-disc')
  requestAnimationFrame(() => requestAnimationFrame(() => {
    wheel.style.transition = `transform ${duration}ms cubic-bezier(.15,.75,.13,1)`
    wheel.style.transform = `rotate(${wheelAngle}deg)`
  }))
  tone(320, 0.12)
  setTimeout(() => {
    game = result
    spinning = false
    tone(game.lastSpin.type === 'cash' ? 720 : 180, 0.2)
    renderGame()
  }, duration + 60)
}

function startBonusTimer() {
  bonusDeadline = Date.now() + 20_000
  clearInterval(bonusTimer)
  bonusTimer = setInterval(updateClock, 200)
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
    act(() => { solvePuzzle(game, answer); vowelMode = false; tone(game.phase === 'round-end' ? 880 : 200, 0.25) })
  }
}

function showHelp() {
  showDialog('A good time, explained.', `<p>A pass-and-play word game for 2 or 3 people. Play together on this device; no accounts or connection needed after loading.</p><ol class="rules-list">
    <li><strong>Spin, then pick a consonant.</strong> Earn the wheel value for every matching letter. A miss passes the phone.</li>
    <li><strong>Vowels are $250.</strong> Buy one before spinning if you have enough round cash. They don’t earn cash, and a miss still costs a turn.</li>
    <li><strong>Watch those tricky wedges.</strong> Bankrupt wipes only your current round cash. Lose a Turn leaves your money alone. Both pass the turn.</li>
    <li><strong>Solve it to bank it.</strong> Only the solver keeps their round winnings, with a $1,000 minimum. A wrong solve passes the turn. Round 3 doubles cash wedges.</li>
    <li><strong>Finish with a flourish.</strong> After 3 rounds, the highest banked score enters the bonus round. Ties use a random draw. Start with R S T L N E, pick 3 consonants and a vowel, then you have 20 seconds and one guess for the bonus prize.</li>
  </ol><p class="fair-play-note">Friendly house rules, original puzzles, pretend money. An independent fan-made game, not affiliated with the television show.</p><button class="button button-primary" data-close>Sounds like game night ${icon('arrow')}</button>`)
}

function confirmNewGame() {
  const dialog = showDialog('Call it a game?', '<p>Returning home ends this game and clears the scores. Ready for a fresh start?</p><button class="button button-primary" id="confirm-reset">Start fresh</button><button class="text-button" data-close>Stay in the game</button>')
  dialog.querySelector('#confirm-reset').onclick = reset
}

function reset() {
  clearInterval(bonusTimer)
  game = null
  vowelMode = false
  wheelAngle = 0
  bonusDeadline = 0
  renderLobby()
  window.scrollTo({ top: 0, behavior: 'instant' })
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
  if (!document.hidden && game?.phase === 'bonus-solve') updateClock()
})

renderLobby()
