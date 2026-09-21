# Wheel of Wisdom

play the game https://jamesmontemagno.github.io/wheel-of-wisdom/

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

## CI/CD

- `.github/workflows/ci.yml` runs `npm test` and `npm run build` on pull requests and non-`main` branch pushes.
- `.github/workflows/deploy.yml` tests, builds, and publishes `dist/` to GitHub Pages on every push to `main` (and on demand via *Run workflow*).

Enable it once per repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## How to play

- Enter player names, choose two or three players, and pass the device on each turn. Names and party size are remembered on this browser.
- A bold banner plus a **30-second turn clock** shows whose turn it is. Run out of time and play passes on; winnings are untouched. The clock pauses while the wheel spins or a dialog is open, and restarts after every successful action.
- Spin the animated wheel, then choose a consonant. Each match earns the wheel value. Wrong guesses pass the turn.
- Each round uses a bigger wheel with richer cash: 12 spaces in round one, 14 in round two, and 16 in round three.
- **Trip** wedges appear from round two. Land on one to reveal a surprise trip, claim it with a matching consonant, then solve that round to bank its value. Once claimed, that wedge becomes cash for the rest of the round ($600 in round two; $800 before the double-stakes multiplier in round three). Bankrupt or losing the round loses held trips, but does not restore the wedge. Missed guesses leave the trip wedge available.
- Buy a vowel for $250 from your current round winnings before spinning. Vowels do not earn money; a missing vowel still costs $250 and passes the turn.
- **Bankrupt** clears only current round winnings and held trips. **Lose a Turn** preserves them. Both pass play to the next person.
- Solve the whole puzzle to bank your round winnings, with a $1,000 minimum, plus any trips you claimed. Only the solver banks money. Case, spacing, and punctuation do not matter; wrong solutions pass the turn.
- Play three rounds with double cash values in round three. The lowest banked score starts each new round; ties are broken in rotating player order, starting with the usual round starter. Player one starts the first round.
- The player with the most banked money gets the bonus round. Ties are settled with a random draw.
- The champion spins a **mystery wheel** of six sealed envelopes worth $25,000 to $100,000, including cash, a new roadster, a trip around the world, and a cozy cabin. The prize stays hidden until the bonus round ends.
- The bonus puzzle starts with R, S, T, L, N, E revealed. Pick three more consonants and one vowel, then solve within 20 seconds with one attempt. The clock continues if you switch apps or open help.
- The envelope opens with an animation whether you win, guess incorrectly, or run out of time. Only a correct answer adds the prize value to your score.
- The **History** tab shows completed games and a leaderboard of cumulative final scores, including banked trips and won bonus prizes. Names are matched without regard to surrounding spaces or capitalization; identical names share a leaderboard entry.

Categories, puzzles, trip surprises, and the mystery envelope are selected randomly, with no repeated puzzles within a game. Every wheel segment is equally likely. Sound is optional, reduced-motion preferences are respected, and a physical keyboard can be used to select letters.

Unfinished games live in memory: reloading or returning home discards the current game without saving its scores. Player names and completed game history are stored locally in this browser, with no account or server; clearing browser data removes them. If local storage is unavailable or full, the app stays playable and warns that new data lasts only for the current visit. Players use a **single shared device**, not separate online sessions. Gameplay needs no network after loading; the optional web fonts fall back to system fonts if unavailable.

## Project layout

- `src/main.js` — screen rendering, accessible dialogs, wheel animation, sound, and the turn and bonus timers.
- `src/style.css` — responsive portrait and desktop layouts.
- `src/game.js` — game rules, scoring, turns, and random selection.
- `src/storage.js` — local player settings, completed game records, and leaderboard aggregation.
- `src/puzzles.js` — original categorized puzzle bank.
- `tests/game.test.js` — deterministic game-rule coverage.
- `tests/storage.test.js` — local persistence and leaderboard coverage.
