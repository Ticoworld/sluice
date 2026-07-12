# Spike Log

## 2026-06-27

Workspace opened in VS Code.

Next task:
Create source map, AI operator rules, and win gates before asking Claude/Codex to implement anything.

Phase 0 reviewed and passed based on the current repository docs.

## 2026-06-27 Phase 1

Fresh node directories used:

- `C:\Users\timot\Desktop\2026\CKB\fiber-local-node\sluice-node1`
- `C:\Users\timot\Desktop\2026\CKB\fiber-local-node\sluice-node2`

Fiber version:

- `fnn Fiber v0.8.1 (b560023 2026-04-16)`

Node ports:

- node1 RPC/P2P: `8227/8228`
- node2 RPC/P2P: `8237/8238`

Evidence summary:

- node1 start: success
- node2 start: success
- node1 node_info: success through `fnn-cli`
- node2 node_info: success through `fnn-cli`
- node2 pubkey captured: yes
- connect_peer: success
- list_peers node1 shows node2: yes
- list_peers node2 shows node1: yes

Phase 1 verdict: passed.

Next phase:

- Phase 2, channel timing spike
- Measure `open_channel` to `ChannelReady`

## 2026-06-27 Phase 2

Zero-funding acceptor probe:

- node1 opened a 100 CKB attempt with `10000000000` shannons.
- node2 attempted `accept_channel --funding-amount 0`.
- runtime rejected it with `Invalid parameter: The funding amount (0) should be greater than or equal to 9900000000`.
- the same failure occurred again without `--one-way true`.
- the old pending attempts were cleaned up and marked closed or funding aborted.

Reserve-aware probe:

- node1 opened a fresh channel with `49900000000` shannons, which is 499 CKB.
- node2 accepted with `9900000000` shannons, which is 99 CKB.
- the channel progressed from `NegotiatingFunding` to `ChannelReady` on both sides.
- exact open-to-ready timing was not captured in this run.

Timing honesty:

- `ChannelReady` was observed, but exact open-to-ready timing was not captured in this run.
- A second timed probe is required before Phase 2 is fully closed.

Verdict:

- Phase 2 functional proof passed.
- Phase 2 timing measurement remains pending.

## Measurements

### Channel open timing

Attempt 1:
- service node:
- receiver node:
- open_channel called at:
- temporary_channel_id:
- ChannelReady at:
- total time:
- result:
- errors:

Attempt 2:
- service node:
- receiver node:
- open_channel called at:
- temporary_channel_id:
- ChannelReady at:
- total time:
- result:
- errors:

Attempt 3:
- service node:
- receiver node:
- open_channel called at:
- temporary_channel_id:
- ChannelReady at:
- total time:
- result:
- errors:

## 2026-06-27 Phase 2 timed reserve-aware probe

Timed 499/99 reserve-aware probe:

- open_channel started: `2026-06-27T03:13:31.2615783Z`
- open_channel succeeded and returned temporary_channel_id:
  `0x4057fa69f08df6f6a7310461df4990f565c043877363033a5a32ecffcf781c6a`
- accept_channel started: `2026-06-27T03:14:17.0549747Z`
- accept_channel errored:
  `No channel with temp id Hash256(0x4057fa69f08df6f6a7310461df4990f565c043877363033a5a32ecffcf781c6a) found`
- accept_channel did not return channel_id.
- A live channel later appeared in list_channels:
  `0xf4e8f98b3b5fd557025df1e36e85e27cf229c0bafce15639833557b880a6a99d`
- ChannelReady observed:
  - node2: `2026-06-27T03:14:44.0484303Z`
  - node1: `2026-06-27T03:14:44.2019332Z`
- final state:
  - node1: ChannelReady
  - node2: ChannelReady

Durations:

- open -> accept attempt: `45.7933964s`
- accept attempt -> first ChannelReady observation: `26.9934556s`
- open -> first ChannelReady observation: `72.7868520s`

Verdict:

- Phase 2 timing passes because ChannelReady was reached on both sides with a measured open-to-ready duration.
- Important anomaly: manual accept_channel returned no-temp-id-found even though the channel still reached ChannelReady. This must be investigated before automating accept behavior.

## 2026-06-27 Accept-path investigation

Source-backed finding:

- `auto_accept_amount: 1000000000` belongs to the UDT config path, not the CKB channel accept path.
- CKB channel auto-accept is controlled separately by Fiber CKB auto-accept settings.
- Official/public node docs describe the working CKB pattern as 499 CKB opener funding with 99 CKB reserve on each side, leaving about 400 CKB usable after reserve.

Interpretation:

- The best explanation for the Phase 2 anomaly is that node2 auto-accepted the CKB channel before manual `accept_channel` was called.
- Manual `accept_channel` then failed because the temp id was already gone.

Sluice decision:

- Primary path: detect CKB auto-accept and track the channel to `ChannelReady`.
- Fallback path: surface manual accept guidance when auto-accept is disabled or not triggered.
- Build readiness logic around `open_channel` followed by channel-state inspection, not around assuming manual accept is always required.

## 2026-06-27 Phase 3A

Phase 3A after-channel payment proof:

- A fresh active Fiber node setup was used for this payment proof after regenerating local test nodes for clean credential recovery.
- node2 created a Fibt invoice for `100000000` shannons, which is `1 CKB`.
- node1 paid the invoice.
- payment hash: `0x1e8b2fa4509064801ca20c0922e5305dcdf5f57b080cc5c843abafc720ed0517`
- `payment get_payment` on node1 returned `Success`.
- `payment list_payments --status Success` included the payment.
- `invoice get_invoice` on node2 showed the invoice as `Paid`.
- No implementation was added.

Verdict:

- Phase 3A passed.
- The ready reserve-aware channel can carry payment.
- This does not yet prove the full before/after demo because the receiver already had a ready channel.

Next phase:

- Phase 3B
- Prove a clean before/after flow:
  1. receiver has no usable inbound path/channel
  2. payment fails or readiness fails
  3. reserve-aware channel coordination creates a usable path
  4. same style payment succeeds after `ChannelReady`

## 2026-06-28 Phase 3B

Clean before/after loop:

- node4 was created as a fresh payer / service opener.
- node3 was used as the receiver.
- node4 RPC/P2P ports: `8257/8258`
- node4 and node3 were connected as peers.
- Before channel setup, both sides had no existing `ChannelReady` channel between them.
- node3 created a 1 CKB Fibt invoice.
- node4 attempted to pay before a usable channel existed.
- before-payment failure string:
  `Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 100000000`
- node4 opened a reserve-aware channel to node3 with opener amount `12000000000` shannons, which is `120 CKB`.
- node3 manually accepted with `9900000000` shannons, which is `99 CKB`.
- open_channel temp id:
  `0x1085f881557f63c4198b9675deefb072b7ed4cb181b1ec720e69f74cf6ae349a`
- accepted channel id:
  `0x03b8c8f33b0e98b8d3a9f19a6012d837299199f4b6ed765940ad38a7aa1100c9`
- node4 channel state reached `ChannelReady`.
- node3 channel state reached `ChannelReady`.
- after-channel payment succeeded.
- `payment get_payment` returned `Success`.
- node3 `invoice get_invoice` showed `Paid`.
- No implementation was added.

Key learning:

- 499 CKB is not required for this controlled manual-accept proof.
- 120 CKB opener funding plus 99 CKB receiver funding was enough to create usable liquidity for a 1 CKB payment.
- Sluice should calculate minimum viable reserve-aware channel amounts instead of blindly using the public-node 499 CKB pattern.
- Sluice must distinguish total wallet balance from spendable funding capacity, because node1 had headline balance but failed funding tx construction due to spendable-cell constraints.
- node4 was used as the clean opener after node1 showed opener-side spendable-capacity issues.

Verdict:

- Phase 3B passed.
- The full before/after proof is now complete.
- Cat 3 remains confirmed.
- The product implementation can begin after the docs commit.

## 2026-07-03 Phase 4

Typed Fiber RPC client foundation:

- Added `FiberRpcClient` (`src/rpc/client.ts`) wrapping `node_info`, `list_peers`, and `list_channels` over JSON-RPC 2.0, with zod-validated response shapes (`src/rpc/types.ts`).
- Added named node config (`src/config.ts`) for `node3` (receiver, `http://127.0.0.1:8247`) and `node4` (service opener, `http://127.0.0.1:8257`), overridable via `SLUICE_<NODE>_RPC_URL` env vars, no secrets involved.
- Added a CLI (`src/cli.ts`, wired through `src/index.ts`) with `node-info <node>`, `peers <node>`, and `channels <node>` commands.
- Tests use a mocked `fetch`, not live Fiber nodes: `npx vitest run` passed 9/9.
- Live smoke test against node3/node4 passed for `node-info`, `peers`, and `channels` on both nodes.

Next phase:

- Phase 5, reserve-aware channel requirement calculation, building on this typed client.

## 2026-07-03 Phase 5

Reserve-aware quote engine:

- Implemented a pure reserve-aware quote engine with exact CKB/shannon conversion helpers.
- Added the default accept-side reserve of `9900000000` shannons, which is `99 CKB`.
- Added quote calculation for a target payment amount and exposed it through the CLI.
- Added `quote --amount-ckb 1` and `quote --amount-shannons 100000000` support.
- For the 1 CKB proof case, the quote returns:
  - target payment: `100000000` shannons, `1 CKB`
  - receiver reserve required: `9900000000` shannons, `99 CKB`
  - receiver accept funding: `9900000000` shannons, `99 CKB`
  - fee/headroom: `2000000000` shannons, `20 CKB`
  - minimum opener funding: `12000000000` shannons, `120 CKB`
  - estimated usable liquidity: `2100000000` shannons, `21 CKB`

Validation:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed for 3 files and 15 tests.
- `npx tsx src/index.ts quote --amount-ckb 1` passed.
- `npx tsx src/index.ts quote --amount-shannons 100000000` passed.

Limitations:

- Phase 5 does not open channels, send payments, or call live Fiber nodes.
- Quote policy is conservative and testnet-oriented.
- Production fee policy, dynamic cell selection, and real LSP pricing remain future work.

Next phase:

- Phase 6, payment readiness checking.

## 2026-07-03 Phase 6

Readiness checker:

- Implemented a read-only payment readiness checker that inspects service-node info, peers, and channels before any channel coordination happens.
- Added conservative parsing for live Fiber channel state and liquidity fields so the checker returns `unknown` instead of faking liquidity when the field shape is unclear.
- Added a CLI command: `readiness --service node4 --receiver-pubkey <pubkey> --amount-ckb 1`.
- The checker uses the Phase 5 reserve-aware quote engine to recommend the minimum viable channel plan.

Validation:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed for 4 files and 20 tests.
- Live smoke call against node4/node3 passed with no crash.
- Live readiness output for the Phase 6 proof case returned:
  - `receiver_reachable: true`
  - `peer_connected: false`
  - `channel_ready: true`
  - `outbound_liquidity_sufficient: true`
  - `readiness_status: ready`
  - reason: payment is ready because a ChannelReady path exists and outbound liquidity covers the target payment
- Live channel liquidity was parsed from the Fiber response as a clearly-present hex balance field, not guessed.

Limitations:

- Phase 6 is still read-only.
- It does not open channels, send payments, or create invoices.
- It does not build a dashboard or database.

Next phase:

- Phase 7, reserve-aware channel coordination.

## 2026-07-04 Phase 7A

Coordinator foundation:

- Implemented a reserve-aware channel coordinator foundation that stays dry-run by default.
- Added typed `open_channel` and `accept_channel` RPC methods plus a `prepare-inbound` CLI command.
- The CLI only mutates live Fiber state when `--execute` or `--yes` is explicitly provided.
- The coordinator reuses the Phase 5 quote engine and Phase 6 readiness checker.

Validation:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed for 5 files and 29 tests.
- Live dry-run smoke command passed without mutation:
  - `npx tsx src/index.ts prepare-inbound --service node4 --receiver node3 --amount-ckb 1`
- Dry-run output reported:
  - mode: `dry-run`
  - readiness satisfied: `true`
  - planned steps: do not open a new channel; retry payment on the existing `ChannelReady` path
- No live mutating `open_channel` or `accept_channel` command was run in this phase.

Limitations:

- The execution path is still mocked and unit-tested only.
- Phase 7A does not claim live channel creation success yet.
- The coordinator is ready for an explicit live `--execute` test in the next phase.

Next phase:

- Phase 7B, explicit live channel execution smoke test.

## 2026-07-04 Phase 7B prep

Environment and node setup:

- Verified env-backed node resolution for `node5` via `SLUICE_NODE5_RPC_URL=http://127.0.0.1:8267`.
- Created a fresh `sluice-node5` receiver with RPC `8267` and P2P `8268`.
- Node5 `node_info` succeeded and reported `auto_accept_channel_ckb_funding_amount: 0x0`.
- Node5 had no peers and no channels before the Phase 7B prep run.
- Node4 was connected to node5 as a peer.
- Node4 and node5 had no existing `ChannelReady` channel between them before the dry-run.

Dry-run coordinator evidence:

- `npx tsx src/index.ts prepare-inbound --service node4 --receiver node5 --amount-ckb 1`
- Dry-run mode remained read-only and did not call `open_channel` or `accept_channel`.
- Readiness output reported `receiver_reachable: true`.
- Readiness output reported `peer_connected: true`.
- Readiness output reported `channel_ready: false`.
- Readiness output reported `outbound_liquidity_sufficient: false`.
- Readiness output reported `readiness_status: not_ready`.
- Recommended quote output reported:
  - target payment: `1 CKB`
  - receiver reserve requirement: `99 CKB`
  - receiver accept funding: `99 CKB`
  - fee headroom: `20 CKB`
  - minimum opener funding: `120 CKB`
  - estimated usable liquidity: `21 CKB`
- Planned steps were the expected reserve-aware path: open channel, watch pending receiver temp id, accept from receiver side if needed, and poll until `ChannelReady`.

Validation:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed.

Limitations:

- No live `--execute` coordinator run has been performed yet.
- Node5 balance was not re-verified through local CKB RPC in this environment during the prep step.

Next phase:

- Phase 7B live execute smoke test against node4 and node5.

## 2026-07-04 Phase 7B RPC wire-shape failure

Live execute attempt:

- One live `prepare-inbound --execute --yes` attempt was run against node4 and node5.
- The request failed safely before any channel mutation.
- Fiber returned `RPC error -32602: Invalid params`.
- No `open_channel` temporary id was returned.
- Node5 did not show a pending inbound channel.
- Node4 and node5 channel state remained unchanged after the failed execute.

Root cause and fix:

- The mutating Fiber RPC methods were using the wrong Fiber wire format for live requests.
- `list_channels`, `open_channel`, and `accept_channel` were aligned to the documented Fiber request structure.
- `funding_amount` values are now encoded as hex strings to match the Fiber examples.
- The wire-shape fix was verified again with read-only CLI and dry-run checks before the next live retry.

## 2026-07-04 Phase 7B live execute result

Live execute outcome:

- The corrected live `prepare-inbound --execute --yes` attempt progressed into a real channel open/accept flow.
- `open_channel` returned temporary channel id `0x1f5e94fd57fc40eae858ea77f2cd72f466619034b4da3ae3e6213a09bc32d781`.
- `accept_channel` returned channel id `0xde3dbbc0dfd615bbc5bd805c2c74230cde079146945f6aab25bb75972db1c53d`.
- The coordinator reported `timeout` before it observed `ChannelReady`.
- Read-only follow-up polling showed the new channel on both nodes reached `ChannelReady` after the timeout.

State after the run:

- Node4 now has the new node5 channel in `ChannelReady`.
- Node5 now has the same new channel in `ChannelReady`.
- The pre-existing node4-node3 channel remains `ChannelReady`.

Limitations:

- The current coordinator timeout is too short for this live flow.
- The command still needs a longer poll window or smarter ready detection before it can report success automatically.

## 2026-07-04 Phase 7B coordinator timeout fix

Behavior update:

- Increased the default coordinator timeout to 180 seconds.
- Added a final readiness check before returning timeout.
- The coordinator now returns `ready` if `ChannelReady` is observed on the final check.
- Timeout output is now more specific:
  - `ready`
  - `timeout_not_ready`
  - `funding_aborted`
  - `rpc_error`

Validation:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed.
- Dry-run against node4/node5 remained read-only and reported `ready` because the live `ChannelReady` path already exists.

## 2026-07-04 Phase 7B final live proof

Fresh receiver setup:

- Created a fresh `sluice-node6` receiver with RPC `8277` and P2P `8278`.
- Node6 `node_info` succeeded and reported `auto_accept_channel_ckb_funding_amount: 0x0`.
- Node6 was funded via the faucet with 10000.0 CKB.
- Node4 was connected to node6 as a peer.
- Before the live execute, node4 and node6 had no existing `ChannelReady` path between them.

Dry-run evidence:

- `npx tsx src/index.ts prepare-inbound --service node4 --receiver node6 --amount-ckb 1`
- Dry-run reported `readiness_satisfied: false`.
- Dry-run reported the expected reserve-aware quote:
  - opener funding: `120 CKB`
  - receiver accept funding: `99 CKB`
- Planned steps were open, wait for pending, accept, and poll until `ChannelReady`.

Live execute evidence:

- One live `prepare-inbound --execute --yes` attempt was run against node4 and node6.
- `open_channel` returned temporary channel id `0x8af43794c5c574f6d731a420f5c932739d3a1b557d93a44e72b49943346e1766`.
- Receiver pending was detected.
- `accept_channel` returned channel id `0xe94aeb8d0cbbdebf04414b1b5ab07ca4dfa272e0bfe780bc1bb6e8ab2f7dc472`.
- The coordinator returned `ready`.
- Read-only follow-up checks confirmed node4 and node6 both showed the new channel as `ChannelReady`.

Verdict:

- Phase 7B is complete.
- The coordinator now proves the live reserve-aware open/accept/ChannelReady flow and returns `ready` on its own.
- Next phase is Phase 8, the before/after payment proof runner.

## 2026-07-04 Phase 8A proof runner foundation

Evidence:

- Added invoice and payment RPC support to the Fiber client.
- Added the `prove-payment` CLI command.
- The proof runner is dry-run by default and stays read-only unless `--execute --yes` is supplied later.
- The proof runner plans the before/after flow as:
  1. create the receiver invoice
  2. attempt the before-payment
  3. prepare reserve-aware inbound liquidity
  4. retry the payment after `ChannelReady`
  5. verify payment `Success`
  6. verify receiver invoice `Paid`
- Tests were added for the proof runner and the invoice/payment RPC request shapes.

Validation:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed with 6 files and 39 tests.
- `npx tsx src/index.ts prove-payment --service node4 --receiver node3 --amount-ckb 1` passed as a dry-run and did not mutate live Fiber state.
- `$env:SLUICE_NODE5_RPC_URL='http://127.0.0.1:8267'; npx tsx src/index.ts prove-payment --service node4 --receiver node5 --amount-ckb 1` also passed as a dry-run, confirming env-backed receiver resolution.

Limits:

- No live `--execute` proof run has been performed yet.
- The already-ready local nodes correctly short-circuit into dry-run planning.
- The full Phase 8 before/after proof still needs a fresh `node7` live run.

Next phase:

- Phase 8B, the live before/after payment proof runner against a fresh receiver.

## 2026-07-04 Phase 8B live before/after payment proof

Fresh receiver setup:

- Created a fresh `node9` receiver with RPC `8307` and P2P `8308`.
- Node9 `node_info` succeeded and reported `auto_accept_channel_ckb_funding_amount: 0x0`.
- Node9 was funded with 200 CKB.
- Node4 was connected to node9 as a peer.
- Before the live execute, node4 and node9 had no existing `ChannelReady` path between them.

Dry-run evidence:

- `npx tsx src/index.ts prove-payment --service node4 --receiver node9 --amount-ckb 1`
- Dry-run reported `readiness_satisfied: false`.
- Dry-run reported the expected reserve-aware quote:
  - opener funding: `120 CKB`
  - receiver accept funding: `99 CKB`
- Planned steps were create invoice, fail before payment, open channel, accept pending channel, poll `ChannelReady`, and retry payment.

Live execute evidence:

- One live `prove-payment --execute --yes` attempt was run against node4 and node9.
- `before_payment` failed with:
  - `Send payment error: Failed to build route, PathFind error: no path found`
- `open_channel` returned temporary channel id:
  - `0xee097073bebf5de069088d65de1b0d5f61ff64e21ecb96552ab79ce1104a47463`
- Node9 pending inbound was detected and accepted.
- `accept_channel` returned channel id:
  - `0x1125001f2711a1d43aab727937def69c41fd760d7671debf3206fea922f54afd7`
- The coordinator reached `ChannelReady` on both nodes.
- The after-payment retry succeeded.
- `payment get_payment` returned `Success`.
- `invoice get_invoice` on node9 showed `Paid`.
- The proof runner returned `ready`.

Important implementation note:

- The proof runner now retries transient route errors after `ChannelReady`, which was necessary for this live before/after proof.

Verdict:

- Phase 8B passed.
- The full before/after payment proof is now complete on a fresh receiver.
- Cat 3 remains confirmed.
- The proof runner now demonstrates the live before/after loop end to end.

## 2026-07-04 Phase 9A0 auto-accept finding

Investigation setup:

- Service/opener: `node4`
- Disabled receiver: `node10`
  - RPC `8317`
  - P2P `8318`
  - `auto_accept_channel_ckb_funding_amount: 0x0`
- Enabled receiver: `node11`
  - RPC `8327`
  - P2P `8328`
  - `auto_accept_channel_ckb_funding_amount: 0x2540be400`
- `open_channel_auto_accept_min_ckb_funding_amount` was visible on both test nodes as `0x2540be400`
- Open amount used for both tests: `120 CKB`
- Receiver accept amount used for both tests: `99 CKB`

Disabled receiver evidence:

- `open_channel` returned temporary channel id `0x847c9ab2226a95775a5ab5883188f79bdc2be1b65d3f4b630953cf8ab431350a`
- `channel list_channels --only-pending true` on node10 showed `NegotiatingFunding`
- `channel list_channels` without the pending filter did not show the pending entry before manual accept
- `accept_channel` on node10 succeeded and returned channel id `0x9595eb599302441a5eec5846733d8ff105fca16a8dd7599490eb27a2d373ce9e`

Enabled receiver evidence:

- `open_channel` returned temporary channel id `0x5e92407ee2a6571134de888752b405ce0d233af29b5ceeb0d614848c981379e9`
- `channel list_channels --only-pending true` on node11 showed `NegotiatingFunding`
- The pending temp id remained visible during the observation window
- `accept_channel` on node11 remained valid and returned channel id `0x2964613d19a612a210c10257d3d64920f34e6d1bedf15408d19ad0cbbf4a29e7`
- Auto-accept did not replace the manual accept path in this test

Verdict:

- Phase 9A0 is complete as a finding, not as a product implementation phase.
- Manual accept remains the stable proven path.
- The SDK/API should expose `manual`, `auto`, and `detect` modes, with `detect` as the recommended default and manual fallback.
- Next phase is public SDK/API work, not new Fiber protocol experimentation.

## 2026-07-04 Phase 9A SDK foundation

Implementation evidence:

- Added the public `Sluice` SDK wrapper over the existing quote, readiness, coordinator, and proof modules.
- Added single-object JSON-RPC params arrays to match the live Fiber wire format for channel and payment methods.
- Added explicit SDK modes:
  - `detect`
  - `manual`
  - `auto`
- Default SDK accept mode is `detect`.
- Live mutation still requires `execute: true` and `yes: true`.
- Added `docs/SDK.md` as the public SDK guide.

Smoke evidence:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed.
- `npx tsx -e` SDK smoke returned a dry-run result with:
  - `mode: dry-run`
  - `readiness: not_ready`
  - `acceptMode: detect`
  - `openerFunding: 120 CKB`

Verdict:

- Phase 9A passes as the public SDK foundation.
- The SDK is now the reusable developer-facing surface for quote, readiness, prepare, and proof flows.
- The next phase can focus on broader packaging or higher-level developer API polish, not more protocol discovery.

## 2026-07-04 Phase 9B HTTP service API

Implementation evidence:

- Added a small HTTP API that wraps the SDK instead of duplicating coordinator or proof logic.
- Added endpoints:
  - `GET /health`
  - `POST /v1/quote`
  - `POST /v1/readiness`
  - `POST /v1/prepare`
  - `POST /v1/prove-payment`
- Added a `serve` CLI command with default port `8787`.
- Added request validation and explicit safety checks so live mutation still requires `execute: true` and `yes: true`.
- Added `docs/HTTP_API.md` and updated the repo map in `README.md`.

Smoke evidence:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed.
- `npx tsx src/index.ts serve --port 8787` started the local HTTP server.
- `curl.exe http://127.0.0.1:8787/health` returned:
  - `ok: true`
  - `service: sluice`
  - `mode: http`
- `curl.exe -X POST http://127.0.0.1:8787/v1/quote` with `{"amountCkb":"1"}` returned the reserve-aware quote:
  - target payment: 1 CKB
  - receiver reserve: 99 CKB
  - receiver accept funding: 99 CKB
  - opener funding: 120 CKB
  - estimated usable liquidity: 21 CKB
- No live execute endpoint was called.

Verdict:

- Phase 9B passes as the HTTP service API foundation.
- Sluice is now callable through a small HTTP layer for wallets, merchant backends, dashboards, hosted demos, and external services.
- The HTTP layer remains read-only by default and keeps mutation behind explicit confirmation.

## 2026-07-04 Phase 9C examples and protocol docs

Implementation evidence:

- Added builder-facing examples for the SDK quote and dry-run prepare flows.
- Added HTTP curl examples for the read-only and guarded mutation routes.
- Added a merchant integration README that shows the intended checkout pattern without creating a full app.
- Added protocol finding and integration guide docs so builders can understand the reserve-aware model without reading spike logs.
- Updated the repo map in `README.md` to point builders at the new docs and examples.
- Added `examples` to the TypeScript include set so example `.ts` files are type-checked.

Smoke evidence:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed.
- No live execute was run.

Verdict:

- Phase 9C passes as examples plus protocol finding documentation.
- Sluice is now easier for another builder to understand, copy, and integrate without re-learning the reserve blocker from scratch.

## 2026-07-04 Phase 9D submission package and replay demo

Implementation evidence:

- Added a judge-facing submission package with a one-page demo summary, technical breakdown, roadmap, video script, and AI usage statement.
- Added a static hosted-demo-ready replay folder with `index.html`, `proof-data.json`, and a short folder README.
- Added a replay-oriented demo page that clearly says it is a static replay of the recorded live local proof.
- Updated the top-level README to point builders and judges at the submission package, demo replay, and proof data.
- Live execute was not run for this phase.

Smoke evidence:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed.

Verdict:

- Phase 9D passes as the submission package and static hosted demo replay.
- The hosted demo replays the recorded Phase 8B proof; the local runbook remains the path for live Fiber execution.

## 2026-07-05 coordinator safety fix

Implementation evidence:

- Fresh clone audit passed.
- One medium coordinator safety issue was found in `findPendingTempId()`.
- The unsafe `channels[0]` pending-channel fallback was removed.
- No live execute was run.

Verdict:

- The coordinator pending-channel lookup is now strict and refuses to accept an unrelated pending channel in execute mode.

## 2026-07-05 package-boundary audit

Implementation evidence:

- Added package exports for ESM and CommonJS consumers.
- Added a dual-build package configuration so `npm pack` emits `dist/package.js`, `dist/package.cjs`, `dist/sdk/index.js`, and `dist/sdk/index.cjs`.
- Verified external ESM, TypeScript, and CommonJS consumers against the packed tarball.
- No live execute was run.

Verdict:

- The SDK package boundary is now proven for both `import` and `require` consumers.

## 2026-07-05 deployment and merchant integration docs

Implementation evidence:

- Added a deployment guide that explains operator mode, merchant backend mode, wallet/backend SDK mode, and public versus private deployment boundaries.
- Added a concrete merchant checkout flow example that shows a payment failure, a Sluice prepare call, and a payment retry after `ChannelReady`.
- Updated the repo map and integration guide links.
- No live execute was run.

Verdict:

- The deployment story is now explicit and the merchant integration pattern is concrete enough for builders and judges to follow.

## 2026-07-08 infrastructure hardening

Implementation evidence:

- Added a read-only `doctor` CLI command for service and receiver diagnostics.
- Added an OpenAPI contract for the HTTP surface.
- Added a Dockerfile, `.dockerignore`, and `.env.example` for a repeatable container/deployment surface.
- Added a GitHub Actions workflow that runs build, typecheck, and tests.
- Added a package-smoke script that proves external ESM, TypeScript, and CommonJS consumers still work from `npm pack`.
- No live execute was run.

Verdict:

- The repo now has a stronger infrastructure trust layer for judges and future Fiber builders.

## 2026-07-09 demo harness

Implementation evidence:

- Added `npm run demo` as the judge-facing public entrypoint, with `demo:doctor`, `demo:dry`, and `demo:proof` retained as advanced commands.
- Added `.env.demo.example` so the demo can be configured cleanly without inlining local node values in docs or shell history.
- Updated `docs/DEMO.md` to explain the public demo flow, the advanced commands, and the proof safety gate.
- No live execute was run.

Verdict:

- The judge-facing demo path is now easier to understand and repeat without hiding the real proof behind a long operator command.

## 2026-07-10 final live proof rerun on fresh nodes

Implementation evidence:

- Fresh `node13` and `node14` were created for the final recording after the earlier `node4/node12` pair accumulated stale aborted channels.
- `npm run demo` with `SLUICE_DEMO_EXECUTE=true` and `SLUICE_DEMO_YES=true` succeeded on the fresh pair.
- Before payment attempt failed with no route.
- Sluice opened a reserve-aware channel.
- The receiver accepted the channel.
- `ChannelReady` was reached.
- The payment retry succeeded.
- The receiver invoice became `Paid`.
- No fake live Fiber execution was used.

Verdict:

- The final judge-facing live proof is complete on a fresh node pair.

## 2026-07-12 demo proof honesty hardening and fresh rerun reliability audit

Implementation evidence:

- Updated `scripts/demo-support.ts` so demo env loading uses `quiet: true`; judge-facing demo commands no longer print dotenv marketing/tip lines ahead of Sluice output.
- Tightened demo-proof result reporting: `After Sluice: receiver is payable` is now printed only when the full proof actually completes (`ChannelReady`, payment retry `Success`, receiver invoice `Paid`).
- Tightened the public demo body too: failed live runs now say the proof did not complete cleanly instead of implying success.
- Added regression tests for failed live-proof output and failed public-demo-body messaging.
- Fresh live reruns were attempted against `node13 -> node15` and then `node14 -> node16`.
- In those reruns, the before-payment failure, reserve-aware quote, `open_channel`, and `accept_channel` all succeeded, but the flow failed before a clean payable result.
- Earlier receiver-side logs on `https://testnet.ckbapp.dev/` showed: `fails to verify the TxUpdate message from the peer: Failed to call CKB RPC: http error: error sending request for url (https://testnet.ckbapp.dev/)`.
- After switching the local nodes to `https://testnet.ckb.dev/`, the freshest opener-side error on node14 was: `Failed to fund channel (attempt 1/5): Failed to call CKB RPC: http error: error decoding response body`, repeated through the retry budget before the channel ended `FUNDING_ABORTED`.

Verdict:

- The previously recorded successful live proof remains the authoritative judge-facing evidence.
- Fresh reruns are environment-sensitive because channel funding depends on third-party public CKB RPC reliability.
- The demo harness now reports failed reruns honestly instead of overstating success.
