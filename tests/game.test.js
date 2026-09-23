import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WHEEL_SEGMENTS, ROUND_WHEELS, BONUS_WHEEL, BONUS_PRIZES, TRIP_PRIZES, MYSTERY_PRIZES, TURN_SECONDS, wheelForRound, wheelForGame,
  VOWELS, BONUS_GIVEN_LETTERS, BONUS_MAX_GIVEN_RATIO, createGame, spinWheel, guessLetter, solvePuzzle, expireTurn,
  nextRound, spinBonusWheel, chooseBonusLetter, solveBonus, expireBonus, expireBonusPick, revealBonusPrize,
  isLetterRevealed, isBonusPuzzleEligible, normalizeAnswer, usablePuzzleHistory, PUZZLES_PER_GAME, BONUS_PICK_SECONDS,
  BONUS_SECONDS, FINAL_ROUND, bonusLettersRemaining, chooseBonusCategory, startBonusSolve,
  BONUS_CATEGORY_CHOICES, BONUS_COUNTDOWN_SECONDS, bonusCategoryChoices,
} from '../src/game.js';
import { PUZZLES } from '../src/puzzles.js';

const fixed = () => 0;
const gameWith = (phrase = 'BANANA BREAD', names = ['Ada', 'Bo']) => {
  const game = createGame(names, fixed);
  game.puzzle = { ...game.puzzle, phrase };
  return game;
};
const spin = (game, type = 'cash') => {
  const wheel = wheelForGame(game);
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
  for (let round = 1; round <= FINAL_ROUND; round++) {
    finishRound(game);
    nextRound(game, fixed);
  }
  spinBonusWheel(game, fixed);
  chooseBonusCategory(game, game.bonusCategoryOptions[0].category);
  return game;
};
const readyBonus = () => {
  const game = reachBonus();
  for (const letter of 'BCDA') chooseBonusLetter(game, letter);
  startBonusSolve(game);
  return game;
};
// Draws the tie-break value first, then zeroes for the bonus category options.
const firstDraw = (value) => {
  let used = false;
  return () => {
    if (used) return 0;
    used = true;
    return value;
  };
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

test('bonus puzzle candidates stay at or below the 30 percent given-letter limit', () => {
  assert.equal(BONUS_MAX_GIVEN_RATIO, 0.3);
  assert.equal(BONUS_GIVEN_LETTERS, 'RSTLNE');
  assert.equal(isBonusPuzzleEligible({ phrase: 'RST ABCDUVW' }), true);
  assert.equal(isBonusPuzzleEligible({ phrase: 'RSTL ABCDUV' }), false);
  assert.equal(isBonusPuzzleEligible({ phrase: 'RRR ABCDEFGHI' }), false);
  assert.ok(PUZZLES.some(isBonusPuzzleEligible));
  for (const puzzle of PUZZLES.filter(isBonusPuzzleEligible)) {
    const letters = puzzle.phrase.match(/[A-Z]/gi);
    const given = letters.filter((letter) => BONUS_GIVEN_LETTERS.includes(letter.toUpperCase())).length;
    assert.ok(given / letters.length <= BONUS_MAX_GIVEN_RATIO, puzzle.phrase);
  }
});

test('round wheels grow each round, keep hazards, and add trip and mystery surprises', () => {
  assert.equal(VOWELS, 'AEIOU');
  assert.equal(WHEEL_SEGMENTS, ROUND_WHEELS[0]);
  assert.equal(WHEEL_SEGMENTS.length, 12);
  assert.equal(ROUND_WHEELS.length, 4);
  assert.equal(FINAL_ROUND, 4);
  for (let round = 1; round <= FINAL_ROUND; round++) {
    const wheel = wheelForRound(round);
    assert.equal(wheel, ROUND_WHEELS[round - 1]);
    if (round > 1) assert.ok(wheel.length > wheelForRound(round - 1).length);
    assert.equal(wheel.filter((s) => s.type === 'lose-turn').length, 1);
    assert.ok([1, 2].includes(wheel.filter((s) => s.type === 'bankrupt').length));
    assert.equal(wheel.filter((s) => s.type === 'trip').length, round === 1 ? 0 : 1);
    assert.equal(wheel.filter((s) => s.type === 'mystery').length, round === 1 ? 0 : 1);
    const cash = wheel.filter((s) => s.type === 'cash').map((s) => s.value);
    assert.ok(Math.max(...cash) > (round === 1 ? 0 : Math.max(...wheelForRound(round - 1).filter((s) => s.type === 'cash').map((s) => s.value))));
    for (const segment of wheel) {
      assert.equal(typeof segment.label, 'string');
      assert.ok(['cash', 'bankrupt', 'lose-turn', 'trip', 'mystery'].includes(segment.type));
      assert.ok(Number.isFinite(segment.value));
      assert.ok(['cash', 'trip', 'mystery'].includes(segment.type) ? segment.value > 0 && segment.value <= 5000 : segment.value === 0);
    }
  }
  assert.equal(wheelForRound(0), ROUND_WHEELS[0]);
  assert.equal(wheelForRound(9), ROUND_WHEELS.at(-1));
  assert.equal(wheelForRound('2'), ROUND_WHEELS[1]);
});

test('trip, mystery, and bonus prize catalogs are usable, varied, and positive', () => {
  assert.ok(TRIP_PRIZES.length >= 16);
  assert.ok(MYSTERY_PRIZES.length >= 16);
  assert.ok(BONUS_PRIZES.length >= 12);
  for (const catalog of [TRIP_PRIZES, MYSTERY_PRIZES, BONUS_PRIZES]) {
    assert.equal(new Set(catalog.map((prize) => prize.id)).size, catalog.length);
    assert.equal(new Set(catalog.map((prize) => prize.label)).size, catalog.length);
    for (const prize of catalog) {
      assert.ok(prize.id && prize.label && prize.note);
      assert.ok(prize.value > 0);
    }
    // Varied values keep every reveal a surprise.
    assert.ok(new Set(catalog.map((prize) => prize.value)).size >= Math.ceil(catalog.length / 2));
  }
  // Mystery wedges stay in everyday-prize territory.
  for (const prize of MYSTERY_PRIZES) assert.ok(prize.value <= 5000);
  assert.ok(Math.min(...TRIP_PRIZES.map((prize) => prize.value)) > Math.max(...MYSTERY_PRIZES.map((prize) => prize.value)));
  for (const prize of BONUS_PRIZES) {
    assert.ok(['cash', 'car', 'trip', 'home', 'tech', 'experience'].includes(prize.type));
    assert.ok(prize.value >= 10000);
  }
  assert.deepEqual([...new Set(BONUS_PRIZES.map((prize) => prize.type))].sort(), ['car', 'cash', 'experience', 'home', 'tech', 'trip']);
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

for (const wedge of ['trip', 'mystery']) {
  test(`a ${wedge} wedge is claimed with a matching consonant and banked by the solver`, () => {
  const game = gameWith('BANANA BREAD');
  game.round = 2;
  spin(game, wedge);
  assert.equal(game.action, 'consonant');
  assert.ok(game.pendingPrize);
  assert.deepEqual(game.lastSpin.prize, game.pendingPrize);
  const prize = { ...game.pendingPrize };
  assert.equal(prize.kind, wedge);
  const catalog = wedge === 'trip' ? TRIP_PRIZES : MYSTERY_PRIZES;
  assert.ok(catalog.some((entry) => entry.id === prize.id && entry.value === prize.value));
  guessLetter(game, 'B');
  assert.equal(game.pendingPrize, null);
  assert.deepEqual(game.players[0].prizes, [prize]);
  const cash = game.players[0].round;
  finishRound(game);
  assert.equal(game.players[0].total, cash + prize.value);
  assert.deepEqual(game.roundPrizes, [prize]);
  });
}

for (const round of [2, 3]) {
  for (const [index, segment] of wheelForRound(round).entries()) {
    if (segment.type !== 'trip' && segment.type !== 'mystery') continue;
    test(`round ${round} ${segment.type} ${index} becomes cash only on a matching consonant`, () => {
      const game = gameWith();
      game.round = round;
      const base = structuredClone(wheelForRound(round));
      const draw = (index + 0.5) / base.length;
      spinWheel(game, sequence(draw, 0));
      assert.deepEqual(game.claimedPrizeIndices, []);
      assert.deepEqual(wheelForGame(game), base);
      assertRejected(game, () => guessLetter(game, '?'));
      guessLetter(game, 'Z');
      assert.deepEqual(game.claimedPrizeIndices, []);
      assert.deepEqual(wheelForGame(game), base);

      spinWheel(game, sequence(draw, 0));
      guessLetter(game, 'B');
      assert.deepEqual(game.claimedPrizeIndices, [index]);
      const effective = wheelForGame(game);
      assert.deepEqual(effective[index], {
        label: String(segment.value), type: 'cash', value: segment.value,
      });
      assert.equal(game.players[1].round, segment.value * 2 * (round === FINAL_ROUND ? 2 : 1));
      assert.deepEqual(wheelForRound(round), base);
      effective.forEach((wedge, wedgeIndex) => {
        if (wedgeIndex !== index) assert.deepEqual(wedge, base[wedgeIndex]);
      });
      const heldPrize = structuredClone(game.players[1].prizes);
      // A removed trip is a cash spin and consumes no prize draw.
      spinWheel(game, sequence(draw));
      assert.equal(game.lastSpin.type, 'cash');
      assert.equal(game.lastSpin.value, segment.value);
      assert.equal(game.pendingValue, segment.value * (round === FINAL_ROUND ? 2 : 1));
      assert.equal(game.pendingPrize, null);
      guessLetter(game, 'D');
      assert.deepEqual(game.players[1].prizes, heldPrize);
      assert.deepEqual(game.claimedPrizeIndices, [index]);
      spin(game, 'bankrupt');
      assert.deepEqual(game.players[1].prizes, []);
      assert.equal(game.players[1].round, 0);
      assert.deepEqual(game.claimedPrizeIndices, [index]);
      assert.equal(wheelForGame(game)[index].type, 'cash');
      spinWheel(game, sequence(draw));
      assert.equal(game.pendingPrize, null);
      assert.equal(game.lastSpin.type, 'cash');

      for (const fresh of [gameWith(), gameWith()]) {
        fresh.round = round;
        assert.deepEqual(fresh.claimedPrizeIndices, []);
        assert.deepEqual(wheelForGame(fresh), base);
        spinWheel(fresh, sequence(draw, 0));
        assert.ok(fresh.pendingPrize);
      }
      finishRound(game);
      nextRound(game, fixed);
      assert.deepEqual(game.claimedPrizeIndices, []);
      assert.deepEqual(wheelForGame(game), wheelForRound(game.round));
    });
  }
}

test('the final-round trip and mystery wedges are claimed independently by different players', () => {
  const game = gameWith();
  game.round = FINAL_ROUND;
  const isPrize = (segment) => segment.type === 'trip' || segment.type === 'mystery';
  const indices = wheelForRound(FINAL_ROUND).flatMap((segment, index) => isPrize(segment) ? [index] : []);
  assert.equal(indices.length, 2);
  spin(game, 'trip');
  guessLetter(game, 'B');
  assert.equal(game.players[0].prizes[0].kind, 'trip');
  assert.deepEqual(game.claimedPrizeIndices, [wheelForRound(FINAL_ROUND).findIndex((segment) => segment.type === 'trip')]);
  expireTurn(game);
  spin(game, 'mystery');
  guessLetter(game, 'D');
  assert.equal(game.players[1].prizes[0].kind, 'mystery');
  assert.deepEqual(game.claimedPrizeIndices.slice().sort((a, b) => a - b), indices);
  assert.equal(wheelForGame(game).filter(isPrize).length, 0);
  assert.equal(game.players[0].prizes.length, 1);
  assert.equal(game.players[1].prizes.length, 1);
  spin(game, 'bankrupt');
  assert.equal(wheelForGame(game).filter(isPrize).length, 0);
  assert.equal(game.players[0].prizes.length, 1);
});

for (const [name, action] of [
  ['timeout', expireTurn],
  ['wrong solve', (game) => solvePuzzle(game, 'WRONG')],
  ['correct solve', finishRound],
]) {
  test(`a pending trip is not removed on ${name}`, () => {
    const game = gameWith();
    game.round = 2;
    spin(game, 'trip');
    action(game);
    assert.equal(game.pendingPrize, null);
    assert.deepEqual(game.claimedPrizeIndices, []);
    assert.deepEqual(wheelForGame(game), wheelForRound(2));
    assert.ok(game.players.every((player) => player.prizes.length === 0));
  });
}

test('a missed consonant loses the pending trip and the turn', () => {
  const game = gameWith('BANANA BREAD');
  game.round = 2;
  spin(game, 'trip');
  guessLetter(game, 'Z');
  assert.equal(game.pendingPrize, null);
  assert.deepEqual(game.players[0].prizes, []);
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
  assert.equal(game.players[0].prizes.length, 1);
  guessLetter(game, 'A');
  assert.equal(game.players[0].prizes.length, 1);
});

test('bankrupt clears held trips along with round winnings', () => {
  const game = gameWith('BANANA BREAD');
  game.round = 2;
  spin(game, 'trip');
  guessLetter(game, 'B');
  assert.equal(game.players[0].prizes.length, 1);
  game.activePlayer = 0;
  game.action = 'spin';
  spin(game, 'bankrupt');
  assert.deepEqual(game.players[0].prizes, []);
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
  assert.ok(game.players.every((player) => player.prizes.length === 0));
  assert.deepEqual(game.roundPrizes, []);
});

test('the bonus round spins a sealed mystery prize before letters are picked', () => {
  const game = createGame(['Ada', 'Bo'], fixed);
  for (let round = 1; round <= FINAL_ROUND; round++) {
    finishRound(game);
    nextRound(game, fixed);
  }
  assert.equal(game.phase, 'bonus-spin');
  assert.equal(isBonusPuzzleEligible(game.puzzle), true);
  assertRejected(game, () => chooseBonusLetter(game, 'B'));
  assert.equal(spinBonusWheel(game, () => 0.999), game);
  assert.equal(game.phase, 'bonus-category');
  assert.equal(game.bonusCategoryOptions.length, BONUS_CATEGORY_CHOICES);
  assert.equal(new Set(bonusCategoryChoices(game)).size, BONUS_CATEGORY_CHOICES);
  assert.ok(game.bonusCategoryOptions.every(isBonusPuzzleEligible));
  assertRejected(game, () => chooseBonusLetter(game, 'B'));
  assertRejected(game, () => chooseBonusCategory(game, 'Not A Category'));
  const chosen = game.bonusCategoryOptions.at(-1);
  assert.equal(chooseBonusCategory(game, chosen.category.toLowerCase()), game);
  assert.equal(game.puzzle.id, chosen.id);
  assert.equal(game.bonusCategory, chosen.category);
  assert.equal(game.usedPuzzleIds.at(-1), chosen.id);
  assertRejected(game, () => chooseBonusCategory(game, chosen.category));
  assert.equal(game.phase, 'bonus-pick');
  assert.equal(game.bonusSpin.index, BONUS_WHEEL.length - 1);
  assert.equal(game.bonusPrize, BONUS_PRIZES.at(-1).value);
  assert.equal(game.bonusPrizeLabel, BONUS_PRIZES.at(-1).label);
  assert.equal(game.bonusPrizeNote, BONUS_PRIZES.at(-1).note);
  assert.equal(game.bonusPrizeType, BONUS_PRIZES.at(-1).type);
  assert.equal(game.bonusPrizeRevealed, false);
  assertRejected(game, () => spinBonusWheel(game, fixed));
});

test('the mystery prize reveals on a win and only after opening a lost envelope', () => {
  const won = readyBonus();
  const banked = won.players[won.champion].total;
  solveBonus(won, won.puzzle.phrase);
  assert.equal(won.bonusPrizeRevealed, true);
  assert.equal(won.players[won.champion].total, banked + won.bonusPrize);
  assert.match(won.message, new RegExp(won.bonusPrizeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const lost = readyBonus();
  solveBonus(lost, 'NOPE');
  assert.equal(lost.phase, 'bonus-solve');
  assert.equal(lost.bonusWon, null);
  assert.equal(lost.bonusPrizeRevealed, false);
  solveBonus(lost, lost.puzzle.phrase);
  assert.equal(lost.phase, 'game-over');
  assert.equal(lost.bonusPrizeRevealed, true);
  const expired = readyBonus();
  expireBonus(expired);
  assert.equal(expired.bonusPrizeRevealed, false);
  assert.equal(revealBonusPrize(expired), expired);
  assert.equal(expired.bonusPrizeRevealed, true);
  assertRejected(expired, () => revealBonusPrize(expired));
});

for (const [index, prize] of BONUS_PRIZES.entries()) {
  for (const outcome of ['win', 'timeout']) {
    test(`${prize.type} prize ${prize.id} stays available at game-over after ${outcome}`, () => {
      const game = createGame(['Ada', 'Bo'], fixed);
      for (let round = 1; round <= FINAL_ROUND; round++) {
        finishRound(game);
        nextRound(game, fixed);
      }
      assert.equal(game.bonusPrizeLabel, null);
      assert.equal(game.bonusPrizeNote, null);
      assert.equal(game.bonusPrizeType, null);
      spinBonusWheel(game, sequence(0, (index + 0.5) / BONUS_PRIZES.length));
      chooseBonusCategory(game, game.bonusCategoryOptions[0].category);
      assert.equal(game.bonusPrizeRevealed, false);
      for (const letter of 'BCDA') chooseBonusLetter(game, letter);
      startBonusSolve(game);
      assert.equal(game.bonusPrizeRevealed, false);
      const totals = game.players.map((player) => player.total);
      if (outcome === 'timeout') expireBonus(game);
      else solveBonus(game, game.puzzle.phrase);
      assert.equal(game.phase, 'game-over');
      assert.equal(game.bonusWon, outcome === 'win');
      assert.equal(game.bonusPrizeRevealed, outcome === 'win');
      assert.equal(game.bonusPrize, prize.value);
      assert.equal(game.bonusPrizeLabel, prize.label);
      assert.equal(game.bonusPrizeNote, prize.note);
      assert.equal(game.bonusPrizeType, prize.type);
      if (outcome === 'win') {
        assert.ok(game.message.includes(prize.label));
        assert.ok(game.message.includes(prize.value.toLocaleString('en-US')));
      } else {
        assert.equal(game.message.includes(prize.label), false);
        assert.equal(revealBonusPrize(game), game);
        assert.equal(game.bonusPrizeRevealed, true);
      }
      game.players.forEach((player, playerIndex) => {
        assert.equal(player.total, totals[playerIndex] + (outcome === 'win' && playerIndex === game.champion ? prize.value : 0));
      });
      const fresh = createGame(['Ada', 'Bo'], fixed);
      assert.equal(fresh.bonusPrizeRevealed, false);
      assert.equal(fresh.bonusPrizeLabel, null);
      assert.equal(fresh.bonusPrizeNote, null);
      assert.equal(fresh.bonusPrizeType, null);
    });
  }
}

test('creation initializes the complete UI contract and trims names', () => {
  const game = createGame([' Ada ', 'Bo', 'Cy'], fixed);
  assert.deepEqual(game.players, ['Ada', 'Bo', 'Cy'].map((name) => ({ name, total: 0, round: 0, prizes: [] })));
  assert.equal(game.activePlayer, 0);
  assert.equal(game.round, 1);
  assert.equal(game.phase, 'playing');
  assert.equal(game.action, 'spin');
  assert.equal(game.pendingValue, 0);
  assert.equal(game.roundWinner, null);
  assert.equal(game.champion, null);
  assert.equal(game.lastSpin, null);
  assert.equal(game.bonusWon, null);
  assert.equal(game.pendingPrize, null);
  assert.equal(game.bonusSpin, null);
  assert.equal(game.bonusPrizeNote, null);
  assert.equal(game.bonusPrizeType, null);
  assert.deepEqual(game.claimedPrizeIndices, []);
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
  assert.equal(game.usedPuzzleIds.length, PUZZLES_PER_GAME);
  assert.equal(new Set(game.usedPuzzleIds).size, PUZZLES_PER_GAME);
  assert.equal(game.puzzle.id, game.usedPuzzleIds.at(-1));
});

test('previously played puzzles are skipped in new games', () => {
  const seen = PUZZLES.slice(0, 30).map((p) => p.id);
  const game = createGame(['Ada', 'Bo'], fixed, seen);
  assert.ok(!seen.includes(game.puzzle.id));
  assert.deepEqual(game.usedPuzzleIds, [...seen, game.puzzle.id]);
  finishRound(game);
  nextRound(game, fixed);
  assert.ok(!seen.includes(game.puzzle.id));
});

test('puzzle history is sanitized and recycles once the bank runs low', () => {
  const ids = PUZZLES.map((p) => p.id);
  assert.deepEqual(usablePuzzleHistory([ids[0], ids[0], 'nope', 7, null]), [ids[0]]);
  assert.deepEqual(usablePuzzleHistory(null), []);
  const nearlyDone = ids.slice(0, PUZZLES.length - PUZZLES_PER_GAME);
  assert.equal(usablePuzzleHistory(nearlyDone).length, nearlyDone.length);
  assert.deepEqual(usablePuzzleHistory(ids.slice(0, PUZZLES.length - PUZZLES_PER_GAME + 1)), []);
  const game = createGame(['Ada', 'Bo'], fixed, ids);
  assert.ok(ids.includes(game.puzzle.id));
  assert.deepEqual(game.usedPuzzleIds, [game.puzzle.id]);
});

test('new games reset old puzzle history before the bonus-eligible pool is exhausted', () => {
  const eligibleIds = PUZZLES.filter(isBonusPuzzleEligible).map((puzzle) => puzzle.id);
  const seen = eligibleIds.slice(0, eligibleIds.length - (PUZZLES_PER_GAME - 1));
  assert.equal(usablePuzzleHistory(seen).length, seen.length);
  assert.ok(PUZZLES.length - seen.length >= PUZZLES_PER_GAME);
  const game = createGame(['Ada', 'Bo'], fixed, seen);
  assert.equal(game.usedPuzzleIds.length, 1);
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
  for (let round = 1; round <= FINAL_ROUND; round++) {
    const wheel = wheelForRound(round);
    for (let index = 0; index < wheel.length; index++) {
      const game = gameWith();
      game.round = round;
      assert.equal(spinWheel(game, () => (index + 0.5) / wheel.length), game);
      const expected = { index, ...wheel[index] };
      if (['trip', 'mystery'].includes(wheel[index].type)) expected.prize = { ...game.lastSpin.prize };
      assert.deepEqual(game.lastSpin, expected);
      assert.equal(game.pendingValue, wheel[index].value * (round === FINAL_ROUND ? 2 : 1));
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

test('the final round doubles per-occurrence cash rewards', () => {
  const game = gameWith();
  game.round = FINAL_ROUND;
  spin(game);
  const wheelValue = wheelForRound(FINAL_ROUND).find((segment) => segment.type === 'cash').value;
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
  game.round = FINAL_ROUND;
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
  test(`${count}-player round starters use lowest banked totals and clear round state`, () => {
    const game = gameWith('BANANA', ['Ada', 'Bo', 'Cy'].slice(0, count));
    for (let round = 1; round < FINAL_ROUND; round++) {
      game.activePlayer = count - 1;
      game.players.forEach((player) => { player.round = 500; });
      finishRound(game);
      const totals = game.players.map((player) => player.total);
      assert.equal(nextRound(game, fixed), game);
      assert.equal(game.round, round + 1);
      assert.equal(game.activePlayer, count === 3 && round === 1 ? 1 : 0);
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

for (const count of [2, 3]) {
  for (const next of [2, 3, 4]) {
    for (let lowest = 0; lowest < count; lowest++) {
      test(`${count} players: lowest scorer ${lowest} starts round ${next}`, () => {
        const game = gameWith('BANANA', ['Ada', 'Bo', 'Cy'].slice(0, count));
        game.round = next - 1;
        finishRound(game);
        game.players.forEach((player, index) => {
          player.total = index === lowest ? 100 : 5000;
          player.round = index === lowest ? 10000 : 0;
        });
        nextRound(game, sequence(0, 0));
        assert.equal(game.activePlayer, lowest);
        assert.ok(game.message.includes(`${game.players[lowest].name}, you start.`));
      });
    }
  }
}

for (const [next, totals, starter] of [
  [2, [0, 0], 1],
  [3, [0, 0], 0],
  [2, [0, 0, 0], 1],
  [3, [0, 0, 0], 2],
  [2, [0, 0, 1000], 1],
  [2, [1000, 0, 0], 1],
  [2, [0, 1000, 0], 2],
  [3, [0, 0, 1000], 0],
  [3, [1000, 0, 0], 2],
  [3, [0, 1000, 0], 2],
]) {
  test(`round ${next} lowest-score ties ${totals} use cyclic starter ${starter}`, () => {
    const game = gameWith('BANANA', ['Ada', 'Bo', 'Cy'].slice(0, totals.length));
    game.round = next - 1;
    finishRound(game);
    game.players.forEach((player, index) => { player.total = totals[index]; });
    nextRound(game, sequence(0, 0));
    assert.equal(game.activePlayer, starter);
  });
}

test('champion is highest banked total rather than last round winner', () => {
  const game = gameWith();
  game.round = FINAL_ROUND;
  game.players[0].total = 5000;
  game.activePlayer = 1;
  finishRound(game);
  nextRound(game, fixed);
  assert.equal(game.champion, 0);
  assert.equal(game.activePlayer, 0);
  assert.equal(game.phase, 'bonus-spin');
  assert.equal(game.round, FINAL_ROUND);
  assert.doesNotMatch(game.message, /tie-break/i);
});

test('ties draw only among leaders and explicitly announce the tie-break', () => {
  for (const [draw, winner] of [[0, 0], [0.999, 2]]) {
    const game = gameWith('A', ['Ada', 'Bo', 'Cy']);
    game.round = FINAL_ROUND;
    finishRound(game);
    game.players[0].total = 3000;
    game.players[1].total = 2000;
    game.players[2].total = 3000;
    nextRound(game, firstDraw(draw));
    assert.equal(game.champion, winner);
    assert.equal(game.activePlayer, winner);
    assert.match(game.message, /tie-break.*random/i);
  }
});

test('three-way tie is supported', () => {
  const game = gameWith('A', ['Ada', 'Bo', 'Cy']);
  game.round = FINAL_ROUND;
  finishRound(game);
  game.players.forEach((player) => { player.total = 3000; });
  nextRound(game, fixed);
  assert.equal(game.phase, 'bonus-spin');
  assert.equal(game.champion, 0);
  assert.equal(game.tieBreak, true);
});

test('bonus shows the given letters while chosen letters stay hidden until picking ends', () => {
  const game = reachBonus();
  game.usedLetters.push('Z');
  for (const char of 'RSTLNErstlne') assert.equal(isLetterRevealed(game, char), true);
  for (const char of ' -!,') assert.equal(isLetterRevealed(game, char), true);
  assert.equal(isLetterRevealed(game, 'Z'), false);
  assert.equal(isLetterRevealed(game, 'B'), false);
  assert.equal(chooseBonusLetter(game, 'b'), game);
  assert.equal(isLetterRevealed(game, 'B'), false);
  chooseBonusLetter(game, 'C');
  chooseBonusLetter(game, 'D');
  chooseBonusLetter(game, 'A');
  assert.equal(game.phase, 'bonus-countdown');
  for (const char of 'RSTLNEBCDA') assert.equal(isLetterRevealed(game, char), true);
  assert.equal(isLetterRevealed(game, 'Z'), false);
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
  assert.equal(game.phase, 'bonus-countdown');
});

test('bonus rejects a fourth consonant and starts solve only after the vowel', () => {
  const game = reachBonus();
  for (const letter of 'BCD') chooseBonusLetter(game, letter);
  assert.equal(game.phase, 'bonus-pick');
  assertRejected(game, () => chooseBonusLetter(game, 'F'));
  chooseBonusLetter(game, 'A');
  assert.equal(game.phase, 'bonus-countdown');
  assert.deepEqual(game.bonusLetters, ['B', 'C', 'D', 'A']);
  assert.match(game.message, new RegExp(`${BONUS_COUNTDOWN_SECONDS} seconds`));
  assertRejected(game, () => chooseBonusLetter(game, 'I'));
  assert.equal(startBonusSolve(game), game);
  assert.equal(game.phase, 'bonus-solve');
  assert.match(game.message, new RegExp(`${BONUS_SECONDS} seconds`));
  assertRejected(game, () => startBonusSolve(game));
});

test('bonus board reveals the given letters first and chosen letters when picks end', () => {
  const game = reachBonus();
  for (const letter of BONUS_GIVEN_LETTERS) assert.equal(isLetterRevealed(game, letter), true);
  chooseBonusLetter(game, 'B');
  assert.equal(isLetterRevealed(game, 'B'), false);
  chooseBonusLetter(game, 'C');
  chooseBonusLetter(game, 'D');
  chooseBonusLetter(game, 'A');
  assert.equal(game.phase, 'bonus-countdown');
  for (const letter of [...BONUS_GIVEN_LETTERS, ...game.bonusLetters]) {
    assert.equal(isLetterRevealed(game, letter), true);
  }
  assert.equal(isLetterRevealed(game, 'Z'), false);
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

test('wrong bonus answers can be retried without affecting banked totals', () => {
  const game = readyBonus();
  const totals = game.players.map((player) => player.total);
  assert.equal(solveBonus(game, 'WRONG'), game);
  assert.equal(game.phase, 'bonus-solve');
  assert.equal(game.bonusWon, null);
  assert.equal(game.bonusPrizeRevealed, false);
  assert.match(game.message, /try another answer/i);
  assert.deepEqual(game.players.map((p) => p.total), totals);
  solveBonus(game, game.puzzle.phrase);
  assert.equal(game.phase, 'game-over');
  assert.equal(game.bonusWon, true);
  assert.equal(isLetterRevealed(game, 'Z'), true);
});

test('bonus expiry ends game with no prize and fully exposes puzzle', () => {
  const game = readyBonus();
  const totals = game.players.map((player) => player.total);
  assert.equal(expireBonus(game), game);
  assert.equal(game.phase, 'game-over');
  assert.equal(game.bonusWon, false);
  assert.equal(game.bonusPrizeRevealed, false);
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
  const phases = ['playing', 'round-end', 'bonus-category', 'bonus-pick', 'bonus-countdown', 'bonus-solve', 'game-over'];
  const actions = [
    [['playing'], (game) => spin(game)],
    [['playing'], (game) => guessLetter(game, 'B')],
    [['playing'], (game) => finishRound(game)],
    [['round-end'], (game) => nextRound(game, fixed)],
    [['bonus-pick'], (game) => chooseBonusLetter(game, 'B')],
    [['bonus-solve'], (game) => solveBonus(game, game.puzzle.phrase)],
    [['bonus-solve'], (game) => expireBonus(game)],
    [['bonus-pick'], (game) => expireBonusPick(game)],
    [['bonus-countdown'], (game) => startBonusSolve(game)],
    [['bonus-category'], (game) => chooseBonusCategory(game, 'Anything')],
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
  for (let round = 1; round <= FINAL_ROUND; round++) {
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
  assert.equal(game.phase, 'bonus-category');
  chooseBonusCategory(game, game.bonusCategoryOptions[0].category);
  assert.equal(game.phase, 'bonus-pick');
  for (const letter of 'BCDA') chooseBonusLetter(game, letter);
  startBonusSolve(game);
  solveBonus(game, game.puzzle.phrase);
  assert.equal(game.phase, 'game-over');
  assert.equal(game.bonusWon, true);
  assert.equal(new Set(game.usedPuzzleIds).size, PUZZLES_PER_GAME);
});

test('the opening round carries a single bankrupt wedge', () => {
  assert.equal(wheelForRound(1).filter((segment) => segment.type === 'bankrupt').length, 1);
  for (let round = 2; round <= FINAL_ROUND; round++) {
    assert.ok(wheelForRound(round).filter((segment) => segment.type === 'bankrupt').length >= 1);
  }
});

test('bankrupt never lands twice in a row', () => {
  for (let round = 1; round <= FINAL_ROUND; round++) {
    const game = gameWith();
    game.round = round;
    spin(game, 'bankrupt');
    assert.equal(game.lastSpin.type, 'bankrupt');
    const wheel = wheelForGame(game);
    const eligible = wheel.filter((segment) => segment.type !== 'bankrupt');
    for (let step = 0; step < eligible.length; step++) {
      const next = structuredClone(game);
      spinWheel(next, () => (step + 0.5) / eligible.length);
      assert.notEqual(next.lastSpin.type, 'bankrupt');
      assert.deepEqual(wheelForGame(game)[next.lastSpin.index].type, next.lastSpin.type);
    }
    // Once a safe wedge lands, bankrupt is back in play.
    spin(game, 'cash');
    const after = structuredClone(game);
    const bankruptIndex = wheelForGame(after).findIndex((segment) => segment.type === 'bankrupt');
    after.action = 'spin';
    spinWheel(after, () => (bankruptIndex + 0.5) / wheelForGame(after).length);
    assert.equal(after.lastSpin.type, 'bankrupt');
  }
});

test('running out of pick time starts the bonus countdown with the letters chosen', () => {
  assert.equal(BONUS_PICK_SECONDS, 45);
  const game = reachBonus();
  assert.equal(game.bonusPickSeconds, BONUS_PICK_SECONDS);
  assert.equal(game.bonusCountdownSeconds, BONUS_COUNTDOWN_SECONDS);
  assert.equal(isLetterRevealed(game, 'R'), true);
  chooseBonusLetter(game, 'B');
  assert.equal(isLetterRevealed(game, 'B'), false);
  assert.equal(expireBonusPick(game), game);
  assert.equal(game.phase, 'bonus-countdown');
  assert.deepEqual(game.bonusLetters, ['B']);
  assert.match(game.message, /time is up/i);
  assert.equal(isLetterRevealed(game, 'B'), true);
  assert.equal(isLetterRevealed(game, 'C'), false);
  assertRejected(game, () => chooseBonusLetter(game, 'C'));
  assertRejected(game, () => expireBonusPick(game));
  assertRejected(game, () => solveBonus(game, game.puzzle.phrase));
  startBonusSolve(game);
  assert.equal(game.phase, 'bonus-solve');
  assert.equal(solveBonus(game, game.puzzle.phrase), game);
  assert.equal(game.bonusWon, true);
});

test('the bonus round reports the consonants and vowels still to pick', () => {
  assert.equal(BONUS_SECONDS, 45);
  const game = reachBonus();
  assert.deepEqual(bonusLettersRemaining(game), { consonants: 3, vowels: 1 });
  assert.match(game.message, /3 consonants and 1 vowel left to pick/i);
  chooseBonusLetter(game, 'B');
  assert.deepEqual(bonusLettersRemaining(game), { consonants: 2, vowels: 1 });
  assert.match(game.message, /2 consonants and 1 vowel left to pick/i);
  chooseBonusLetter(game, 'A');
  assert.deepEqual(bonusLettersRemaining(game), { consonants: 2, vowels: 0 });
  assert.match(game.message, /2 consonants and 0 vowels left to pick/i);
  chooseBonusLetter(game, 'C');
  assert.deepEqual(bonusLettersRemaining(game), { consonants: 1, vowels: 0 });
  chooseBonusLetter(game, 'D');
  assert.deepEqual(bonusLettersRemaining(game), { consonants: 0, vowels: 0 });
  assert.equal(game.phase, 'bonus-countdown');
  startBonusSolve(game);
  assert.match(game.message, /45 seconds/);
});

test('the bonus pick clock can expire before any letters are chosen', () => {
  const game = reachBonus();
  expireBonusPick(game);
  assert.equal(game.phase, 'bonus-countdown');
  assert.deepEqual(game.bonusLetters, []);
  startBonusSolve(game);
  assert.equal(game.phase, 'bonus-solve');
  expireBonus(game);
  assert.equal(game.bonusWon, false);
});
