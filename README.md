# Wheel of Wisdom

play the game https://www.wheelofwisdom.app

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

## Install it like an app

Wheel of Wisdom is a progressive web app, so it can live on a phone home screen and run offline.

- **iPhone/iPad (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu → *Add to Home screen* / *Install app*.
- **Desktop (Chrome/Edge):** install icon in the address bar.

A service worker caches the game shell, so play works without a connection after the first visit. When a new version is deployed the app checks for it on launch, when it returns to the foreground, and hourly; a small toast then offers a **Reload** button to apply the update (nothing reloads mid-game unless you tap it).

## Mobile app (MAUI HybridWebView)

This repo also includes a native .NET MAUI wrapper at `mobile/WheelOfWisdom.Maui` that hosts the same web app in a `HybridWebView` using the official .NET MAUI pattern. The app reuses the repo's existing web files by linking them into the MAUI raw assets instead of copying them, so the game logic and UI stay in one place.

- `mobile/WheelOfWisdom.Maui` contains the .NET MAUI app shell.
- `index.html`, `public/`, and `src/` are linked into `Resources/Raw/wwwroot` at build time, so the browser game remains the single source of truth and no generated web build is copied into the app.
- `Preferences.Default` is used to persist the last sound setting and player state from the native app layer.
- Completed game history is stored as validated, one-row-per-game records in a native SQLite database under `FileSystem.AppDataDirectory`.
- Browser builds continue using local storage, while the HybridWebView waits for native Preferences and SQLite history before initializing the lobby. Existing HybridWebView local-storage history is migrated into SQLite on launch.

Install the .NET 10 MAUI workload, then build a target from the repo root:

```sh
dotnet workload install maui
dotnet build mobile/WheelOfWisdom.Maui/WheelOfWisdom.Maui.csproj -f net10.0-android
```

## CI/CD

- `.github/workflows/ci.yml` runs `npm test` and `npm run build` on pull requests and non-`main` branch pushes.
- `.github/workflows/deploy.yml` tests, builds, and publishes `dist/` to GitHub Pages on every push to `main` (and on demand via *Run workflow*).
- `.github/workflows/maui-android.yml` builds the Android app for relevant pull requests. A manual run can build a signed AAB when `build_release` is enabled.
- `.github/workflows/maui-ios.yml` builds the iOS simulator app for relevant pull requests. A manual run can build a signed IPA and optionally upload it to TestFlight.

Signed Android releases require the `ANDROID_KEYSTORE`, `ANDROID_KEYSTORE_PASSWORD`, and `ANDROID_KEY_ALIAS` repository secrets. Signed iOS releases use `APPSTORE_CERTIFICATE_P12`, `APPSTORE_CERTIFICATE_P12_PASSWORD`, `APPLE_IOS_APPSTORE_PROFILE`, and `APPSTORE_CODESIGN_KEY`; TestFlight additionally uses `APPLE_REFRACTORED_ISSUER_ID`, `APPLE_REFRACTORED_KEY_ID`, and `APPLE_REFRACTORED_P8_KEY`.

Enable it once per repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site is served from the custom domain **www.wheelofwisdom.app**. `public/CNAME` keeps that domain attached on every deploy, so point the DNS `CNAME` record for `www` at `jamesmontemagno.github.io` and enable *Enforce HTTPS* in **Settings → Pages**.

## SEO and sharing

- `index.html` carries the canonical URL, description, robots, Open Graph, Twitter card, and `VideoGame` JSON-LD structured data, all pointing at `https://www.wheelofwisdom.app/`.
- `public/robots.txt` and `public/sitemap.xml` are served from the site root and reference the same domain.
- `public/social-card.png` (1200×630) is the Open Graph and Twitter share image. Edit `assets/social-card.svg` and rasterize it back to that PNG at 1200×630 to change the card.
- Absolute URLs are used in metadata, so update them all if the domain ever changes.

## How to play

- Enter player names, choose two or three players, and pass the device on each turn. Names and party size are remembered on this browser.
- A bold banner plus a **30-second turn clock** shows whose turn it is. Run out of time and play passes on; winnings are untouched. The clock pauses while the wheel spins or a dialog is open, and restarts after every successful action.
- Spin the animated wheel, then choose a consonant. Each match earns the wheel value. Wrong guesses pass the turn.
- Each round uses a bigger wheel with richer cash: 12 spaces in round one, 14 in round two, 16 in round three, and 18 in round four.
- **Trip** and **Mystery** wedges appear from round two, one of each on the wheel. Trip reveals a surprise getaway drawn from 20 destinations worth $5,200 to $15,000. Mystery reveals a fun household or hobby prize drawn from 24 surprises worth $600 to $5,000. Claim either with a matching consonant, then solve that round to bank its value. Once claimed, that wedge becomes cash for the rest of the round (Trip pays $600, $800, and $900 in rounds two through four; Mystery pays $650, $850, and $950, before the round multiplier in rounds three and four). Bankrupt or losing the round loses held prizes, but does not restore the wedge. Missed guesses leave the wedge available.
- Buy a vowel for $250 from your current round winnings before spinning. Vowels do not earn money; a missing vowel still costs $250 and passes the turn.
- **Bankrupt** keeps one wedge on the wheel in rounds one and two and two wedges in rounds three and four. The wedges stay on the board all round, but a round only allows a limited number of Bankrupt landings: one in round one, two in round two, three in round three, and four in round four. Once that limit is reached the spin skips those wedges, and Bankrupt never lands twice in a row. It clears only current round winnings and held prizes. **Lose a Turn** preserves them. Both pass play to the next person.
- Solve the whole puzzle to bank your round winnings, with a $1,000 minimum, plus any trip and mystery prizes you claimed. The round-end summary shows how much was won that round and the winner's new total. Only the solver banks money. Case, spacing, and punctuation do not matter; wrong solutions pass the turn.
- Play four rounds, with raised stakes flagged by a banner above the scoreboard: round three pays **1.5x** on every cash wedge and round four pays **2x**. The lowest banked score starts each new round; ties are broken in rotating player order, starting with the usual round starter. Player one starts the first round.
- The player with the most banked money gets the bonus round. Ties are settled with a random draw.
- The bonus puzzle board stays covered while the champion spins for an envelope and chooses a category. The selected bonus puzzle has no more than 30% of its letter tiles in the given letters R, S, T, L, N, E; repeated letters count separately, while spaces and punctuation do not.
- The champion spins a **mystery wheel** of six sealed envelopes. One of 16 bonus prizes worth $10,000 to $100,000 is inside: cash envelopes, cars from a roadster to a retro camper van, dream trips, home upgrades, tech setups, and once-in-a-lifetime experiences. The prize stays hidden during the bonus round and opens automatically on a win. If the champion runs out of time, the result says the bonus was not won and they can click the envelope to see its prize.
- After the spin, the champion chooses the bonus puzzle from **three different categories**. R, S, T, L, N, E are then revealed on the board right away.
- Pick three more consonants and one vowel within 45 seconds; if that clock runs out, the round continues with whatever letters were picked. The chosen letters fill in on the board together, a 5-second countdown gets the champion ready, and then the solve begins.
- Solve within 45 seconds with unlimited guesses. A win opens the envelope automatically; otherwise the envelope can be clicked to reveal the prize that was missed. The clock continues if you switch apps or open help.
- Solving a round sets off a short confetti-and-fanfare celebration for the winning player, and on phones the wheel spins in a full-screen pop-up so everyone can follow it.
- The envelope opens with an animation after a correct answer, or when the champion clicks it after running out of time. Only a correct answer adds the prize value to the score.
- The **History** tab shows completed games and a leaderboard of cumulative final scores, including banked trip and mystery prizes plus won bonus prizes. Names are matched without regard to surrounding spaces or capitalization; identical names share a leaderboard entry.

Categories, puzzles, trip and mystery surprises, and the bonus envelope are selected randomly, with no repeated puzzles within a game. Puzzles played in earlier games on this device are also skipped; the played list resets as needed to leave enough eligible puzzles for a full game and its bonus round. Every wheel segment is equally likely. Sound is optional, reduced-motion preferences are respected, and a physical keyboard can be used to select letters.

Unfinished games live in memory: reloading or returning home discards the current game without saving its scores. Player names, played puzzles, and completed game history are stored locally in this browser, with no account or server; clearing browser data removes them. If local storage is unavailable or full, the app stays playable and warns that new data lasts only for the current visit. Players use a **single shared device**, not separate online sessions. Gameplay needs no network after loading; the optional web fonts fall back to system fonts if unavailable.

## Project layout

- `src/main.js` — screen rendering, accessible dialogs, wheel animation, sound, and the turn and bonus timers.
- `src/style.css` — responsive portrait and desktop layouts.
- `src/game.js` — game rules, scoring, turns, and random selection.
- `src/storage.js` — local player settings, played puzzles, completed game records, and leaderboard aggregation.
- `src/puzzles.js` — original categorized puzzle bank.
- `tests/game.test.js` — deterministic game-rule coverage.
- `tests/storage.test.js` — local persistence and leaderboard coverage.
