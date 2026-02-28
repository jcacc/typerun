# TYPERUN

A browser-based typing game. Words fly across the screen — type them before they reach you.

**[Play it →](https://typerun.vercel.app)**

## How to play

- Type the highlighted word before it crosses the left edge
- Complete words without errors for a **perfect streak** — streaks multiply your score
- Three lives. Miss a word, lose a life.
- **ESC** — pause / unpause
- **M** — mute (while paused or on start/game over screen)
- **Enter** — start / restart

## Mechanics

- Words are tiered by length and difficulty, unlocked as you level up
- Every 10 words = new level; speed and spawn rate increase
- Red **⚠ AVOID** words are hazards — typing any key dodges them to another lane (don't type them)
- Perfect streak boosts score multiplier and adds visual speed-line effects

## Files

| File | Description |
|------|-------------|
| `index.html` | Game logic, rendering, input handling |
| `words.js` | Word pools organized into 4 difficulty tiers |
| `audio.js` | Procedural audio engine (Web Audio API) |

## Running locally

No build step. Open `index.html` directly in a browser.
