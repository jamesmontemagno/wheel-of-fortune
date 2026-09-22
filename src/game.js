import { PUZZLES } from './puzzles.js';

export const VOWELS = 'AEIOU';
const BONUS_GIVEN = 'RSTLNE';
const VOWEL_COST = 250;

export const TURN_SECONDS = 30;
export const BONUS_SECONDS = 30;
export const BONUS_PICK_SECONDS = 60;

// The bonus player picks this many extra letters on top of R S T L N E.
export const BONUS_CONSONANTS = 3;
export const BONUS_VOWELS = 1;

const freezeWheel = (segments) => Object.freeze(segments.map(Object.freeze));

// Each round spins a larger wheel with richer cash and more surprises.
export const ROUND_WHEELS = Object.freeze([
  freezeWheel([
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
    { label: '1,000', type: 'cash', value: 1000 },
    { label: '750', type: 'cash', value: 750 },
  ]),
  freezeWheel([
    { label: '600', type: 'cash', value: 600 },
    { label: '750', type: 'cash', value: 750 },
    { label: 'BANKRUPT', type: 'bankrupt', value: 0 },
    { label: '900', type: 'cash', value: 900 },
    { label: 'TRIP', type: 'trip', value: 600 },
    { label: '650', type: 'cash', value: 650 },
    { label: '3,000', type: 'cash', value: 3000 },
    { label: 'LOSE TURN', type: 'lose-turn', value: 0 },
    { label: '800', type: 'cash', value: 800 },
    { label: '1,000', type: 'cash', value: 1000 },
    { label: '700', type: 'cash', value: 700 },
    { label: 'BANKRUPT', type: 'bankrupt', value: 0 },
    { label: '850', type: 'cash', value: 850 },
    { label: '1,200', type: 'cash', value: 1200 },
  ]),
  freezeWheel([
    { label: '700', type: 'cash', value: 700 },
    { label: '900', type: 'cash', value: 900 },
    { label: 'BANKRUPT', type: 'bankrupt', value: 0 },
    { label: '1,100', type: 'cash', value: 1100 },
    { label: 'TRIP', type: 'trip', value: 800 },
    { label: '800', type: 'cash', value: 800 },
    { label: '3,500', type: 'cash', value: 3500 },
    { label: 'LOSE TURN', type: 'lose-turn', value: 0 },
    { label: '1,000', type: 'cash', value: 1000 },
    { label: '1,500', type: 'cash', value: 1500 },
    { label: 'TRIP', type: 'trip', value: 800 },
    { label: '750', type: 'cash', value: 750 },
    { label: 'BANKRUPT', type: 'bankrupt', value: 0 },
    { label: '1,300', type: 'cash', value: 1300 },
    { label: '950', type: 'cash', value: 950 },
    { label: '2,000', type: 'cash', value: 2000 },
  ]),
  freezeWheel([
    { label: '800', type: 'cash', value: 800 },
    { label: '1,000', type: 'cash', value: 1000 },
    { label: 'BANKRUPT', type: 'bankrupt', value: 0 },
    { label: '1,200', type: 'cash', value: 1200 },
    { label: 'TRIP', type: 'trip', value: 900 },
    { label: '900', type: 'cash', value: 900 },
    { label: '5,000', type: 'cash', value: 5000 },
    { label: 'LOSE TURN', type: 'lose-turn', value: 0 },
    { label: '1,100', type: 'cash', value: 1100 },
    { label: '1,600', type: 'cash', value: 1600 },
    { label: 'TRIP', type: 'trip', value: 900 },
    { label: '850', type: 'cash', value: 850 },
    { label: 'BANKRUPT', type: 'bankrupt', value: 0 },
    { label: '1,400', type: 'cash', value: 1400 },
    { label: '1,000', type: 'cash', value: 1000 },
    { label: '2,500', type: 'cash', value: 2500 },
    { label: '1,300', type: 'cash', value: 1300 },
    { label: '950', type: 'cash', value: 950 },
  ]),
]);

// The last main round before the bonus round.
export const FINAL_ROUND = ROUND_WHEELS.length;

// Kept for the lobby preview and as the opening-round wheel.
export const WHEEL_SEGMENTS = ROUND_WHEELS[0];

export function wheelForRound(round) {
  const index = Math.min(Math.max(Math.trunc(Number(round) || 1), 1), ROUND_WHEELS.length) - 1;
  return ROUND_WHEELS[index];
}

export function wheelForGame(game) {
  return wheelForRound(game.round).map((segment, index) => (
    segment.type === 'trip' && game.claimedTripIndices.includes(index)
      ? { label: segment.value.toLocaleString('en-US'), type: 'cash', value: segment.value }
      : segment
  ));
}

// Landing on a trip wedge reveals one of these surprises; solve the round to keep it.
export const TRIP_PRIZES = Object.freeze(
  [
    { id: 'reef', label: 'Coral Reef Snorkel Week', note: 'Warm water, warmer welcome.', value: 6000 },
    { id: 'alps', label: 'Alpine Cabin Escape', note: 'Cocoa at the top of the world.', value: 7500 },
    { id: 'kyoto', label: 'Kyoto Blossom Tour', note: 'Petals on every path.', value: 9000 },
    { id: 'safari', label: 'Savanna Sunrise Safari', note: 'Coffee with a lion’s view.', value: 11000 },
    { id: 'islands', label: 'Island Hopping Sail', note: 'Five islands, one breeze.', value: 8000 },
    { id: 'northern', label: 'Northern Lights Lodge', note: 'A sky that shows off.', value: 9500 },
    { id: 'canyon', label: 'Red Canyon Road Trip', note: 'Big rocks, bigger playlists.', value: 5500 },
    { id: 'lisbon', label: 'Lisbon Food Weekend', note: 'Pastries on every corner.', value: 6500 },
  ].map(Object.freeze),
);

// The bonus wheel hides these behind identical envelopes until the round ends.
export const BONUS_PRIZES = Object.freeze(
  [
    { id: 'classic', label: 'The Classic Cash Envelope', note: '$25,000 in cash for your next big idea.', type: 'cash', value: 25000 },
    { id: 'golden', label: 'The Golden Cash Envelope', note: '$40,000 in cash to brighten your future.', type: 'cash', value: 40000 },
    { id: 'roadster', label: 'A Shiny Little Roadster', note: 'A new convertible for open-road adventures.', type: 'car', value: 50000 },
    { id: 'world', label: 'A Trip Around the World', note: 'A globe-spanning getaway with flights and stays included.', type: 'trip', value: 75000 },
    { id: 'jackpot', label: 'The Wisdom Cash Jackpot', note: '$100,000 in cash: the ultimate wisdom reward.', type: 'cash', value: 100000 },
    { id: 'homestead', label: 'A Cozy Cabin Homestead', note: 'Your own little cabin home, not just a holiday stay.', type: 'home', value: 60000 },
  ].map(Object.freeze),
);

export const BONUS_WHEEL = freezeWheel(
  Array.from({ length: 6 }, (_, index) => ({ label: '?', type: 'mystery', value: 0, slot: index + 1 })),
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

function startClock(game) {
  game.turnSerial += 1;
}

function passTurn(game) {
  game.activePlayer = (game.activePlayer + 1) % game.players.length;
  game.action = 'spin';
  game.pendingValue = 0;
  game.pendingTrip = null;
  startClock(game);
  game.message += ` ${game.players[game.activePlayer].name}, it is your turn.`;
}

// A full game uses one puzzle per round plus the bonus puzzle.
export const PUZZLES_PER_GAME = FINAL_ROUND + 1;

// Puzzles played in earlier games are skipped until the bank can no longer fill a game.
export function usablePuzzleHistory(seenPuzzleIds) {
  const known = new Set(PUZZLES.map((puzzle) => puzzle.id));
  const seen = Array.isArray(seenPuzzleIds)
    ? [...new Set(seenPuzzleIds.filter((id) => known.has(id)))]
    : [];
  return PUZZLES.length - seen.length >= PUZZLES_PER_GAME ? seen : [];
}

export function createGame(names, rng = Math.random, seenPuzzleIds = []) {
  requireCondition(
    Array.isArray(names) && names.length >= 2 && names.length <= 3,
    'Choose two or three players.',
  );
  requireCondition(
    Array.from(names).every((name) => typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 24),
    'Player names must contain 1 to 24 characters.',
  );
  const players = names.map((name) => ({ name: name.trim(), total: 0, round: 0, trips: [] }));
  const seen = usablePuzzleHistory(seenPuzzleIds);
  const puzzle = pickPuzzle(seen, rng);
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
    usedPuzzleIds: [...seen, puzzle.id],
    lastSpin: null,
    pendingTrip: null,
    claimedTripIndices: [],
    roundPrizes: [],
    turnSerial: 1,
    turnSeconds: TURN_SECONDS,
    bonusSeconds: BONUS_SECONDS,
    bonusPickSeconds: BONUS_PICK_SECONDS,
    bonusPrizeLabel: null,
    bonusPrizeNote: null,
    bonusPrizeType: null,
    bonusPrizeRevealed: false,
    bonusSpin: null,
    tieBreak: false,
  };
}

export function spinWheel(game, rng = Math.random) {
  requireMainAction(game);
  requireCondition(game.action === 'spin', 'Choose a consonant before spinning again.');
  const wheel = wheelForGame(game);
  // Two Bankrupts in a row is no fun, so that wedge is skipped right after one lands.
  const blockBankrupt = game.lastSpin?.type === 'bankrupt';
  const eligible = wheel
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => !(blockBankrupt && segment.type === 'bankrupt'));
  const { segment, index } = eligible[randomIndex(eligible.length, rng)];
  game.lastSpin = { index, ...segment };
  game.pendingTrip = null;
  if (segment.type === 'cash' || segment.type === 'trip') {
    game.pendingValue = segment.value * (game.round === FINAL_ROUND ? 2 : 1);
    game.action = 'consonant';
    startClock(game);
    if (segment.type === 'trip') {
      game.pendingTrip = { ...TRIP_PRIZES[randomIndex(TRIP_PRIZES.length, rng)] };
      game.lastSpin.prize = { ...game.pendingTrip };
      game.message = `Trip surprise: ${game.pendingTrip.label}! Name a matching consonant to claim it, then solve the round to keep it.`;
    } else {
      game.message = `Choose a consonant for $${game.pendingValue.toLocaleString('en-US')} per letter.`;
    }
  } else {
    if (segment.type === 'bankrupt') {
      const player = game.players[game.activePlayer];
      const lostTrips = player.trips.length;
      player.round = 0;
      player.trips = [];
      game.message = `Bankrupt! Your round winnings${lostTrips > 0 ? ' and trips are' : ' are'} cleared; your banked total is safe.`;
    } else {
      game.message = 'Lose a turn! Your winnings are safe.';
    }
    passTurn(game);
  }
  return game;
}

export function expireTurn(game) {
  requireMainAction(game);
  game.message = `Time is up, ${game.players[game.activePlayer].name}!`;
  passTurn(game);
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
  const trip = game.pendingTrip;
  game.usedLetters.push(choice);
  game.action = 'spin';
  game.pendingValue = 0;
  game.pendingTrip = null;
  if (occurrences > 0) {
    const claimed = trip && !vowel;
    if (claimed) {
      player.trips.push({ ...trip });
      game.claimedTripIndices.push(game.lastSpin.index);
    }
    startClock(game);
    game.message = `${choice} appears ${occurrences} time${occurrences === 1 ? '' : 's'}!${claimed ? ` The ${trip.label} is yours if you solve this round.` : ''} Spin, buy a vowel, or solve.`;
  } else {
    game.message = `No ${choice} in this puzzle.${trip ? ` The ${trip.label} slips away.` : ''}`;
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
  const trips = player.trips.map((trip) => ({ ...trip }));
  const tripValue = trips.reduce((total, trip) => total + trip.value, 0);
  player.total += prize + tripValue;
  game.roundWinner = game.activePlayer;
  game.roundPrizes = trips;
  game.phase = 'round-end';
  game.action = 'spin';
  game.pendingValue = 0;
  game.pendingTrip = null;
  game.message = `${player.name} solved it and banks $${(prize + tripValue).toLocaleString('en-US')}!${trips.length > 0 ? ` Trips won: ${trips.map((trip) => trip.label).join(', ')}.` : ''}`;
  return game;
}

export function nextRound(game, rng = Math.random) {
  requireCondition(game.phase === 'round-end', 'Finish the current round first.');
  let champion = null;
  let tied = false;
  if (game.round === FINAL_ROUND) {
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
  game.players.forEach((player) => { player.round = 0; player.trips = []; });
  game.usedLetters = [];
  game.action = 'spin';
  game.pendingValue = 0;
  game.pendingTrip = null;
  game.lastSpin = null;
  game.roundWinner = null;
  game.roundPrizes = [];
  game.claimedTripIndices = [];
  startClock(game);
  if (game.round < FINAL_ROUND) {
    game.round += 1;
    const lowest = Math.min(...game.players.map((player) => player.total));
    const rotationStart = (game.round - 1) % game.players.length;
    game.activePlayer = Array.from(
      { length: game.players.length },
      (_, offset) => (rotationStart + offset) % game.players.length,
    ).find((index) => game.players[index].total === lowest);
    game.phase = 'playing';
    game.message = `Round ${game.round}${game.round === FINAL_ROUND ? ': double wheel values' : ''}! A bigger wheel with ${wheelForRound(game.round).length} spaces is in play. ${game.players[game.activePlayer].name}, you start.`;
  } else {
    game.champion = champion;
    game.activePlayer = champion;
    game.tieBreak = tied;
    game.phase = 'bonus-spin';
    game.bonusLetters = [];
    game.bonusWon = null;
    game.bonusPrizeLabel = null;
    game.bonusPrizeNote = null;
    game.bonusPrizeType = null;
    game.bonusPrizeRevealed = false;
    game.bonusSpin = null;
    game.message = `${tied ? 'Tie-break: a random draw selected the champion. ' : ''}${game.players[champion].name} plays the bonus round! Spin the mystery wheel to lock in a hidden prize.`;
  }
  return game;
}

export function spinBonusWheel(game, rng = Math.random) {
  requireCondition(game.phase === 'bonus-spin', 'The mystery wheel is not ready to spin.');
  const index = randomIndex(BONUS_WHEEL.length, rng);
  const prize = BONUS_PRIZES[randomIndex(BONUS_PRIZES.length, rng)];
  game.bonusSpin = { index, slot: BONUS_WHEEL[index].slot };
  game.bonusPrize = prize.value;
  game.bonusPrizeLabel = prize.label;
  game.bonusPrizeNote = prize.note;
  game.bonusPrizeType = prize.type;
  game.bonusPrizeRevealed = false;
  game.phase = 'bonus-pick';
  game.message = `Envelope ${game.bonusSpin.slot} is locked in and stays sealed until the bonus round ends. R S T L N E are given. ${remainingLettersText(game)} You have ${BONUS_PICK_SECONDS} seconds to choose.`;
  return game;
}

// How many bonus consonants and vowels the champion still has to choose.
export function bonusLettersRemaining(game) {
  const picked = Array.isArray(game?.bonusLetters) ? game.bonusLetters : [];
  const vowels = picked.filter((letter) => VOWELS.includes(letter)).length;
  return {
    consonants: Math.max(0, BONUS_CONSONANTS - (picked.length - vowels)),
    vowels: Math.max(0, BONUS_VOWELS - vowels),
  };
}

function remainingLettersText(game) {
  const { consonants, vowels } = bonusLettersRemaining(game);
  return `${consonants} consonant${consonants === 1 ? '' : 's'} and ${vowels} vowel${vowels === 1 ? '' : 's'} left to pick.`;
}

export function chooseBonusLetter(game, letter) {
  requireCondition(game.phase === 'bonus-pick', 'Bonus letter selection is not open.');
  const choice = parseLetter(letter);
  requireCondition(!BONUS_GIVEN.includes(choice), 'R S T L N E are already given.');
  requireCondition(!game.bonusLetters.includes(choice), 'That bonus letter has already been chosen.');
  const vowel = VOWELS.includes(choice);
  const sameTypeCount = game.bonusLetters.filter((picked) => VOWELS.includes(picked) === vowel).length;
  requireCondition(
    sameTypeCount < (vowel ? BONUS_VOWELS : BONUS_CONSONANTS),
    vowel ? 'Choose only one bonus vowel.' : 'Choose only three bonus consonants.',
  );
  game.bonusLetters.push(choice);
  if (game.bonusLetters.length === BONUS_CONSONANTS + BONUS_VOWELS) {
    game.phase = 'bonus-solve';
    game.message = `Your letters are revealed. You have ${BONUS_SECONDS} seconds to solve the bonus puzzle!`;
  } else {
    game.message = `${choice} is in. ${remainingLettersText(game)}`;
  }
  return game;
}

// Running out of pick time simply starts the solve with whatever letters were chosen.
export function expireBonusPick(game) {
  requireCondition(game.phase === 'bonus-pick', 'Bonus letter selection is not open.');
  game.phase = 'bonus-solve';
  game.message = `Time is up on your picks! ${game.bonusLetters.length > 0 ? `Your letters are revealed. ` : ''}You have ${BONUS_SECONDS} seconds to solve the bonus puzzle!`;
  return game;
}

export function solveBonus(game, answer) {
  requireCondition(game.phase === 'bonus-solve', 'The bonus puzzle is not ready to solve.');
  const normalized = parseAnswer(answer);
  game.bonusWon = normalized === normalizeAnswer(game.puzzle.phrase);
  game.bonusPrizeRevealed = true;
  if (game.bonusWon) {
    game.players[game.champion].total += game.bonusPrize;
    game.message = `${game.players[game.champion].name} unlocks ${game.bonusPrizeLabel ?? 'the mystery prize'}, worth $${game.bonusPrize.toLocaleString('en-US')}!`;
  } else {
    game.message = `Not quite! The envelope held ${game.bonusPrizeLabel ?? 'the mystery prize'}, worth $${game.bonusPrize.toLocaleString('en-US')}. It was not won, but your banked winnings are safe. Thanks for playing!`;
  }
  game.phase = 'game-over';
  return game;
}

export function expireBonus(game) {
  requireCondition(game.phase === 'bonus-solve', 'There is no active bonus timer.');
  game.bonusWon = false;
  game.bonusPrizeRevealed = true;
  game.phase = 'game-over';
  game.message = `Time is up! The envelope held ${game.bonusPrizeLabel ?? 'the mystery prize'}, worth $${game.bonusPrize.toLocaleString('en-US')}. It was not won, but your banked winnings are safe. Thanks for playing!`;
  return game;
}

export function isLetterRevealed(game, letter) {
  const normalized = String(letter).toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) return true;
  if (game.phase === 'round-end' || game.phase === 'game-over') return true;
  if (game.phase === 'bonus-spin' || game.phase === 'bonus-pick' || game.phase === 'bonus-solve') {
    return BONUS_GIVEN.includes(normalized) || game.bonusLetters.includes(normalized);
  }
  return game.usedLetters.includes(normalized);
}
