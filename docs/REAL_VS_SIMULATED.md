# Real vs Simulated

## Real

- Sluice has been tested against local Fiber nodes.
- The before/after proof was successfully run on a fresh local node pair (`node13`, `node14`) on 2026-07-10.
- Before Sluice, the receiver payment failed: `Failed to build route, PathFind error: no path found`.
- Sluice prepared reserve-aware inbound liquidity and opened a channel.
- The channel reached `ChannelReady`.
- The payment retry returned `Success`.
- The receiver invoice became `Paid`.

See [DECISION_LOG.md](DECISION_LOG.md) (2026-07-10 entry) and [SPIKE_LOG.md](SPIKE_LOG.md) for the implementation record of this run, and `demo/proof-data.json` for the recorded channel IDs and RPC error string.

## Replayed / Hosted Demo

- The hosted browser demo (`demo/index.html`) is a recorded replay/explanation of the local proof above, not a live Fiber execution.
- It does not run Fiber nodes in the browser.
- Real live execution happens locally through `npm run demo`.

## Simulated

- Browser wait times and the visual proof animation in `demo/index.html` are presentation/replay elements timed for legibility, not live Fiber RPC execution. The page itself labels this ("Wait time: 72.7s (simulated)", "Status: Local Replay Mode").

## Production Out of Scope

- Sluice is not a production LSP yet.
- It does not run a hosted liquidity marketplace yet.
- It does not provide wallet UI, merchant UI, custody, authentication, or production monitoring yet.
- Multi-asset production support is roadmap/future work.

## Out of scope for hackathon

- Full LSP marketplace
- Real fee settlement
- Production-grade liquidity business model
