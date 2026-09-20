import { PUZZLES } from './puzzles.js';

export const VOWELS = 'AEIOU';
const BONUS_GIVEN = 'RSTLNE';
const VOWEL_COST = 250;

export const WHEEL_SEGMENTS = Object.freeze(
  [
    { label: '500', type: 'cash', value: 500 },
    { label: '650', type: 'cash', value: 650 },
    { label: 'BANKRUPT', type: 'bankrupt', value: 0 },
    { label: '800', type: 'cash', value: 800 },
    { label: '550', type: 'cash', value: 550 },
    { label: '2,500', type: 'cash', value: 2500 },
    { label: 'LOSE TURN', type: 'lose-turn', value: 0 },
    { label: '700', type: 'cash', value: 700 },
    { label: '900', type: 'cash', value: 900 },
    { label: '600', type: 'cash', value: 600 },
    { label: 'BANKRUPT', type: 'bankrupt', value: 0 },
    { label: '750', type: 'cash', value: 750 },
  ].map(Object.freeze),
);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function randomIndex(length, rng) {
  requireCondition(typeof rng === 'function', 'A random number generator is required.');
  const value = rng();
  requireCondition(
    Number.isFinite(value) && value >= 0 && value < 1,
    'Random values must be between zero (inclusive) and one (exclusive).',
  );
  return Math.floor(value * length);
}

function pickPuzzle(usedIds, rng) {
  const available = PUZZLES.filter((puzzle) => !usedIds.includes(puzzle.id));
  requireCondition(available.length > 0, 'No unused puzzles remain.');
  const categories = [...new Set(available.map((puzzle) => puzzle.category))];
  const category = categories[randomIndex(categories.length, rng)];
  const candidates = available.filter((puzzle) => puzzle.category === category);
  return { ...candidates[randomIndex(candidates.length, rng)] };
}

function parseLetter(letter) {
  requireCondition(typeof letter === 'string', 'Choose a single letter.');
  const normalized = letter.trim().toUpperCase();
  requireCondition(/^[A-Z]$/.test(normalized), 'Choose a single letter from A to Z.');
  return normalized;
}

export function normalizeAnswer(answer) {
  requireCondition(typeof answer === 'string', 'Enter a puzzle answer.');
  return answer.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseAnswer(answer) {
  const normalized = normalizeAnswer(answer);
  requireCondition(normalized.length > 0, 'Enter a puzzle answer.');
  return normalized;
}

function requireMainAction(game) {
  requireCondition(game.phase === 'playing', 'The main round is not in progress.');
  requireCondition(
    game.action === 'spin' || game.action === 'consonant',
    'You cannot act right now.',
  );
}

function passTurn(game) {
  game.activePlayer = (game.activePlayer + 1) % game.players.length;
  game.action = 'spin';
  game.pendingValue = 0;
  game.message += ` ${game.players[game.activePlayer].name}, it is your turn.`;
}

export function createGame(names, rng = Math.random) {
  requireCondition(
    Array.isArray(names) && names.length >= 2 && names.length <= 3,
    'Choose two or three players.',
  );
  requireCondition(
    Array.from(names).every((name) => typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 24),
    'Player names must contain 1 to 24 characters.',
  );
  const players = names.map((name) => ({ name: name.trim(), total: 0, round: 0 }));
  const puzzle = pickPuzzle([], rng);
  return {
    players,
    activePlayer: 0,
    round: 1,
    phase: 'playing',
    action: 'spin',
    pendingValue: 0,
    puzzle,
    usedLetters: [],
    message: `${players[0].name}, spin the wheel to begin!`,
    roundWinner: null,
    champion: null,
    bonusLetters: [],
    bonusPrize: 25000,
    bonusWon: null,
    usedPuzzleIds: [puzzle.id],
    lastSpin: null,
  };
}

export function spinWheel(game, rng = Math.random) {
  requireMainAction(game);
  requireCondition(game.action === 'spin', 'Choose a consonant before spinning again.');
  const index = randomIndex(WHEEL_SEGMENTS.length, rng);
  const segment = WHEEL_SEGMENTS[index];
  game.lastSpin = { index, ...segment };
  if (segment.type === 'cash') {
    game.pendingValue = segment.value * (game.round === 3 ? 2 : 1);
    game.action = 'consonant';
    game.message = `Choose a consonant for $${game.pendingValue.toLocaleString('en-US')} per letter.`;
  } else {
    if (segment.type === 'bankrupt') {
      game.players[game.activePlayer].round = 0;
      game.message = 'Bankrupt! Your round winnings are cleared; your banked total is safe.';
    } else {
      game.message = 'Lose a turn! Your winnings are safe.';
    }
    passTurn(game);
  }
  return game;
}

export function guessLetter(game, letter) {
  requireMainAction(game);
  const choice = parseLetter(letter);
  requireCondition(!game.usedLetters.includes(choice), 'That letter has already been chosen.');
  const vowel = VOWELS.includes(choice);
  const player = game.players[game.activePlayer];
  if (vowel) {
    requireCondition(game.action === 'spin', 'Choose your consonant before buying a vowel.');
    requireCondition(player.round >= VOWEL_COST, 'You need $250 in round winnings to buy a vowel.');
  } else {
    requireCondition(game.action === 'consonant', 'Spin the wheel before choosing a consonant.');
  }
  const occurrences = [...game.puzzle.phrase.toUpperCase()].filter((char) => char === choice).length;
  if (vowel) player.round -= VOWEL_COST;
  else player.round += occurrences * game.pendingValue;
  game.usedLetters.push(choice);
  game.action = 'spin';
  game.pendingValue = 0;
  if (occurrences > 0) {
    game.message = `${choice} appears ${occurrences} time${occurrences === 1 ? '' : 's'}! Spin, buy a vowel, or solve.`;
  } else {
    game.message = `No ${choice} in this puzzle.`;
    passTurn(game);
  }
  return game;
}

export function solvePuzzle(game, answer) {
  requireMainAction(game);
  const normalized = parseAnswer(answer);
  if (normalized !== normalizeAnswer(game.puzzle.phrase)) {
    game.message = 'That is not the answer.';
    passTurn(game);
    return game;
  }
  const player = game.players[game.activePlayer];
  const prize = Math.max(player.round, 1000);
  player.total += prize;
  game.roundWinner = game.activePlayer;
  game.phase = 'round-end';
  game.action = 'spin';
  game.pendingValue = 0;
  game.message = `${player.name} solved it and banks $${prize.toLocaleString('en-US')}!`;
  return game;
}

export function nextRound(game, rng = Math.random) {
  requireCondition(game.phase === 'round-end', 'Finish the current round first.');
  let champion = null;
  let tied = false;
  if (game.round === 3) {
    const highest = Math.max(...game.players.map((player) => player.total));
    const leaders = game.players
      .map((player, index) => (player.total === highest ? index : null))
      .filter((index) => index !== null);
    tied = leaders.length > 1;
    champion = leaders[tied ? randomIndex(leaders.length, rng) : 0];
  }
  const puzzle = pickPuzzle(game.usedPuzzleIds, rng);
  game.puzzle = puzzle;
  game.usedPuzzleIds.push(puzzle.id);
  game.players.forEach((player) => { player.round = 0; });
  game.usedLetters = [];
  game.action = 'spin';
  game.pendingValue = 0;
  game.lastSpin = null;
  game.roundWinner = null;
  if (game.round < 3) {
    game.round += 1;
    game.activePlayer = (game.round - 1) % game.players.length;
    game.phase = 'playing';
    game.message = `Round ${game.round}${game.round === 3 ? ': double wheel values' : ''}! ${game.players[game.activePlayer].name}, you start.`;
  } else {
    game.champion = champion;
    game.activePlayer = champion;
    game.phase = 'bonus-pick';
    game.bonusLetters = [];
    game.bonusWon = null;
    game.message = `${tied ? 'Tie-break: a random draw selected the champion. ' : ''}${game.players[champion].name} plays the bonus round! R S T L N E are given. Choose three consonants and one vowel.`;
  }
  return game;
}

export function chooseBonusLetter(game, letter) {
  requireCondition(game.phase === 'bonus-pick', 'Bonus letter selection is not open.');
  const choice = parseLetter(letter);
  requireCondition(!BONUS_GIVEN.includes(choice), 'R S T L N E are already given.');
  requireCondition(!game.bonusLetters.includes(choice), 'That bonus letter has already been chosen.');
  const vowel = VOWELS.includes(choice);
  const sameTypeCount = game.bonusLetters.filter((picked) => VOWELS.includes(picked) === vowel).length;
  requireCondition(
    sameTypeCount < (vowel ? 1 : 3),
    vowel ? 'Choose only one bonus vowel.' : 'Choose only three bonus consonants.',
  );
  game.bonusLetters.push(choice);
  if (game.bonusLetters.length === 4) {
    game.phase = 'bonus-solve';
    game.message = 'Your letters are revealed. You have 20 seconds to solve the bonus puzzle!';
  } else {
    game.message = 'Choose three consonants and one vowel in total.';
  }
  return game;
}

export function solveBonus(game, answer) {
  requireCondition(game.phase === 'bonus-solve', 'The bonus puzzle is not ready to solve.');
  const normalized = parseAnswer(answer);
  game.bonusWon = normalized === normalizeAnswer(game.puzzle.phrase);
  if (game.bonusWon) {
    game.players[game.champion].total += game.bonusPrize;
    game.message = `${game.players[game.champion].name} wins the $${game.bonusPrize.toLocaleString('en-US')} bonus!`;
  } else {
    game.message = 'Not quite! Your banked winnings are safe. Thanks for playing!';
  }
  game.phase = 'game-over';
  return game;
}

export function expireBonus(game) {
  requireCondition(game.phase === 'bonus-solve', 'There is no active bonus timer.');
  game.bonusWon = false;
  game.phase = 'game-over';
  game.message = 'Time is up! Your banked winnings are safe. Thanks for playing!';
  return game;
}

export function isLetterRevealed(game, letter) {
  const normalized = String(letter).toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) return true;
  if (game.phase === 'round-end' || game.phase === 'game-over') return true;
  if (game.phase === 'bonus-pick' || game.phase === 'bonus-solve') {
    return BONUS_GIVEN.includes(normalized) || game.bonusLetters.includes(normalized);
  }
  return game.usedLetters.includes(normalized);
}
