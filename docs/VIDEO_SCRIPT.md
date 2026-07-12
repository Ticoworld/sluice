# Video Shot List

Record visuals first, no narration during recording. This file pairs each
shot with suggested narration for the voiceover pass during edit — read
these while watching the cut footage, not word-for-word if it doesn't fit
the pacing.

## Shot 1 — The real proof (anchor shot, don't cut this short)

**Show:** Run the real local proof (`npm run demo` with live execution
enabled, or the recorded terminal output if re-running live isn't
practical for the recording). In order:

- the before-attempt failure: `Send payment error: Failed to build route, PathFind error: no path found`
- Sluice quoting and opening the reserve-aware channel
- `ChannelReady`
- the payment retry succeeding: `Success`, invoice `Paid`

**Narration:**
"Fiber receivers can fail to receive because inbound liquidity is
missing — there's a hidden 99 CKB reserve floor that breaks naive channel
setups. Here's that failure happening live: no route found. Sluice
prepares a reserve-aware inbound channel instead — quotes it, opens it,
waits for ChannelReady. Same payment, retried: success, invoice paid."

This is the technical trust anchor. Everything else in the video is
secondary to this actually happening on screen — don't shorten it.

## Shot 2 — Install

**Show:** Clean terminal, run `npm install @ticoworld/sluice@alpha`
against the real registry. Let the real install output show.

**Narration:**
"Sluice isn't just a repo to clone — it's a published package. Install it
directly."

## Shot 3 — SDK code

**Show:** A few real lines: `import { Sluice } from "@ticoworld/sluice"`,
construct the client, call `.quote({ amountCkb: "1" })`. Either type it
live or show `examples/sdk/quote.ts` in an editor.

**Narration:**
"The SDK gives builders the same reserve-aware quote logic in a few lines
— no need to know the reserve math by hand."

## Shot 4 — Hosted playground

**Show:** Browser open to the live GitHub Pages demo
(https://ticoworld.github.io/sluice/demo/index.html):

- hero + install block
- SDK playground tab: type a different `amountCkb` value, show the output
  recompute live
- scroll to Proof Replay, let the before/after animation play through

**Narration:**
"There's also a hosted playground. This part actually computes live in
your browser — change the amount, the quote recalculates in real time.
The replay below it walks through the same recorded proof you just saw
in the terminal."

## Shot 5 — Breadth close

**Show:** Quick pan across the builder-surface cards (SDK / CLI / HTTP /
OpenAPI / Docker / wallet example / merchant example / doctor command),
or the repo file tree showing the same breadth.

**Narration:**
"SDK, CLI, HTTP API, wallet and merchant integration examples — Sluice
turns a Fiber receive blocker into a reusable integration primitive."

## Notes

- Shot 1 is the only one that must not be shortened or skipped.
- Shots 2-4 exist to answer "is this just a repo, or something I could
  actually use" — that's the distribution story this session built.
- Total target: ~90-100 seconds.
- Not judge-required reading — this file is a production aid for
  recording/editing, not a submission deliverable itself.
