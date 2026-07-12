# Sluice Demo Folder

This folder is the hosted Sluice landing page and demo, live at
https://ticoworld.github.io/sluice/demo/index.html via GitHub Pages
(serving the repo's `master` branch root).

Contents:

- `index.html`: the hosted page -- hero, SDK playground, proof replay, builder-surface cards
- `proof-data.json`: recorded proof and quote data, loaded by `index.html` at runtime
- `logo.png`: brand mark used in the page header

## What It Is

- an install-first landing page (`npm install @ticoworld/sluice@alpha`)
- a genuinely live SDK playground: the reserve-aware quote math is ported client-side from
  `src/core/quote.ts` and `src/core/reserve.ts` and actually computes in the browser, not replayed
- a recorded replay of the real before/after local Fiber proof (auto-plays on scroll, loops,
  clearly labeled as a replay, not live)
- builder-surface cards pointing at the SDK, CLI, HTTP API, OpenAPI spec, Docker deploy, and the
  wallet/merchant examples

## What It Is Not

- a live Fiber executor -- the proof replay is recorded data, not a live RPC call
- a full dashboard or hosted operator UI
- a payment app

The local runbook in `docs/DEMO.md` is what performs real live execution.

## Link targets

`index.html`'s doc and example links point to GitHub's blob viewer
(`github.com/Ticoworld/sluice/blob/master/...`), not relative paths. GitHub Pages serves
`.md`/`.yaml`/`.ts` files as raw text, not rendered HTML, so relative links would land on
unstyled plain text -- GitHub's own viewer already renders and syntax-highlights these files
correctly, so links go there directly instead of anywhere on this repo needing to build a
docs site.
