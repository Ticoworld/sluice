# Video Shot List

Visual sequence only. No narration text — voiceover gets added naturally
during edit, not read from a script.

## Shot 1 — The real proof (anchor shot, don't cut this short)

Run the real local proof (`npm run demo` with live execution enabled, or
the recorded terminal output if re-running live isn't practical for the
recording). Show, in order:

- the before-attempt failure: `Send payment error: Failed to build route, PathFind error: no path found`
- Sluice quoting and opening the reserve-aware channel
- `ChannelReady`
- the payment retry succeeding: `Success`, invoice `Paid`

This is the technical trust anchor. Everything else in the video is
secondary to this actually happening on screen.

## Shot 2 — Install

Clean terminal, run `npm install @ticoworld/sluice@alpha` against the real
registry. Let the real install output show.

## Shot 3 — SDK code

A few real lines: `import { Sluice } from "@ticoworld/sluice"`, construct
the client, call `.quote({ amountCkb: "1" })`. Either type it live or show
`examples/sdk/quote.ts` in an editor.

## Shot 4 — Hosted playground

Browser open to the live GitHub Pages demo
(https://ticoworld.github.io/sluice/demo/index.html):

- hero + install block
- SDK playground tab: type a different `amountCkb` value, show the output
  recompute live (this is the one part of the demo that's genuinely
  interactive, not replayed — worth lingering on)
- scroll to Proof Replay, let the before/after animation play through

## Shot 5 — Breadth close

Quick pan across the builder-surface cards (SDK / CLI / HTTP / OpenAPI /
Docker / wallet example / merchant example / doctor command), or the repo
file tree showing the same breadth.

## Notes

- Shot 1 is the only one that must not be shortened or skipped.
- Shots 2-4 exist to answer "is this just a repo, or something I could
  actually use" — that's the distribution story this session built.
- Total target: ~90-100 seconds, matching the original pacing.
