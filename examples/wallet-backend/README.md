# Wallet Backend Sketch

This is an integration pattern, not a full wallet application.

Goal:

1. A wallet backend is about to show a receive invoice to a user as "ready to be paid."
2. Before doing that, it checks whether the receiver actually has enough reserve-aware inbound liquidity.
3. If not ready, it asks Sluice for a prepare plan instead of showing a payment that will silently fail.

## Concrete Example

See [`receiver-readiness.ts`](receiver-readiness.ts) for a runnable integration sketch that shows:

- a readiness check against the receiver node
- the plain-language reason behind the readiness result
- a dry-run Sluice prepare plan when the receiver is not yet ready

## Why This Pattern Matters

- A wallet backend does not need to understand Fiber reserve math to use this.
- Checking readiness before displaying "receive" as available avoids showing a payment path that will fail on the sender's first attempt.
- This pattern is intended for integration, not for replacing wallet UI, custody, or key management.
