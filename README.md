# Wheel of Fortune

A portrait-first, pass-and-play word game for **2–3 players sharing one phone**. An independent fan-made game with original puzzles, no accounts, no backend, and no real-money prizes.

## Run locally

Requires Node.js 22.12+ (or 20.19+).

```sh
npm ci
npm run dev
```

For testing on a phone on the same network, use `npm run dev -- --host 0.0.0.0` and open the displayed network URL.

```sh
npm test          # Game rules and puzzle-bank tests, using Node's built-in test runner
npm run build    # Production files in dist/
npm run preview  # Preview the production build
```

Deploy `dist/` to any static host. Relative asset paths support hosting under a subdirectory, including GitHub Pages.

## How to play

- Enter player names, choose two or three players, and pass the device on each turn.
- Spin the animated wheel, then choose a consonant. Each match earns the wheel value. Wrong guesses pass the turn.
- Buy a vowel for $250 from your current round winnings before spinning. Vowels do not earn money; a missing vowel still costs $250 and passes the turn.
- **Bankrupt** clears only current round winnings. **Lose a Turn** preserves them. Both pass play to the next person.
- Solve the whole puzzle to bank your round winnings, with a $1,000 minimum. Only the solver banks money. Case, spacing, and punctuation do not matter; wrong solutions pass the turn.
- Play three rounds with rotating starting players and double cash values in round three.
- The player with the most banked money gets a **$25,000 bonus round**. Ties are settled with a random draw.
- The bonus puzzle starts with R, S, T, L, N, E revealed. Pick three more consonants and one vowel, then solve within 20 seconds with one attempt. The clock continues if you switch apps or open help.

Categories and puzzles are selected randomly, with no repeated puzzles within a game. The wheel has equally likely segments. Sound is optional, reduced-motion preferences are respected, and a physical keyboard can be used to select letters.

Games live in memory: reloading or returning home clears the current game. Players use a **single shared device**, not separate online sessions. Gameplay needs no network after loading; the optional web fonts fall back to system fonts if unavailable.

## Project layout

- `src/main.js` — screen rendering, accessible dialogs, wheel animation, sound, and bonus timer.
- `src/style.css` — responsive portrait and desktop layouts.
- `src/game.js` — game rules, scoring, turns, and random selection.
- `src/puzzles.js` — original categorized puzzle bank.
- `tests/game.test.js` — deterministic game-rule coverage.