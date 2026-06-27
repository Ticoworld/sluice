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
