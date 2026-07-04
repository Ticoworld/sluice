# Fiber Reserve Finding

This doc records the practical Fiber behavior observed in the tested local Fiber v0.8.1-style environment.

## What We Observed

- Receiver-side CKB accept funding could not be treated as zero in the tested local Fiber v0.8.1 setup.
- A zero accept-side funding attempt was not a reliable live path in the tested setup.
- The observed accept-side reserve floor was 99 CKB.
- The successful manual-accept proof used a 99 CKB receiver reserve.
- For the 1 CKB target payment proof case, the working reserve-aware setup was:
  - 120 CKB opener funding
  - 99 CKB receiver accept funding
  - about 21 CKB estimated usable liquidity after reserve

## Why It Matters

If a builder assumes receiver-side accept funding can be treated as zero, the channel setup can fail or stall before `ChannelReady`.

In the tested environment, the common failure modes were:

- the accept side could not proceed with zero funding
- the opener funding transaction could fail when spendable capacity was too tight
- the channel could stop before `ChannelReady` even when the intention was only to make a small inbound payment possible

## What Sluice Does With This Finding

Sluice hides the reserve math behind:

- `quote()`
- `checkReadiness()`
- `prepareInbound()`
- `provePayment()`

That means a builder does not have to remember the reserve floor manually. The SDK and HTTP API can explain:

- the target payment
- the receiver reserve requirement
- the receiver accept funding
- the opener funding
- the estimated usable liquidity

## Important Caveat

This is a local operational finding based on Fiber v0.8.1-style testing in this repo's proof environment.

It is not a final protocol spec. Builders should treat it as the practical behavior Sluice was designed around, not as an exhaustive statement about every possible Fiber deployment.
