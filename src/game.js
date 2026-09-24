import { PUZZLES } from './puzzles.js';

export const VOWELS = 'AEIOU';
export const BONUS_GIVEN_LETTERS = 'RSTLNE';
export const BONUS_MAX_GIVEN_RATIO = 0.3;
const VOWEL_COST = 250;

export const TURN_SECONDS = 30;
export const BONUS_SECONDS = 45;
export const BONUS_PICK_SECONDS = 45;

// A short countdown runs between the letter reveal and the solve clock.
export const BONUS_COUNTDOWN_SECONDS = 5;

// The champion chooses the bonus puzzle from this many different categories.
export const BONUS_CATEGORY_CHOICES = 3;

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
    { label: 'MYSTERY', type: 'mystery', value: 650 },
    { label: '3,000', type: 'cash', value: 3000 },
    { label: 'LOSE TURN', type: 'lose-turn', value: 0 },
    { label: '800', type: 'cash', value: 800 },
    { label: '1,000', type: 'cash', value: 1000 },
    { label: '700', type: 'cash', value: 700 },
    { label: '1,100', type: 'cash', value: 1100 },
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
    { label: 'MYSTERY', type: 'mystery', value: 850 },
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
    { label: 'MYSTERY', type: 'mystery', value: 950 },
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

// Later rounds pay more for the same wedge: round three is worth 1.5x and round four doubles.
export const ROUND_MULTIPLIERS = Object.freeze([1, 1, 1.5, 2]);

export function roundMultiplier(round) {
  const index = Math.min(Math.max(Math.trunc(Number(round) || 1), 1), ROUND_MULTIPLIERS.length) - 1;
  return ROUND_MULTIPLIERS[index];
}

// How a multiplied round is announced on screen, e.g. "1.5x" or "2x".
export const multiplierLabel = (round) => `${roundMultiplier(round)}x`;

// Bankrupt wedges stay on the board all round, but they can only be landed on this many times.
export const BANKRUPT_LIMITS = Object.freeze([1, 2, 3, 4]);

export function bankruptLimit(round) {
  const index = Math.min(Math.max(Math.trunc(Number(round) || 1), 1), BANKRUPT_LIMITS.length) - 1;
  return BANKRUPT_LIMITS[index];
}

// How many Bankrupt landings the round still allows.
export function bankruptsRemaining(game) {
  const used = Number.isFinite(game?.bankruptsHit) ? game.bankruptsHit : 0;
  return Math.max(0, bankruptLimit(game?.round) - used);
}

// Kept for the lobby preview and as the opening-round wheel.
export const WHEEL_SEGMENTS = ROUND_WHEELS[0];

export function wheelForRound(round) {
  const index = Math.min(Math.max(Math.trunc(Number(round) || 1), 1), ROUND_WHEELS.length) - 1;
  return ROUND_WHEELS[index];
}

// Trip and Mystery wedges both hide a surprise until someone claims them.
export const isPrizeWedge = (segment) => segment.type === 'trip' || segment.type === 'mystery';

export function wheelForGame(game) {
  return wheelForRound(game.round).map((segment, index) => (
    isPrizeWedge(segment) && game.claimedPrizeIndices.includes(index)
      ? { label: segment.value.toLocaleString('en-US'), type: 'cash', value: segment.value }
      : segment
  ));
}

// Landing on a Trip wedge reveals one of these getaways; solve the round to keep it.
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
    { id: 'rail', label: 'Mountain Rail Journey', note: 'Windows wide, watch the peaks roll by.', value: 7000 },
    { id: 'reykjavik', label: 'Volcano and Hot Springs Week', note: 'Steam, stone, and long soaks.', value: 10000 },
    { id: 'marrakech', label: 'Desert Market Adventure', note: 'Spice stalls, then stars over the dunes.', value: 8500 },
    { id: 'patagonia', label: 'Patagonia Trekking Trip', note: 'Big wind, bigger views.', value: 12000 },
    { id: 'riverboat', label: 'European Riverboat Cruise', note: 'A new little town every morning.', value: 13000 },
    { id: 'vineyard', label: 'Vineyard Harvest Getaway', note: 'Long tables and longer sunsets.', value: 7200 },
    { id: 'bayou', label: 'Jazz and Bayou Long Weekend', note: 'Brass bands and beignets.', value: 5400 },
    { id: 'reefdive', label: 'Great Barrier Dive School', note: 'Learn to dive where the fish show off.', value: 14000 },
    { id: 'lakehouse', label: 'Lakeside Cabin Summer Week', note: 'Dock, canoe, zero agenda.', value: 5200 },
    { id: 'tokyo', label: 'Tokyo Neon City Break', note: 'Ramen at midnight, trains on time.', value: 10500 },
    { id: 'galapagos', label: 'Galapagos Wildlife Voyage', note: 'Tortoises, penguins, and one very smug iguana.', value: 15000 },
    { id: 'roadstrip', label: 'Coastal Highway Convertible Tour', note: 'Top down the whole way.', value: 6800 },
  ].map(Object.freeze),
);

// Landing on a Mystery wedge reveals one of these everyday treats, all under $5,000.
export const MYSTERY_PRIZES = Object.freeze(
  [
    { id: 'espresso', label: 'Cafe-Grade Espresso Bar', note: 'Your kitchen just opened a coffee shop.', value: 1200 },
    { id: 'vacuum', label: 'Robot Vacuum and Mop Duo', note: 'They clean while you nap.', value: 900 },
    { id: 'hottub', label: 'Backyard Hot Tub', note: 'Six jets, zero worries.', value: 5000 },
    { id: 'theater', label: 'Living Room Theater Setup', note: 'Big screen, bigger sound.', value: 4500 },
    { id: 'ebike', label: 'A Pair of Electric Bikes', note: 'Hills are now optional.', value: 3000 },
    { id: 'grill', label: 'Deluxe Grill and Patio Set', note: 'Summer cookouts, handled.', value: 1800 },
    { id: 'mattress', label: 'Dream Mattress and Bedding', note: 'The best sleep of your life.', value: 2200 },
    { id: 'pizza', label: 'Wood-Fired Pizza Oven', note: 'Ninety-second pizzas, all year.', value: 1000 },
    { id: 'kitchen', label: 'Chef’s Kitchen Appliance Set', note: 'Mixer, blender, and every gadget.', value: 2600 },
    { id: 'laundry', label: 'Smart Washer and Dryer Pair', note: 'Laundry day, only faster.', value: 2400 },
    { id: 'garage', label: 'Complete Garage Tool Wall', note: 'Every tool, finally in its place.', value: 2800 },
    { id: 'mower', label: 'Riding Lawn Mower', note: 'Mowing suddenly sounds fun.', value: 3500 },
    { id: 'gaming', label: 'Ultimate Gaming Setup', note: 'Chair, console, and a very big monitor.', value: 2500 },
    { id: 'camera', label: 'Photography Starter Kit', note: 'Camera, lenses, and a tripod.', value: 2000 },
    { id: 'records', label: 'Turntable and Record Library', note: 'One hundred albums to spin.', value: 800 },
    { id: 'kayaks', label: 'Two Kayaks and a Roof Rack', note: 'Paddle out before breakfast.', value: 1600 },
    { id: 'furniture', label: 'New Living Room Furniture', note: 'Sofa, chairs, and a rug that ties it together.', value: 4200 },
    { id: 'firepit', label: 'Fire Pit and Cozy Patio Nook', note: 'Marshmallows included.', value: 1400 },
    { id: 'coffee', label: 'Coffee Delivered for a Year', note: 'A fresh bag every single month.', value: 600 },
    { id: 'craft', label: 'Craft Studio Makeover', note: 'Sewing machine, bench, and all the supplies.', value: 1500 },
    { id: 'sound', label: 'Whole-Home Speaker System', note: 'Music in every room, even the shower.', value: 3200 },
    { id: 'fridge', label: 'Smart Refrigerator', note: 'It makes the good ice.', value: 4000 },
    { id: 'gym', label: 'Home Gym in a Corner', note: 'Bike, weights, and a mirror that coaches.', value: 3800 },
    { id: 'telescope', label: 'Backyard Telescope Kit', note: 'Saturn from your own lawn.', value: 700 },
  ].map(Object.freeze),
);

// Each wedge type draws from its own catalog of surprises.
const WEDGE_PRIZES = Object.freeze({ trip: TRIP_PRIZES, mystery: MYSTERY_PRIZES });

// The bonus wheel hides these behind identical envelopes until the round ends.
export const BONUS_PRIZES = Object.freeze(
  [
    { id: 'starter', label: 'The Starter Cash Envelope', note: '$10,000 in cash to kick things off.', type: 'cash', value: 10000 },
    { id: 'classic', label: 'The Classic Cash Envelope', note: '$25,000 in cash for your next big idea.', type: 'cash', value: 25000 },
    { id: 'golden', label: 'The Golden Cash Envelope', note: '$40,000 in cash to brighten your future.', type: 'cash', value: 40000 },
    { id: 'jackpot', label: 'The Wisdom Cash Jackpot', note: '$100,000 in cash: the ultimate wisdom reward.', type: 'cash', value: 100000 },
    { id: 'roadster', label: 'A Shiny Little Roadster', note: 'A new convertible for open-road adventures.', type: 'car', value: 50000 },
    { id: 'hauler', label: 'A Rugged Adventure Truck', note: 'A new pickup built for every back road.', type: 'car', value: 65000 },
    { id: 'camper', label: 'A Retro Camper Van', note: 'A rolling home with a tiny kitchen and a big window.', type: 'car', value: 85000 },
    { id: 'world', label: 'A Trip Around the World', note: 'A globe-spanning getaway with flights and stays included.', type: 'trip', value: 75000 },
    { id: 'sabbatical', label: 'A Year of Monthly Getaways', note: 'Twelve trips, one every month.', type: 'trip', value: 45000 },
    { id: 'homestead', label: 'A Cozy Cabin Homestead', note: 'Your own little cabin home, not just a holiday stay.', type: 'home', value: 60000 },
    { id: 'renovation', label: 'A Whole-Home Makeover', note: 'New kitchen, new bath, new everything.', type: 'home', value: 90000 },
    { id: 'workshop', label: 'A Dream Backyard Workshop', note: 'A finished studio out back, tools and all.', type: 'home', value: 30000 },
    { id: 'studio', label: 'A Creator Studio Kit', note: 'Cameras, lights, and a computer that never stalls.', type: 'tech', value: 20000 },
    { id: 'smarthome', label: 'A Fully Smart Home', note: 'Every screen, speaker, and switch, installed.', type: 'tech', value: 35000 },
    { id: 'tuition', label: 'A Year of Learning Anything', note: 'Tuition or classes for whatever you have wanted to study.', type: 'experience', value: 55000 },
    { id: 'gameday', label: 'Season Tickets and a Big Finale', note: 'A full season of seats plus the championship trip.', type: 'experience', value: 28000 },
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

export function isBonusPuzzleEligible(puzzle) {
  if (typeof puzzle?.phrase !== 'string') return false;
  const letters = puzzle.phrase.match(/[A-Z]/gi) ?? [];
  if (letters.length === 0) return false;
  const givenLetterCount = letters.filter((letter) => BONUS_GIVEN_LETTERS.includes(letter.toUpperCase())).length;
  return givenLetterCount / letters.length <= BONUS_MAX_GIVEN_RATIO;
}

function pickPuzzle(usedIds, rng, eligible = () => true) {
  const available = PUZZLES.filter((puzzle) => !usedIds.includes(puzzle.id) && eligible(puzzle));
  requireCondition(available.length > 0, 'No unused puzzles remain.');
  const categories = [...new Set(available.map((puzzle) => puzzle.category))];
  const category = categories[randomIndex(categories.length, rng)];
  const candidates = available.filter((puzzle) => puzzle.category === category);
  return { ...candidates[randomIndex(candidates.length, rng)] };
}

// Three bonus-eligible puzzles, each from a different category, for the champion to choose from.
function pickBonusCategoryOptions(usedIds, rng) {
  const available = PUZZLES.filter((puzzle) => !usedIds.includes(puzzle.id) && isBonusPuzzleEligible(puzzle));
  requireCondition(available.length > 0, 'No unused puzzles remain.');
  const categories = [...new Set(available.map((puzzle) => puzzle.category))];
  const options = [];
  while (options.length < BONUS_CATEGORY_CHOICES && categories.length > 0) {
    const [category] = categories.splice(randomIndex(categories.length, rng), 1);
    const candidates = available.filter((puzzle) => puzzle.category === category);
    options.push({ ...candidates[randomIndex(candidates.length, rng)] });
  }
  return options;
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
  game.pendingPrize = null;
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

function historyForNewGame(seenPuzzleIds) {
  const seen = usablePuzzleHistory(seenPuzzleIds);
  const seenIds = new Set(seen);
  const remainingBonusPuzzles = PUZZLES.filter(
    (puzzle) => isBonusPuzzleEligible(puzzle) && !seenIds.has(puzzle.id),
  ).length;
  return remainingBonusPuzzles >= PUZZLES_PER_GAME ? seen : [];
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
  const players = names.map((name) => ({ name: name.trim(), total: 0, round: 0, prizes: [] }));
  const seen = historyForNewGame(seenPuzzleIds);
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
    bonusCategoryOptions: [],
    bonusCategory: null,
    bonusPrize: 25000,
    bonusWon: null,
    usedPuzzleIds: [...seen, puzzle.id],
    lastSpin: null,
    pendingPrize: null,
    claimedPrizeIndices: [],
    roundPrizes: [],
    roundWinnings: 0,
    bankruptsHit: 0,
    turnSerial: 1,
    turnSeconds: TURN_SECONDS,
    bonusSeconds: BONUS_SECONDS,
    bonusPickSeconds: BONUS_PICK_SECONDS,
    bonusCountdownSeconds: BONUS_COUNTDOWN_SECONDS,
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
  // Two Bankrupts in a row is no fun, and each round only allows so many Bankrupt landings.
  // The wedges stay on the board either way; the spin simply cannot stop on them.
  const blockBankrupt = game.lastSpin?.type === 'bankrupt' || bankruptsRemaining(game) === 0;
  const eligible = wheel
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => !(blockBankrupt && segment.type === 'bankrupt'));
  const { segment, index } = eligible[randomIndex(eligible.length, rng)];
  game.lastSpin = { index, ...segment };
  game.pendingPrize = null;
  if (segment.type === 'cash' || isPrizeWedge(segment)) {
    game.pendingValue = Math.round(segment.value * roundMultiplier(game.round));
    game.action = 'consonant';
    startClock(game);
    if (isPrizeWedge(segment)) {
      const catalog = WEDGE_PRIZES[segment.type];
      game.pendingPrize = { ...catalog[randomIndex(catalog.length, rng)], kind: segment.type };
      game.lastSpin.prize = { ...game.pendingPrize };
      game.message = `${segment.type === 'trip' ? 'Trip surprise' : 'Mystery prize'}: ${game.pendingPrize.label}! Name a matching consonant to claim it, then solve the round to keep it.`;
    } else {
      game.message = `Choose a consonant for $${game.pendingValue.toLocaleString('en-US')} per letter.`;
    }
  } else {
    if (segment.type === 'bankrupt') {
      const player = game.players[game.activePlayer];
      const lostPrizes = player.prizes.length;
      player.round = 0;
      player.prizes = [];
      game.bankruptsHit += 1;
      const left = bankruptsRemaining(game);
      game.message = `Bankrupt! Your round winnings${lostPrizes > 0 ? ' and prizes are' : ' are'} cleared; your banked total is safe. ${left === 0 ? 'Bankrupt is done for this round.' : `Bankrupt can land ${left} more time${left === 1 ? '' : 's'} this round.`}`;
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
  const pendingPrize = game.pendingPrize;
  game.usedLetters.push(choice);
  game.action = 'spin';
  game.pendingValue = 0;
  game.pendingPrize = null;
  if (occurrences > 0) {
    const claimed = pendingPrize && !vowel;
    if (claimed) {
      player.prizes.push({ ...pendingPrize });
      game.claimedPrizeIndices.push(game.lastSpin.index);
    }
    startClock(game);
    game.message = `${choice} appears ${occurrences} time${occurrences === 1 ? '' : 's'}!${claimed ? ` The ${pendingPrize.label} is yours if you solve this round.` : ''} Spin, buy a vowel, or solve.`;
  } else {
    game.message = `No ${choice} in this puzzle.${pendingPrize ? ` The ${pendingPrize.label} slips away.` : ''}`;
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
  const prizes = player.prizes.map((held) => ({ ...held }));
  const prizeValue = prizes.reduce((total, held) => total + held.value, 0);
  const roundWinnings = prize + prizeValue;
  player.total += roundWinnings;
  game.roundWinner = game.activePlayer;
  game.roundWinnings = roundWinnings;
  game.roundPrizes = prizes;
  game.phase = 'round-end';
  game.action = 'spin';
  game.pendingValue = 0;
  game.pendingPrize = null;
  game.message = `${player.name} solved it and wins $${roundWinnings.toLocaleString('en-US')} this round, for a new total of $${player.total.toLocaleString('en-US')}!${prizes.length > 0 ? ` Prizes won: ${prizes.map((held) => held.label).join(', ')}.` : ''}`;
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
  const bonusOptions = game.round === FINAL_ROUND ? pickBonusCategoryOptions(game.usedPuzzleIds, rng) : [];
  const puzzle = game.round === FINAL_ROUND ? bonusOptions[0] : pickPuzzle(game.usedPuzzleIds, rng);
  game.puzzle = puzzle;
  // The bonus puzzle is only claimed once its category is chosen.
  if (game.round !== FINAL_ROUND) game.usedPuzzleIds.push(puzzle.id);
  game.players.forEach((player) => { player.round = 0; player.prizes = []; });
  game.usedLetters = [];
  game.action = 'spin';
  game.pendingValue = 0;
  game.pendingPrize = null;
  game.lastSpin = null;
  game.roundWinner = null;
  game.roundPrizes = [];
  game.roundWinnings = 0;
  game.bankruptsHit = 0;
  game.claimedPrizeIndices = [];
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
    game.message = `Round ${game.round}${roundMultiplier(game.round) > 1 ? `: ${multiplierLabel(game.round)} wheel values` : ''}! A bigger wheel with ${wheelForRound(game.round).length} spaces is in play. ${game.players[game.activePlayer].name}, you start.`;
  } else {
    game.champion = champion;
    game.activePlayer = champion;
    game.tieBreak = tied;
    game.phase = 'bonus-spin';
    game.bonusLetters = [];
    game.bonusCategoryOptions = bonusOptions;
    game.bonusCategory = null;
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
  game.phase = 'bonus-category';
  game.message = `Envelope ${game.bonusSpin.slot} is locked in. Choose one of ${game.bonusCategoryOptions.length} categories to set your bonus puzzle.`;
  return game;
}

// The champion picks the bonus puzzle by category before any letters appear.
export function bonusCategoryChoices(game) {
  const options = Array.isArray(game?.bonusCategoryOptions) ? game.bonusCategoryOptions : [];
  return options.map((option) => option.category);
}

export function chooseBonusCategory(game, category) {
  requireCondition(game.phase === 'bonus-category', 'The bonus category choice is not open.');
  requireCondition(typeof category === 'string', 'Choose a bonus category.');
  const wanted = category.trim().toUpperCase();
  const option = game.bonusCategoryOptions.find((choice) => choice.category.toUpperCase() === wanted);
  requireCondition(Boolean(option), 'That category is not on offer.');
  game.puzzle = { ...option };
  game.usedPuzzleIds.push(option.id);
  game.bonusCategory = option.category;
  game.phase = 'bonus-pick';
  game.message = `${option.category} it is! R S T L N E are already on the board. ${remainingLettersText(game)} You have ${BONUS_PICK_SECONDS} seconds to choose.`;
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
  requireCondition(!BONUS_GIVEN_LETTERS.includes(choice), 'R S T L N E are already given.');
  requireCondition(!game.bonusLetters.includes(choice), 'That bonus letter has already been chosen.');
  const vowel = VOWELS.includes(choice);
  const sameTypeCount = game.bonusLetters.filter((picked) => VOWELS.includes(picked) === vowel).length;
  requireCondition(
    sameTypeCount < (vowel ? BONUS_VOWELS : BONUS_CONSONANTS),
    vowel ? 'Choose only one bonus vowel.' : 'Choose only three bonus consonants.',
  );
  game.bonusLetters.push(choice);
  if (game.bonusLetters.length === BONUS_CONSONANTS + BONUS_VOWELS) {
    game.phase = 'bonus-countdown';
    game.message = `All your letters are revealed. Take them in: the ${BONUS_SECONDS}-second solve starts in ${BONUS_COUNTDOWN_SECONDS} seconds.`;
  } else {
    game.message = `${choice} is in. ${remainingLettersText(game)}`;
  }
  return game;
}

// Running out of pick time simply starts the solve with whatever letters were chosen.
export function expireBonusPick(game) {
  requireCondition(game.phase === 'bonus-pick', 'Bonus letter selection is not open.');
  game.phase = 'bonus-countdown';
  game.message = `Time is up on your picks! All your letters are revealed. The ${BONUS_SECONDS}-second solve starts in ${BONUS_COUNTDOWN_SECONDS} seconds.`;
  return game;
}

// The solve clock only starts once the short countdown finishes.
export function startBonusSolve(game) {
  requireCondition(game.phase === 'bonus-countdown', 'The bonus countdown is not running.');
  game.phase = 'bonus-solve';
  game.message = `Go! You have ${BONUS_SECONDS} seconds and unlimited guesses to solve the bonus puzzle.`;
  return game;
}

export function solveBonus(game, answer) {
  requireCondition(game.phase === 'bonus-solve', 'The bonus puzzle is not ready to solve.');
  const normalized = parseAnswer(answer);
  if (normalized !== normalizeAnswer(game.puzzle.phrase)) {
    game.message = 'Not quite! Try another answer before time runs out.';
    return game;
  }

  game.bonusWon = true;
  game.bonusPrizeRevealed = true;
  game.players[game.champion].total += game.bonusPrize;
  game.message = `${game.players[game.champion].name} unlocks ${game.bonusPrizeLabel ?? 'the mystery prize'}, worth $${game.bonusPrize.toLocaleString('en-US')}!`;
  game.phase = 'game-over';
  return game;
}

export function expireBonus(game) {
  requireCondition(game.phase === 'bonus-solve', 'There is no active bonus timer.');
  game.bonusWon = false;
  game.bonusPrizeRevealed = false;
  game.phase = 'game-over';
  game.message = 'Time is up! The bonus round was not won, but your banked winnings are safe.';
  return game;
}

export function revealBonusPrize(game) {
  requireCondition(game.phase === 'game-over' && game.bonusWon === false, 'There is no losing bonus envelope to open.');
  requireCondition(!game.bonusPrizeRevealed, 'The bonus envelope is already open.');
  game.bonusPrizeRevealed = true;
  return game;
}

export function isLetterRevealed(game, letter) {
  const normalized = String(letter).toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) return true;
  if (game.phase === 'round-end' || game.phase === 'game-over') return true;
  if (game.phase === 'bonus-spin' || game.phase === 'bonus-category') return false;
  if (game.phase === 'bonus-pick') return BONUS_GIVEN_LETTERS.includes(normalized);
  if (game.phase === 'bonus-countdown' || game.phase === 'bonus-solve') {
    return BONUS_GIVEN_LETTERS.includes(normalized) || game.bonusLetters.includes(normalized);
  }
  return game.usedLetters.includes(normalized);
}
