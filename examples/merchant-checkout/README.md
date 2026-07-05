# Merchant Checkout Sketch

This is an integration pattern, not a full merchant application.

Goal:

1. A buyer tries to pay a Fiber invoice.
2. The payment fails because the receiver is not ready yet.
3. The merchant backend asks Sluice to prepare reserve-aware inbound liquidity.
4. The payment retry succeeds after `ChannelReady`.

## Concrete Example

See [`checkout-flow.ts`](checkout-flow.ts) for a runnable integration sketch that shows:

- a failed payment attempt
- a Sluice prepare call
- a successful retry after preparation

## Why This Pattern Matters

- The backend does not need to know Fiber reserve math.
- The backend can keep the checkout flow simple.
- Sluice becomes the operational helper that turns readiness into a payment retry.
- This pattern is intended for integration, not for replacing a merchant app or payment processor.
