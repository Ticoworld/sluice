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
- The `list_channels` client needed the live Fiber wire shape `{ params: {...} }`, and the client now matches that shape.
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
- The failure is recorded as implementation evidence, not as a protocol or state problem.
- A new live execute retry is allowed only after the wire-shape fix is committed and the read-only checks still pass.
