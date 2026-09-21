import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WHEEL_SEGMENTS, ROUND_WHEELS, BONUS_WHEEL, BONUS_PRIZES, TRIP_PRIZES, TURN_SECONDS, wheelForRound,
  VOWELS, createGame, spinWheel, guessLetter, solvePuzzle, expireTurn,
  nextRound, spinBonusWheel, chooseBonusLetter, solveBonus, expireBonus, isLetterRevealed, normalizeAnswer,
} from '../src/game.js';
import { PUZZLES } from '../src/puzzles.js';

const fixed = () => 0;
const gameWith = (phrase = 'BANANA BREAD', names = ['Ada', 'Bo']) => {
  const game = createGame(names, fixed);
  game.puzzle = { ...game.puzzle, phrase };
  return game;
};
const spin = (game, type = 'cash') => {
  const wheel = wheelForRound(game.round);
  const index = wheel.findIndex((segment) => segment.type === type);
  assert.ok(index >= 0, `Round ${game.round} has no ${type} segment`);
  return spinWheel(game, () => (index + 0.5) / wheel.length);
};
const assertRejected = (game, action, pattern) => {
  const before = structuredClone(game);
  assert.throws(action, pattern ?? Error);
  assert.deepEqual(game, before, 'Rejected actions must not mutate the game');
};
const finishRound = (game) => solvePuzzle(game, game.puzzle.phrase);
const reachBonus = (names = ['Ada', 'Bo']) => {
  const game = createGame(names, fixed);
  for (let round = 1; round <= 3; round++) {
    finishRound(game);
    nextRound(game, fixed);
  }
  spinBonusWheel(game, fixed);
  return game;
};
const readyBonus = () => {
  const game = reachBonus();
  for (const letter of 'BCDA') chooseBonusLetter(game, letter);
  return game;
};
const sequence = (...values) => {
  let index = 0;
  return () => {
    assert.ok(index < values.length, 'Unexpected random draw');
    return values[index++];
  };
};

test('puzzle library has unique original phone-friendly phrases in diverse categories', () => {
  assert.ok(PUZZLES.length >= 80);
  assert.ok(new Set(PUZZLES.map((p) => p.category)).size >= 8);
  assert.equal(new Set(PUZZLES.map((p) => p.id)).size, PUZZLES.length);
  assert.equal(new Set(PUZZLES.map((p) => normalizeAnswer(p.phrase))).size, PUZZLES.length);
  for (const puzzle of PUZZLES) {
    assert.ok(puzzle.phrase.length <= 40, puzzle.phrase);
    assert.ok(puzzle.category && puzzle.id);
    for (const word of puzzle.phrase.match(/[A-Z]+/g)) {
      assert.ok(word.length <= 12, word);
    }
  }
});

test('round wheels grow each round, keep hazards, and add trip surprises', () => {
  assert.equal(VOWELS, 'AEIOU');
  assert.equal(WHEEL_SEGMENTS, ROUND_WHEELS[0]);
  assert.equal(WHEEL_SEGMENTS.length, 12);
  assert.equal(ROUND_WHEELS.length, 3);
  for (let round = 1; round <= 3; round++) {
    const wheel = wheelForRound(round);
    assert.equal(wheel, ROUND_WHEELS[round - 1]);
    if (round > 1) assert.ok(wheel.length > wheelForRound(round - 1).length);
    assert.equal(wheel.filter((s) => s.type === 'lose-turn').length, 1);
    assert.ok([1, 2].includes(wheel.filter((s) => s.type === 'bankrupt').length));
    assert.equal(wheel.filter((s) => s.type === 'trip').length, Math.min(round - 1, 2));
    const cash = wheel.filter((s) => s.type === 'cash').map((s) => s.value);
    assert.ok(Math.max(...cash) > (round === 1 ? 0 : Math.max(...wheelForRound(round - 1).filter((s) => s.type === 'cash').map((s) => s.value))));
    for (const segment of wheel) {
      assert.equal(typeof segment.label, 'string');
      assert.ok(['cash', 'bankrupt', 'lose-turn', 'trip'].includes(segment.type));
      assert.ok(Number.isFinite(segment.value));
      assert.ok(['cash', 'trip'].includes(segment.type) ? segment.value > 0 && segment.value <= 3500 : segment.value === 0);
    }
  }
  assert.equal(wheelForRound(0), ROUND_WHEELS[0]);
  assert.equal(wheelForRound(9), ROUND_WHEELS[2]);
  assert.equal(wheelForRound('2'), ROUND_WHEELS[1]);
});

test('trip and bonus prize catalogs are usable and positive', () => {
  for (const prize of TRIP_PRIZES) {
    assert.ok(prize.id && prize.label && prize.note);
    assert.ok(prize.value > 0);
  }
  for (const prize of BONUS_PRIZES) {
    assert.ok(prize.id && prize.label);
    assert.ok(prize.value > 0);
  }
  assert.ok(BONUS_WHEEL.length >= 2);
  assert.ok(BONUS_WHEEL.every((segment) => segment.type === 'mystery'));
});

test('a turn expires by passing play without touching winnings', () => {
  const game = gameWith();
  spin(game);
  guessLetter(game, 'B');
  const serial = game.turnSerial;
  const winnings = game.players[0].round;
  assert.equal(expireTurn(game), game);
  assert.equal(game.activePlayer, 1);
  assert.equal(game.action, 'spin');
  assert.equal(game.players[0].round, winnings);
  assert.ok(game.turnSerial > serial);
  assert.match(game.message, /time is up/i);
});

test('the turn clock restarts on every successful action', () => {
  const game = gameWith();
  const start = game.turnSerial;
  spin(game);
  assert.ok(game.turnSerial > start);
  const afterSpin = game.turnSerial;
  guessLetter(game, 'B');
  assert.ok(game.turnSerial > afterSpin);
});

test('turn expiry is rejected outside an active main-round turn', () => {
  const game = gameWith();
  finishRound(game);
  assertRejected(game, () => expireTurn(game));
  const bonus = reachBonus();
  assertRejected(bonus, () => expireTurn(bonus));
});

test('a trip wedge is claimed with a matching consonant and banked by the solver', () => {
  const game = gameWith('BANANA BREAD');
  game.round = 2;
  spin(game, 'trip');
  assert.equal(game.action, 'consonant');
  assert.ok(game.pendingTrip);
  assert.deepEqual(game.lastSpin.prize, game.pendingTrip);
  const trip = { ...game.pendingTrip };
  guessLetter(game, 'B');
  assert.equal(game.pendingTrip, null);
  assert.deepEqual(game.players[0].trips, [trip]);
  const cash = game.players[0].round;
  finishRound(game);
  assert.equal(game.players[0].total, cash + trip.value);
  assert.deepEqual(game.roundPrizes, [trip]);
});

test('a missed consonant loses the pending trip and the turn', () => {
  const game = gameWith('BANANA BREAD');
  game.round = 2;
  spin(game, 'trip');
  guessLetter(game, 'Z');
  assert.equal(game.pendingTrip, null);
  assert.deepEqual(game.players[0].trips, []);
  assert.equal(game.activePlayer, 1);
});

test('a pending trip cannot be claimed by buying a vowel', () => {
  const game = gameWith('BANANA BREAD');
  game.round = 2;
  spin(game);
  guessLetter(game, 'D');
  spin(game, 'trip');
  assertRejected(game, () => guessLetter(game, 'A'));
  guessLetter(game, 'B');
  assert.equal(game.players[0].trips.length, 1);
  guessLetter(game, 'A');
  assert.equal(game.players[0].trips.length, 1);
});

test('bankrupt clears held trips along with round winnings', () => {
  const game = gameWith('BANANA BREAD');
  game.round = 2;
  spin(game, 'trip');
  guessLetter(game, 'B');
  assert.equal(game.players[0].trips.length, 1);
  game.activePlayer = 0;
  game.action = 'spin';
  spin(game, 'bankrupt');
  assert.deepEqual(game.players[0].trips, []);
  assert.equal(game.players[0].round, 0);
});

test('trips are cleared between rounds and are never awarded to a non-solver', () => {
  const game = gameWith('BANANA BREAD');
  game.round = 2;
  spin(game, 'trip');
  guessLetter(game, 'B');
  game.activePlayer = 1;
  game.action = 'spin';
  finishRound(game);
  assert.deepEqual(game.roundPrizes, []);
  assert.equal(game.players[1].total, 1000);
  nextRound(game, fixed);
  assert.ok(game.players.every((player) => player.trips.length === 0));
  assert.deepEqual(game.roundPrizes, []);
});

test('the bonus round spins a sealed mystery prize before letters are picked', () => {
  const game = createGame(['Ada', 'Bo'], fixed);
  for (let round = 1; round <= 3; round++) {
    finishRound(game);
    nextRound(game, fixed);
  }
  assert.equal(game.phase, 'bonus-spin');
  assertRejected(game, () => chooseBonusLetter(game, 'B'));
  assert.equal(spinBonusWheel(game, () => 0.999), game);
  assert.equal(game.phase, 'bonus-pick');
  assert.equal(game.bonusSpin.index, BONUS_WHEEL.length - 1);
  assert.equal(game.bonusPrize, BONUS_PRIZES.at(-1).value);
  assert.equal(game.bonusPrizeLabel, BONUS_PRIZES.at(-1).label);
  assert.equal(game.bonusPrizeRevealed, false);
  assertRejected(game, () => spinBonusWheel(game, fixed));
});

test('winning the bonus unlocks the mystery prize, losing keeps it sealed', () => {
  const won = readyBonus();
  const banked = won.players[won.champion].total;
  solveBonus(won, won.puzzle.phrase);
  assert.equal(won.bonusPrizeRevealed, true);
  assert.equal(won.players[won.champion].total, banked + won.bonusPrize);
  assert.match(won.message, new RegExp(won.bonusPrizeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const lost = readyBonus();
  solveBonus(lost, 'NOPE');
  assert.equal(lost.bonusPrizeRevealed, false);
  const expired = readyBonus();
  expireBonus(expired);
  assert.equal(expired.bonusPrizeRevealed, false);
});

test('creation initializes the complete UI contract and trims names', () => {
  const game = createGame([' Ada ', 'Bo', 'Cy'], fixed);
  assert.deepEqual(game.players, ['Ada', 'Bo', 'Cy'].map((name) => ({ name, total: 0, round: 0, trips: [] })));
  assert.equal(game.activePlayer, 0);
  assert.equal(game.round, 1);
  assert.equal(game.phase, 'playing');
  assert.equal(game.action, 'spin');
  assert.equal(game.pendingValue, 0);
  assert.equal(game.roundWinner, null);
  assert.equal(game.champion, null);
  assert.equal(game.lastSpin, null);
  assert.equal(game.bonusWon, null);
  assert.equal(game.pendingTrip, null);
  assert.equal(game.bonusSpin, null);
  assert.equal(game.turnSeconds, TURN_SECONDS);
  assert.deepEqual(game.roundPrizes, []);
  assert.ok(game.bonusPrize > 0);
  assert.ok(game.message.length > 0);
  assert.deepEqual(game.usedLetters, []);
  assert.deepEqual(game.bonusLetters, []);
  assert.deepEqual(game.usedPuzzleIds, [game.puzzle.id]);
});

for (const names of [null, 'Ada', [], ['Ada'], ['A', 'B', 'C', 'D'], ['', 'B'], ['  ', 'B'], [3, 'B'], ['A'.repeat(25), 'B']]) {
  test(`invalid names rejected: ${JSON.stringify(names)}`, () => {
    assert.throws(() => createGame(names, fixed), Error);
  });
}

test('24-character names accepted and game instances do not share state', () => {
  const names = ['A'.repeat(24), 'B'];
  const first = createGame(names, fixed);
  const second = createGame(names, fixed);
  first.players[0].round = 500;
  first.puzzle.phrase = 'CHANGED';
  first.usedLetters.push('Z');
  assert.equal(second.players[0].round, 0);
  assert.notEqual(second.puzzle.phrase, 'CHANGED');
  assert.deepEqual(second.usedLetters, []);
  assert.equal(names.length, 2);
});

test('sparse player arrays cannot bypass name validation', () => {
  assert.throws(() => createGame(Array(2), fixed), Error);
  const names = ['Ada', 'Bo'];
  delete names[1];
  assert.throws(() => createGame(names, fixed), Error);
});

test('categories are selected before puzzles, including the final available indices', () => {
  const categories = [...new Set(PUZZLES.map((p) => p.category))];
  for (let index = 0; index < categories.length; index++) {
    const category = categories[index];
    const candidates = PUZZLES.filter((p) => p.category === category);
    const game = createGame(['A', 'B'], sequence((index + 0.5) / categories.length, 0.999999));
    assert.equal(game.puzzle.category, category);
    assert.equal(game.puzzle.id, candidates.at(-1).id);
  }
});

test('successive rounds and bonus never reuse puzzles even with constant randomness', () => {
  const game = reachBonus();
  assert.equal(game.usedPuzzleIds.length, 4);
  assert.equal(new Set(game.usedPuzzleIds).size, 4);
  assert.equal(game.puzzle.id, game.usedPuzzleIds.at(-1));
});

test('selection excludes exhausted categories before choosing a category', () => {
  const game = gameWith();
  const firstCategory = PUZZLES[0].category;
  game.usedPuzzleIds = PUZZLES.filter((p) => p.category === firstCategory).map((p) => p.id);
  finishRound(game);
  nextRound(game, fixed);
  assert.notEqual(game.puzzle.category, firstCategory);
});

test('every segment can be selected and lastSpin retains its base wheel value', () => {
  for (const round of [1, 2, 3]) {
    const wheel = wheelForRound(round);
    for (let index = 0; index < wheel.length; index++) {
      const game = gameWith();
      game.round = round;
      assert.equal(spinWheel(game, () => (index + 0.5) / wheel.length), game);
      const expected = { index, ...wheel[index] };
      if (wheel[index].type === 'trip') expected.prize = { ...game.lastSpin.prize };
      assert.deepEqual(game.lastSpin, expected);
      assert.equal(game.pendingValue, wheel[index].value * (round === 3 ? 2 : 1));
    }
  }
});

test('cash spin requires a consonant and cannot be repeated', () => {
  const game = gameWith();
  spin(game);
  assert.equal(game.action, 'consonant');
  assert.equal(game.pendingValue, 500);
  assert.equal(game.activePlayer, 0);
  assertRejected(game, () => spin(game));
  assertRejected(game, () => guessLetter(game, 'A'));
});

test('correct consonant rewards each occurrence and retains turn', () => {
  const game = gameWith();
  spin(game);
  assert.equal(guessLetter(game, ' b '), game);
  assert.equal(game.players[0].round, 1000);
  assert.equal(game.players[0].total, 0);
  assert.equal(game.activePlayer, 0);
  assert.equal(game.action, 'spin');
  assert.equal(game.pendingValue, 0);
  assert.deepEqual(game.usedLetters, ['B']);
  assert.equal(isLetterRevealed(game, 'b'), true);
  assert.equal(isLetterRevealed(game, 'A'), false);
});

test('third round doubles per-occurrence cash rewards', () => {
  const game = gameWith();
  game.round = 3;
  spin(game);
  const wheelValue = wheelForRound(3).find((segment) => segment.type === 'cash').value;
  guessLetter(game, 'B');
  assert.equal(game.players[0].round, wheelValue * 2 * 2);
});

test('consonants require spinning first', () => {
  const game = gameWith();
  assertRejected(game, () => guessLetter(game, 'B'));
});

test('missing consonant changes turn without charging money', () => {
  const game = gameWith();
  game.players[0].round = 700;
  spin(game);
  guessLetter(game, 'Z');
  assert.equal(game.activePlayer, 1);
  assert.equal(game.players[0].round, 700);
  assert.equal(game.action, 'spin');
  assert.equal(game.pendingValue, 0);
  assert.deepEqual(game.usedLetters, ['Z']);
});

for (const count of [2, 3]) {
  test(`${count}-player turns wrap after failed guesses`, () => {
    const game = gameWith('AAA', ['Ada', 'Bo', 'Cy'].slice(0, count));
    for (let index = 0; index < count; index++) {
      spin(game);
      guessLetter(game, 'BCD'[index]);
      assert.equal(game.activePlayer, (index + 1) % count);
    }
  });
}

for (const invalid of ['', 'AB', '1', '!', null, undefined, 12, 'é']) {
  test(`invalid letter rejected without mutation: ${String(invalid)}`, () => {
    const game = gameWith();
    spin(game);
    assertRejected(game, () => guessLetter(game, invalid));
  });
}

test('repeated consonants leave pending spin intact and are shared across players', () => {
  const game = gameWith();
  spin(game);
  guessLetter(game, 'Z');
  spin(game);
  assertRejected(game, () => guessLetter(game, 'z'));
  assert.equal(game.pendingValue, 500);
  guessLetter(game, 'B');
  assert.equal(game.players[1].round, 1000);
});

test('a vowel costs exactly 250 regardless of occurrences or round multiplier', () => {
  const game = gameWith();
  game.round = 3;
  game.players[0].round = 250;
  assert.equal(guessLetter(game, 'a'), game);
  assert.equal(game.players[0].round, 0);
  assert.equal(game.activePlayer, 0);
  assert.equal(game.action, 'spin');
  assert.deepEqual(game.usedLetters, ['A']);
  assertRejected(game, () => guessLetter(game, 'A'));
});

test('vowels cannot be purchased using banked totals', () => {
  const game = gameWith();
  game.players[0].total = 10000;
  game.players[0].round = 249;
  assertRejected(game, () => guessLetter(game, 'A'));
});

test('wrong vowels still cost 250 and pass the turn', () => {
  const game = gameWith();
  game.players[0].round = 500;
  guessLetter(game, 'U');
  assert.equal(game.players[0].round, 250);
  assert.equal(game.activePlayer, 1);
  assert.equal(game.pendingValue, 0);
  assert.deepEqual(game.usedLetters, ['U']);
});

test('bankruptcy clears only the active player round winnings', () => {
  const game = gameWith();
  game.players[0].round = 3500;
  game.players[0].total = 1200;
  game.players[1].round = 900;
  spin(game, 'bankrupt');
  assert.equal(game.players[0].round, 0);
  assert.equal(game.players[0].total, 1200);
  assert.equal(game.players[1].round, 900);
  assert.equal(game.activePlayer, 1);
  assert.equal(game.action, 'spin');
  assert.equal(game.pendingValue, 0);
});

test('lose-turn preserves both balances and passes turn', () => {
  const game = gameWith();
  game.players[0].round = 750;
  game.players[0].total = 2000;
  spin(game, 'lose-turn');
  assert.equal(game.players[0].round, 750);
  assert.equal(game.players[0].total, 2000);
  assert.equal(game.activePlayer, 1);
  assert.equal(game.action, 'spin');
});

test('revealing every letter does not automatically award a round', () => {
  const game = gameWith('B');
  spin(game);
  guessLetter(game, 'B');
  assert.equal(game.phase, 'playing');
  assert.equal(game.roundWinner, null);
  assert.equal(game.players[0].total, 0);
  finishRound(game);
  assert.equal(game.phase, 'round-end');
});

test('answer normalization ignores case, punctuation and whitespace, but not omitted letters', () => {
  assert.equal(normalizeAnswer("  A BAKER'S   DOZEN! "), normalizeAnswer('a bakers dozen'));
  const game = gameWith('A WELL-WORN PAIR OF BOOTS');
  assert.equal(solvePuzzle(game, ' a well worn  pair of boots! '), game);
  assert.equal(game.phase, 'round-end');
  const incomplete = gameWith('A WELL-WORN PAIR OF BOOTS');
  solvePuzzle(incomplete, 'well worn pair of boots');
  assert.equal(incomplete.phase, 'playing');
  assert.equal(incomplete.activePlayer, 1);
});

for (const answer of ['', '   ', '?!-', null, undefined, 10]) {
  test(`invalid solve is rejected rather than losing turn: ${String(answer)}`, () => {
    const game = gameWith();
    assertRejected(game, () => solvePuzzle(game, answer));
  });
}

for (const action of ['spin', 'consonant']) {
  test(`wrong solve from ${action} clears pending reward and passes turn`, () => {
    const game = gameWith();
    game.players[0].round = 900;
    if (action === 'consonant') spin(game);
    assert.equal(solvePuzzle(game, 'WRONG ANSWER'), game);
    assert.equal(game.activePlayer, 1);
    assert.equal(game.action, 'spin');
    assert.equal(game.pendingValue, 0);
    assert.equal(game.players[0].round, 900);
    assert.equal(game.players[0].total, 0);
  });
  test(`correct solve from ${action} banks only the winner and exposes the puzzle`, () => {
    const game = gameWith();
    game.players[0].round = 1800;
    game.players[0].total = 700;
    game.players[1].round = 4000;
    game.players[1].total = 2000;
    if (action === 'consonant') spin(game);
    finishRound(game);
    assert.equal(game.players[0].total, 2500);
    assert.equal(game.players[1].total, 2000);
    assert.equal(game.roundWinner, 0);
    assert.equal(game.phase, 'round-end');
    assert.equal(game.pendingValue, 0);
    assert.equal(isLetterRevealed(game, 'Z'), true);
    assertRejected(game, () => finishRound(game));
  });
}

for (const balance of [0, 250, 999, 1000, 1500]) {
  test(`solve minimum prize with round balance ${balance}`, () => {
    const game = gameWith();
    game.players[0].round = balance;
    finishRound(game);
    assert.equal(game.players[0].total, Math.max(1000, balance));
  });
}

for (const count of [2, 3]) {
  test(`${count}-player round starters rotate independently of round winners`, () => {
    const game = gameWith('BANANA', ['Ada', 'Bo', 'Cy'].slice(0, count));
    for (let round = 1; round < 3; round++) {
      game.activePlayer = count - 1;
      game.players.forEach((player) => { player.round = 500; });
      finishRound(game);
      const totals = game.players.map((player) => player.total);
      assert.equal(nextRound(game, fixed), game);
      assert.equal(game.round, round + 1);
      assert.equal(game.activePlayer, round % count);
      assert.equal(game.phase, 'playing');
      assert.equal(game.roundWinner, null);
      assert.equal(game.lastSpin, null);
      assert.equal(game.action, 'spin');
      assert.equal(game.pendingValue, 0);
      assert.deepEqual(game.usedLetters, []);
      assert.deepEqual(game.players.map((p) => p.round), Array(count).fill(0));
      assert.deepEqual(game.players.map((p) => p.total), totals);
    }
    assert.match(game.message, /double/i);
  });
}

test('champion is highest banked total rather than last round winner', () => {
  const game = gameWith();
  game.round = 3;
  game.players[0].total = 5000;
  game.activePlayer = 1;
  finishRound(game);
  nextRound(game, fixed);
  assert.equal(game.champion, 0);
  assert.equal(game.activePlayer, 0);
  assert.equal(game.phase, 'bonus-spin');
  assert.equal(game.round, 3);
  assert.doesNotMatch(game.message, /tie-break/i);
});

test('ties draw only among leaders and explicitly announce the tie-break', () => {
  for (const [draw, winner] of [[0, 0], [0.999, 2]]) {
    const game = gameWith('A', ['Ada', 'Bo', 'Cy']);
    game.round = 3;
    finishRound(game);
    game.players[0].total = 3000;
    game.players[1].total = 2000;
    game.players[2].total = 3000;
    nextRound(game, sequence(draw, 0, 0));
    assert.equal(game.champion, winner);
    assert.equal(game.activePlayer, winner);
    assert.match(game.message, /tie-break.*random/i);
  }
});

test('three-way tie is supported', () => {
  const game = reachBonus(['Ada', 'Bo', 'Cy']);
  assert.equal(game.champion, 0);
  assert.equal(game.tieBreak, true);
});

test('bonus automatically reveals RSTLNE and punctuation, not main guesses', () => {
  const game = reachBonus();
  game.usedLetters.push('Z');
  for (const char of 'RSTLNE rstlne-!,') assert.equal(isLetterRevealed(game, char), true);
  assert.equal(isLetterRevealed(game, 'Z'), false);
  assert.equal(isLetterRevealed(game, 'B'), false);
  assert.equal(chooseBonusLetter(game, 'b'), game);
  assert.equal(isLetterRevealed(game, 'B'), true);
});

test('bonus rejects given letters, duplicates, malformed choices and excess vowels', () => {
  const game = reachBonus();
  for (const char of 'RSTLNE') assertRejected(game, () => chooseBonusLetter(game, char));
  for (const char of ['', 'AB', '!', null]) assertRejected(game, () => chooseBonusLetter(game, char));
  chooseBonusLetter(game, 'A');
  assertRejected(game, () => chooseBonusLetter(game, 'a'));
  assertRejected(game, () => chooseBonusLetter(game, 'I'));
  chooseBonusLetter(game, 'B');
  assertRejected(game, () => chooseBonusLetter(game, 'B'));
  chooseBonusLetter(game, 'C');
  assert.equal(game.phase, 'bonus-pick');
  chooseBonusLetter(game, 'D');
  assert.equal(game.phase, 'bonus-solve');
});

test('bonus rejects a fourth consonant and starts solve only after the vowel', () => {
  const game = reachBonus();
  for (const letter of 'BCD') chooseBonusLetter(game, letter);
  assert.equal(game.phase, 'bonus-pick');
  assertRejected(game, () => chooseBonusLetter(game, 'F'));
  chooseBonusLetter(game, 'A');
  assert.equal(game.phase, 'bonus-solve');
  assert.deepEqual(game.bonusLetters, ['B', 'C', 'D', 'A']);
  assert.match(game.message, /20 seconds/);
  assertRejected(game, () => chooseBonusLetter(game, 'I'));
});

test('bonus win awards only champion and cannot be awarded twice', () => {
  const game = readyBonus();
  const totals = game.players.map((player) => player.total);
  assert.equal(solveBonus(game, game.puzzle.phrase.toLowerCase()), game);
  assert.equal(game.bonusWon, true);
  assert.equal(game.phase, 'game-over');
  game.players.forEach((player, index) => {
    assert.equal(player.total, totals[index] + (index === game.champion ? game.bonusPrize : 0));
  });
  assert.equal(isLetterRevealed(game, 'Z'), true);
  assertRejected(game, () => solveBonus(game, game.puzzle.phrase));
  assertRejected(game, () => expireBonus(game));
});

test('wrong bonus answer ends game without affecting banked totals', () => {
  const game = readyBonus();
  const totals = game.players.map((player) => player.total);
  assert.equal(solveBonus(game, 'WRONG'), game);
  assert.equal(game.phase, 'game-over');
  assert.equal(game.bonusWon, false);
  assert.deepEqual(game.players.map((p) => p.total), totals);
  assert.equal(isLetterRevealed(game, 'Z'), true);
});

test('bonus expiry ends game with no prize and fully exposes puzzle', () => {
  const game = readyBonus();
  const totals = game.players.map((player) => player.total);
  assert.equal(expireBonus(game), game);
  assert.equal(game.phase, 'game-over');
  assert.equal(game.bonusWon, false);
  assert.deepEqual(game.players.map((p) => p.total), totals);
  assert.equal(isLetterRevealed(game, 'Z'), true);
  assertRejected(game, () => expireBonus(game));
  assertRejected(game, () => solveBonus(game, game.puzzle.phrase));
});

test('empty or malformed bonus answers leave the timer phase active', () => {
  const game = readyBonus();
  for (const answer of ['', '   ', '!?', null]) {
    assertRejected(game, () => solveBonus(game, answer));
  }
});

test('phase guards protect all actions outside their allowed phases', () => {
  const phases = ['playing', 'round-end', 'bonus-pick', 'bonus-solve', 'game-over'];
  const actions = [
    [['playing'], (game) => spin(game)],
    [['playing'], (game) => guessLetter(game, 'B')],
    [['playing'], (game) => finishRound(game)],
    [['round-end'], (game) => nextRound(game, fixed)],
    [['bonus-pick'], (game) => chooseBonusLetter(game, 'B')],
    [['bonus-solve'], (game) => solveBonus(game, game.puzzle.phrase)],
    [['bonus-solve'], (game) => expireBonus(game)],
  ];
  for (const phase of phases) {
    for (const [allowed, action] of actions) {
      if (allowed.includes(phase)) continue;
      const game = gameWith();
      game.phase = phase;
      assertRejected(game, () => action(game));
    }
  }
});

test('main actions reject unknown action state', () => {
  const game = gameWith();
  game.action = 'invalid';
  for (const action of [() => spin(game), () => guessLetter(game, 'B'), () => finishRound(game)]) {
    assertRejected(game, action);
  }
});

test('invalid RNG output rejects without mutation', () => {
  for (const value of [-0.1, 1, NaN, Infinity, '0']) {
    assert.throws(() => createGame(['A', 'B'], () => value), Error);
    const game = gameWith();
    assertRejected(game, () => spinWheel(game, () => value));
    finishRound(game);
    assertRejected(game, () => nextRound(game, () => value));
  }
});

test('puzzle selection failure leaves finished round intact', () => {
  const game = gameWith();
  finishRound(game);
  assertRejected(game, () => nextRound(game, sequence(0, 1)));
  game.usedPuzzleIds = PUZZLES.map((p) => p.id);
  assertRejected(game, () => nextRound(game, fixed));
});

test('full three-player game runs through guesses, hazards, rounds and bonus', () => {
  const game = createGame(['Ada', 'Bo', 'Cy'], fixed);
  for (let round = 1; round <= 3; round++) {
    const starter = game.activePlayer;
    spin(game, 'lose-turn');
    assert.equal(game.activePlayer, (starter + 1) % 3);
    const consonant = [...game.puzzle.phrase].find((char) => /[A-Z]/.test(char) && !VOWELS.includes(char));
    spin(game);
    guessLetter(game, consonant);
    const vowel = [...game.puzzle.phrase].find((char) => VOWELS.includes(char));
    guessLetter(game, vowel);
    finishRound(game);
    nextRound(game, fixed);
  }
  assert.equal(game.phase, 'bonus-spin');
  spinBonusWheel(game, fixed);
  assert.equal(game.phase, 'bonus-pick');
  for (const letter of 'BCDA') chooseBonusLetter(game, letter);
  solveBonus(game, game.puzzle.phrase);
  assert.equal(game.phase, 'game-over');
  assert.equal(game.bonusWon, true);
  assert.equal(new Set(game.usedPuzzleIds).size, 4);
});
