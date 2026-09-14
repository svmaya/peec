# Action Runs — prototype

A clickable prototype of **Action Runs**: the agent that takes an accepted Peec AI Action from brief to draft, hands it off for review and publishing, then watches the published page for 30 days and reports whether it moved the target prompts.

Built for the Peec AI case study "Make Peec AI an agentic product". Data is a frozen snapshot of the Nike demo project (real prompts, actions, sources); the verification stage is synthetic and labelled *Illustrative* in the UI.

## Run it

Open `index.html` in a browser. One file, no server, no build step, no network except Google Fonts.

## Presenting

- Keys **1–6** jump between the six demo screens; **R** resets; **P** hides the presenter bar.
- The **Scenarios** menu on the presenter bar switches on the non-happy paths (budget exhausted, tool error, stale review, no destination, URL found automatically, nudge after 7 days, published URL 404, day 30 nothing moved, logs/GA4 not connected).
- Everything else is reachable by clicking: Decline / Undo, Accept (scheduled tonight) vs Accept & run now, Accept all / Decline all, Cancel run, answer the required input, Edit & approve, Send back, Decline at review, Close run, AI settings (auto-approve by impact band, pause runs, destination).
- "About this prototype" in the sidebar says what is real and what is simulated.

## Structure

```
src/app.js     state machine, hash router, all screens
src/app.css    Peec visual language (Inter + IBM Plex Mono)
src/draft.js   the draft the runner produces (claims tagged sourced / to confirm)
src/data.json  snapshot: prompts, actions, sources, crawlability + synthetic verify data
build.py       assembles index.html from src/
tests/         Playwright checks: smoke.py (happy path) and usecases.py (use cases A–E)
```

Rebuild after editing `src/`: `python3 build.py`.
Tests: `pip install playwright && playwright install chromium`, then `python3 tests/smoke.py` and `python3 tests/usecases.py`.
