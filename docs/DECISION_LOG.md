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
