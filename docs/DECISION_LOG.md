# Decision Log

## 2026-06-26

Registered for Gone in 60ms hackathon.

Primary direction:
Category 3, scoped JIT inbound-liquidity service.

Fallback:
Category 2, route confidence engine.

Reason:
Category 3 directly includes LSP service tooling and liquidity quote tools. The winning proof is a real before/after payment loop.

Phase 0 passed, implementation not started.

## 2026-06-27 Phase 2

Updated product framing:

- Sluice is a reserve-aware JIT liquidity coordinator for Fiber.
- It should detect receiver reserve shortfall, explain the 99 CKB constraint, coordinate the minimum viable channel path, and track channel readiness.

Observed protocol/runtime gap:

- Fiber P2P message spec allows zero accepter contribution.
- Fiber v0.8.1 runtime enforced a 99 CKB acceptor reserve in the live channel flow.

Phase 2 status:

- functional proof passed
- exact timing capture pending

## 2026-06-27 Phase 2 timing closed

Timed reserve-aware channel probe reached ChannelReady on both nodes in `72.7868520s` (open_channel start to first ChannelReady observation).

Decision:

- Phase 2 is marked fully passed for timing.
- Manual `accept_channel` returned `No channel with temp id ... found`, yet the channel still progressed to `ChannelReady` on both sides. This accept-path anomaly is logged as an open investigation item, not treated as a Phase 2 failure.
- Before Phase 3 starts, inspect node1/node2 `config.yml` for auto-accept-related settings (read-only inspection, no edits) to understand why the channel became ready without a successful manual accept.
- Product framing unchanged: Sluice is a reserve-aware JIT liquidity coordinator for Fiber.

## 2026-06-27 Accept-path decision

Finding:

- `auto_accept_amount: 1000000000` is a UDT-only setting in Fiber source, not the CKB channel accept path.
- Fiber CKB auto-accept is controlled separately by CKB channel auto-accept settings.
- Official/public node docs describe the working CKB pattern as 499 CKB opener funding with 99 CKB reserve on each side, which matches the live reserve-aware probe.

Conclusion:

- The most likely explanation for the Phase 2 anomaly is that node2 auto-accepted the CKB channel before manual `accept_channel` was called, so the temp id was no longer present when the manual command ran.

Sluice automation decision:

- Primary path: support CKB auto-accept detection and `ChannelReady` tracking after `open_channel`.
- Fallback path: support manual-accept guidance when auto-accept is disabled or does not trigger.
- Phase 3 should not assume manual `accept_channel` is always required.

## 2026-06-27 Phase 3A

Phase 3A result:

- A fresh active Fiber node setup was used for the payment proof after regenerating local test nodes for clean credential recovery.
- node2 created a Fibt invoice for `100000000` shannons, which is `1 CKB`.
- node1 paid the invoice successfully.
- `payment get_payment` on node1 returned `Success`.
- `payment list_payments --status Success` included the payment.
- `invoice get_invoice` on node2 showed the invoice as `Paid`.

Decision:

- Phase 3A is passed.
- The ready reserve-aware channel is confirmed as usable for real payment traffic.
- The full before/after demo is still pending because this proof used an already-ready channel.
- Next step is Phase 3B: prove the before state fails, then Sluice-style reserve-aware channel setup makes the same style payment succeed.

## 2026-06-28 Phase 3B

Decision:

- Phase 3B is passed.
- The clean before/after loop is complete.
- node4 was used as the clean opener after node1 showed opener-side spendable-capacity issues.
- 120 CKB opener funding plus 99 CKB receiver funding was enough to create usable liquidity for a 1 CKB payment.
- Sluice should calculate minimum viable reserve-aware channel amounts instead of blindly using the public-node 499 CKB pattern.
- Sluice must distinguish total wallet balance from spendable funding capacity.
- Cat 3 remains confirmed.
- Product implementation can begin after the docs commit.

## 2026-07-03 Phase 4

Decision:

- Typed Fiber RPC client foundation is passed.
- Live smoke test against node3/node4 passed for `node-info`, `peers`, and `channels` on both nodes.
- The `list_channels` client needed the live Fiber wire shape `params: [ { ... } ]`, and the client now matches that shape.
- This closes the live compatibility check for the typed RPC foundation.

## 2026-07-03 Phase 5

Decision:

- Phase 5 is passed.
- The first core Sluice product primitive is now the reserve-aware quote engine.
- The engine uses exact CKB/shannon conversion helpers and the proven 99 CKB accept-side reserve from the Phase 3B manual flow.
- The CLI quote command works for both CKB and shannon inputs.
- This phase stays pure: no channel opens, no payment sends, and no live Fiber RPC calls.
- Next phase is payment readiness checking, not channel coordination yet.

## 2026-07-03 Phase 6

Decision:

- Phase 6 is passed.
- Sluice now has a read-only readiness checker that tells whether a receiver can be paid right now from the service node.
- The checker reports readiness without faking liquidity: if the live channel fields are unclear, it can return `unknown`.
- The live Phase 6 smoke case against node4/node3 returned `ready` from a real `ChannelReady` path with sufficient outbound liquidity.
- The first `list_peers` view did not list the receiver, so readiness is based on actual channel state plus read liquidity, not on peer listing alone.
- Next phase is reserve-aware channel coordination.

## 2026-07-04 Phase 7A

Decision:

- Phase 7A foundation is passed.
- Sluice now has a reserve-aware channel coordinator that is dry-run by default and requires explicit `--execute` or `--yes` to mutate live Fiber state.
- The coordinator uses the Phase 5 quote engine and Phase 6 readiness checker to produce a no-op plan when the receiver is already ready.
- Typed `open_channel` and `accept_channel` RPC methods are now available for the coordinator path.
- The live smoke was read-only only; no mutating channel command was run in this phase.
- The live execute path remains an explicit next-step smoke test, not yet a proven production path.
- Next phase is explicit live channel execution smoke testing.

## 2026-07-04 Phase 7B prep

Decision:

- Phase 7B prep is complete enough to proceed to a live execute smoke test after the remaining node5 funding check is satisfied.
- Env-backed node resolution already supports `node5` via `SLUICE_NODE5_RPC_URL`, so no special hardcoded config change was needed.
- A fresh `node5` receiver was created and verified as fresh, with auto-accept disabled and no pre-existing `ChannelReady` path to node4.
- Node4 was connected to node5 and the coordinator dry-run reported the expected reserve-aware 120 CKB opener / 99 CKB receiver plan.
- The dry-run remained read-only, reported `not_ready`, and did not mutate live Fiber state.
- No live `--execute` run has occurred yet, so Phase 7B live execution is still pending.

## 2026-07-04 Phase 7B RPC wire-shape failure

Decision:

- The first live Phase 7B execute failed safely before mutation because the Fiber RPC request body shape was wrong for mutating channel methods.
- The failure was `RPC error -32602: Invalid params`, with no `open_channel` temp id returned and no pending inbound channel created.
- The client was corrected to use the documented Fiber JSON-RPC array-style `params` shape for `open_channel`, `accept_channel`, and `list_channels`.
- The client also now hex-encodes `funding_amount` values to match Fiber’s documented examples.
- The failure is recorded as implementation evidence, not as a protocol or state problem.
- A new live execute retry is allowed only after the wire-shape fix is committed and the read-only checks still pass.

## 2026-07-04 Phase 7B live execute result

Decision:

- The live execute path is now confirmed to mutate Fiber state successfully.
- The node4-node5 channel was opened and accepted, then later observed as `ChannelReady` on both nodes.
- The coordinator still returned `timeout` because its polling window expired before readiness was observed.
- Phase 7B is therefore functionally alive, but the command still needs a longer timeout or improved ready detection before it can report success automatically.
- No additional live execute retry should be treated as necessary for proving the protocol flow itself; the remaining work is coordinator ergonomics and timeout tuning.

## 2026-07-04 Phase 7B coordinator timeout fix

Decision:

- The coordinator observation path was improved to avoid premature timeout on slow-but-successful channel readiness.
- Default timeout is now 180 seconds, with user-configurable `--timeout-ms` and `--poll-interval-ms` still supported.
- The final readiness check now returns `ready` if the channel reaches `ChannelReady` just as the timeout window closes.
- Failure states are reported more precisely as `timeout_not_ready`, `funding_aborted`, `rpc_error`, or `ready`.
- No live execute was run after this fix.
- The repo is ready to commit the timeout/observation improvement once reviewed.

## 2026-07-04 Phase 7B final live proof

Decision:

- Phase 7B is passed.
- A fresh `node6` receiver was created, funded, connected to node4, and verified as not already ready.
- The live `prepare-inbound --execute --yes` run against node4 and node6 successfully opened the channel, detected the receiver pending entry, accepted it, and reached `ChannelReady` on both nodes.
- The coordinator returned `ready`, so the fixed observation path is now live-proven, not just unit-tested.
- No further Phase 7B live retries are needed.
- Next phase is Phase 8: the before/after payment proof runner.

## 2026-07-04 Phase 8A proof runner foundation

Decision:

- Phase 8A passed as the proof-runner foundation.
- Sluice now has invoice/payment RPC support plus a `prove-payment` CLI command that is dry-run by default.
- The proof runner can plan the full before/after payment story: create the invoice, attempt payment before liquidity, prepare reserve-aware inbound liquidity, retry after `ChannelReady`, and verify both payment `Success` and invoice `Paid`.
- The proof runner was verified without live mutation on the current already-ready local nodes.
- Env-backed receiver resolution works, so a fresh `node7` can be used for the live Phase 8B proof without hardcoded local config changes.
- Full Phase 8 is not passed yet.
- Next phase is Phase 8B, the live before/after payment proof runner against a fresh receiver.

## 2026-07-04 Phase 8B live before/after payment proof

Decision:

- Phase 8B is passed.
- A fresh `node9` receiver was created, funded, and verified as not already ready with node4.
- The live `prove-payment --execute --yes` run against node4 and node9 successfully proved the full before/after loop:
  - before-payment failed with no route
  - reserve-aware channel coordination reached `ChannelReady`
  - after-payment retry succeeded
  - receiver invoice became `Paid`
- The proof runner now retries transient route errors after `ChannelReady`, which was required for the live end-to-end proof.
- Phase 8 is complete.
- Next work is whatever productization or documentation the repo owner wants next; the proof spike itself is finished.

## 2026-07-04 Phase 9A0 auto-accept finding

Decision:

- Phase 9A0 is passed as a finding.
- In this local Fiber setup, CKB auto-accept was not reliable enough to replace the manual accept path.
- Fresh receiver tests showed:
  - disabled auto-accept exposed pending inbound and manual accept worked
  - enabled auto-accept still exposed pending inbound and manual accept remained valid
- Sluice should not assume auto-accept will happen.
- The SDK/API should expose `manual`, `auto`, and `detect` modes.
- Recommended default is `detect`, with a manual fallback when auto-accept is not clearly observed.
- The next product phase can focus on a public SDK/API layer that wraps the proven manual path cleanly.

## 2026-07-04 Phase 9A SDK foundation

Decision:

- Phase 9A passes as the public SDK foundation.
- Sluice now exposes a reusable developer-facing SDK with:
  - `quote()`
  - `checkReadiness()`
  - `prepareInbound()`
  - `provePayment()`
- The SDK default accept mode is `detect`.
- `manual` remains the stable fallback path.
- `auto` is exposed but treated as experimental and environment-dependent.
- Live mutation still requires explicit `execute: true` plus `yes: true`.
- The RPC client now uses single-object JSON-RPC params arrays to match the live Fiber wire format.
- Next work can focus on packaging or higher-level ergonomics, not on more spike discovery.

## 2026-07-04 Phase 9B HTTP service API

Decision:

- Phase 9B passes as the HTTP service API foundation.
- Sluice now exposes a small HTTP layer that wraps the SDK instead of duplicating core logic.
- The server exposes:
  - `GET /health`
  - `POST /v1/quote`
  - `POST /v1/readiness`
  - `POST /v1/prepare`
  - `POST /v1/prove-payment`
- Dry-run remains the default behavior.
- Live mutation still requires `execute: true` and `yes: true`.
- The default local server port is `8787`.
- The HTTP layer is intended as the integration surface for wallets, merchant backends, hosted demos, and external services.

## 2026-07-04 Phase 9C examples and protocol docs

Decision:

- Phase 9C passes as the examples and protocol-finding documentation phase.
- Sluice now includes builder-facing examples for the SDK and HTTP API.
- Sluice now includes an integration guide and a reserve finding doc so the practical Fiber blocker is visible without reading the entire spike history.
- The repo map points builders at the new examples and docs.
- Example TypeScript files are type-checked by including `examples` in `tsconfig.json`.
- No live execute was run.

## 2026-07-04 Phase 9D submission package and replay demo

Decision:

- Phase 9D passes as the submission package and static hosted demo replay phase.
- Sluice now includes a judge-facing documentation bundle:
  - demo summary
  - technical breakdown
  - roadmap
  - video script
  - AI usage statement
- Sluice now includes a static hosted demo replay folder with recorded proof data.
- The hosted demo is intentionally static and does not pretend to execute live Fiber calls.
- The local runbook remains the path for live Fiber execution and proof reproduction.
- The top-level README now points builders and judges at the package artifacts.
- No live execute was run.

## 2026-07-05 coordinator safety fix

Decision:

- The coordinator pending-channel lookup is now strict.
- `findPendingTempId()` returns only an exact expected temporary channel id.
- If the expected pending channel is missing on the receiver, the execute path fails safely with a readable refusal message instead of accepting an unrelated pending channel.
- This removes the unsafe `channels[0]` fallback from live execution.
- Fresh clone audit passed.
- No live execute was run.

## 2026-07-05 package-boundary audit

Decision:

- The SDK package boundary is now supported for ESM, TypeScript, and CommonJS consumers.
- The package exports both `import` and `require` targets from the root and `./sdk` subpath.
- `npm pack` now produces a tarball that external consumers can install and use without touching repo source paths.
- External consumer checks confirmed:
  - `import { Sluice } from "sluice"`
  - `require("sluice")`
  - `import { Sluice } from "sluice/sdk"`
  - `require("sluice/sdk")`
- No live execute was run.

## 2026-07-05 deployment and merchant integration docs

Decision:

- The deployment story is now explicit in `DEPLOYMENT.md`.
- The merchant checkout flow is now shown concretely in `examples/merchant-checkout/checkout-flow.ts`.
- The repo now explains how an operator, merchant backend, or wallet backend should use Sluice in practice.
- The hosted demo remains replay-based rather than a live Fiber executor.
- No live execute was run.

## 2026-07-08 infrastructure hardening

Decision:

- The repo now includes a read-only `doctor` CLI command for operator diagnostics.
- The HTTP API is now described in an OpenAPI contract.
- The repository now ships a Dockerfile, `.dockerignore`, `.env.example`, and CI workflow for build/test trust.
- The package-smoke script documents and verifies external package consumption from `npm pack`.
- The new surface stays infrastructure-grade and does not add fake product UI or live Fiber hosting.
- No live execute was run.

## 2026-07-09 demo harness

Decision:

- `npm run demo` is now the judge-facing public demo entrypoint.
- `demo:doctor`, `demo:dry`, and `demo:proof` remain available as advanced/maintainer commands.
- `.env.demo.example` is the documented place for judge-facing demo configuration.
- `demo:proof` must be explicitly enabled with `SLUICE_DEMO_EXECUTE=true` and `SLUICE_DEMO_YES=true`, or equivalent command-line flags, before it will run live mutation.
- The harness improves presentation without changing Fiber behavior or adding fake UI.
- No live execute was run.

## 2026-07-10 final live proof rerun

Decision:

- The final live video should use fresh nodes `node13` and `node14` instead of the earlier polluted `node4/node12` pair.
- The live demo runner stays env-backed, so any fresh service/receiver pair can be substituted without changing core code.
- Stale aborted channel history should not be reused for the final recording.
- The successful live proof is the authoritative judge-facing evidence for the before/after flow.

## 2026-07-11 REAL_VS_SIMULATED.md reconciliation

Decision:

- `docs/REAL_VS_SIMULATED.md` had gone stale: it still said "No Fiber RPC execution has happened yet," contradicting the 2026-07-10 successful live proof recorded above and in `SPIKE_LOG.md`.
- The doc now states the real before/after result (route failure, channel opened, `ChannelReady`, payment `Success`, invoice `Paid`) with a pointer to the `DECISION_LOG.md`/`SPIKE_LOG.md` evidence and `demo/proof-data.json`.
- Added an explicit "Replayed / Hosted Demo" section clarifying that `demo/index.html` is a recorded replay, not live Fiber execution.
- No code was changed. No live execute was run.

## 2026-07-11 npm package rename to @ticoworld/sluice

Decision:

- The unscoped npm name `sluice` is already registered by an unrelated third-party package, so publishing under it was never viable.
- Renamed the package to `@ticoworld/sluice` (personal npm account scope, confirmed owned by the maintainer) and set the version to `0.1.0-alpha.0` to signal pre-stable status.
- Added `publishConfig.access: public` so the scoped package publishes publicly rather than defaulting to private.
- Updated all in-repo references from `sluice` to `@ticoworld/sluice`: `scripts/package-smoke.mjs`, `docs/SDK.md`, `docs/DEPLOYMENT.md`.
- Verified end to end: `npm run build`, `npx tsc --noEmit`, `npx vitest run` (67 passed), `npm pack --dry-run` (clean 10-file tarball, no stray files), and `npm run test:package` (ESM/TypeScript/CommonJS consumers all import `@ticoworld/sluice` successfully from a real packed tarball).
- Not yet published. No live execute was run.

## 2026-07-11 npm alpha publish and wallet-backend example

Decision:

- Published `@ticoworld/sluice@0.1.0-alpha.0` to the public npm registry under the `alpha` dist-tag, after enabling 2FA on the npm account and generating a scoped, time-limited granular access token with 2FA bypass (revoked immediately after the publish completed).
- Verified the published package with a real registry install in a clean directory (`npm install @ticoworld/sluice@alpha`), then imported and called `Sluice.quote()` against the installed package to confirm it actually works, not just that publish succeeded.
- npm assigns `latest` to a package's first-ever published version regardless of the `--tag` used, and that tag cannot be removed while it is the package's only version. `latest` and `alpha` currently point at the same version as an unavoidable consequence of this being the first publish. Docs were updated to explicitly pin `npm install @ticoworld/sluice@alpha` rather than relying on the bare install resolving correctly.
- Added `examples/wallet-backend/receiver-readiness.ts`, closing the one hackathon-rubric-named consumer audience (wallets, alongside merchants/services/operators already covered) with no prior example. Uses the SDK's real `readiness_status` field (`"ready" | "not_ready" | "unknown"`), not a `.ready` boolean, matching `src/core/readiness.ts`.
- No live execute was run.

## 2026-07-11 demo/index.html redesign: install-first playground

Decision:

- Rebuilt `demo/index.html` from a single console-style page into: hero (install command, SDK snippet, CTAs), an SDK playground (SDK/CLI/HTTP/wallet backend/merchant backend tabs with real code from this repo and deterministic output, not a live interpreter), the existing proof-replay engine (kept, not rewritten, only relabeled), a builder-surfaces card grid, and a real/replay/out-of-scope section.
- All playground tab snippets are copied from the actual source files (`src/sdk/sluice.ts`, `docs/DEMO.md`, `examples/http/curl.md`, `examples/wallet-backend/receiver-readiness.ts`, `examples/merchant-checkout/checkout-flow.ts`) so the playground can't drift from what the repo actually does.
- Renamed "Live Execution Sandbox" to "Recorded Local Proof Replay" and added an explicit honesty banner linking to `docs/REAL_VS_SIMULATED.md`, so the page cannot be mistaken for a live Fiber executor.
- No JS interpreter, no live Fiber calls from the browser, no backend/auth/database added. The proof-replay engine (SVG animation, terminal telemetry) is the same code as before, sourced from `proof-data.json`, only relabeled for honesty.
- Verified locally: served `demo/` on a local static server, syntax-checked the inline script, confirmed all linked repo files exist, and drove the page with a headless-Chromium script to screenshot the hero, both playground tab states, the proof-replay idle and success states, the builder-surface cards, and the real-vs-replay section. Zero console errors.
- No live execute was run.

## 2026-07-12 demo/index.html copy and density pass

Decision:

- Cut the hero kicker line (category text already lives in the footer fine-print) and trimmed the hero sub-headline to one sentence, so the SDK playground appears close to the fold instead of after a long scroll.
- Rewrote section headers/descriptions that read as defensive or over-explaining: "How builders actually use Sluice" -> "Integration & SDK"; "This is infrastructure, not a hackathon trick" -> "Extensible API Surfaces" (not "Production-ready patterns" -- that would contradict "Production LSP" already listed under out-of-scope on the same page); "Honesty Model" eyebrow -> "Architecture & Scope".
- Tightened the proof-replay honesty banner's wording but deliberately kept the explicit "does not execute Fiber RPC calls in your browser" statement and the link to `docs/REAL_VS_SIMULATED.md` -- that line is the page's most direct evidence for the hackathon rule requiring submissions to state what is real/mocked/simulated, and cutting it would reopen the same trust gap fixed on 2026-07-11.
- Added auto-play: the recorded Sluice success path now plays automatically the first time the Proof Replay section scrolls into view (IntersectionObserver, one-shot), instead of sitting idle until clicked. Manual replay buttons still work afterward.
- Verified with the same headless-Chromium screenshot method as the prior pass: first-screen view, proof-replay auto-play firing on scroll, builder surfaces, and real-vs-replay all confirmed rendering correctly with zero console errors.
- No live execute was run.

## 2026-07-12 demo/index.html hero height and further trim

Decision:

- Hero now fills the viewport (`min-height: calc(100vh - nav)`, vertically centered), so the page opens on a single commanding screen instead of a shorter block.
- Cut remaining documentation-flavored content that belonged in docs, not on a landing page: playground per-tab notes shortened from full sentences to a bare `src: <path>` tag, builder-surface card descriptions cut to one line each, and the "Real vs Replay" section's duplicated `docs/REAL_VS_SIMULATED.md` link reduced from two mentions to one.
- Footer link grid cut from 9 links (reading as a doc sitemap) down to 5 essentials: GitHub repo, npm package, README, docs/SDK.md, docs/HTTP_API.md. The dropped links (openapi.yaml, DEMO.md, SUBMISSION.md, REAL_VS_SIMULATED.md) all remain reachable from within the page itself (builder-surface cards, honesty banner, real-vs-replay section) or from the GitHub repo root.
- Verified with the same headless-Chromium screenshot method: full-viewport hero confirmed, trimmed sections confirmed rendering correctly, zero console errors.
- No live execute was run.
