# Merchant Checkout Sketch

This is an integration pattern, not a full merchant application.

Goal:

1. A buyer tries to pay a Fiber invoice.
2. The payment fails because the receiver is not ready yet.
3. The merchant backend asks Sluice to prepare reserve-aware inbound liquidity.
4. The payment retry succeeds after `ChannelReady`.

## Sketch

```ts
// Pseudo-code only.
// The merchant backend can call Sluice over HTTP or via the SDK.

const readiness = await fetch("http://127.0.0.1:8787/v1/readiness", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    serviceRpcUrl: "http://127.0.0.1:8257",
    receiverRpcUrl: "http://127.0.0.1:8287",
    amountCkb: "1",
  }),
});

if (!(await readiness.json()).readiness.channel_ready) {
  await fetch("http://127.0.0.1:8787/v1/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceRpcUrl: "http://127.0.0.1:8257",
      receiverRpcUrl: "http://127.0.0.1:8287",
      amountCkb: "1",
      acceptMode: "detect",
    }),
  });
}

// The merchant retries the original payment after Sluice has prepared the path.
```

## Why This Pattern Matters

- The backend does not need to know Fiber reserve math.
- The backend can keep the checkout flow simple.
- Sluice becomes the operational helper that turns readiness into a payment retry.
- This pattern is intended for integration, not for replacing a merchant app or payment processor.
