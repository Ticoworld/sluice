# Sluice Demo

Sluice turns a Fiber receive failure into a reserve-aware channel-ready path and a successful payment, using the same CLI, SDK, and HTTP surfaces that builders can integrate.

## Local Runnable Demo

These commands use the real local Sluice stack.

```powershell
npx tsx src/index.ts quote --amount-ckb 1
```

```powershell
$env:SLUICE_NODE9_RPC_URL="http://127.0.0.1:8307"
npx tsx src/index.ts readiness --service node4 --receiver-pubkey <node9_pubkey> --amount-ckb 1
```

```powershell
$env:SLUICE_NODE9_RPC_URL="http://127.0.0.1:8307"
npx tsx src/index.ts prepare-inbound --service node4 --receiver node9 --amount-ckb 1
```

```powershell
$env:SLUICE_NODE9_RPC_URL="http://127.0.0.1:8307"
npx tsx src/index.ts prove-payment --service node4 --receiver node9 --amount-ckb 1
```

Live mutation is only for prepared local nodes:

```powershell
$env:SLUICE_NODE9_RPC_URL="http://127.0.0.1:8307"
npx tsx src/index.ts prove-payment --service node4 --receiver node9 --amount-ckb 1 --execute --yes
```

## Hosted Demo

The hosted demo is intentionally static. It replays the recorded Phase 8B proof and links builders to the SDK and HTTP documentation.

- It does not pretend to execute live Fiber on the hosted page.
- It shows the recorded proof data from the live local run.
- It is meant to help judges and builders understand the flow quickly.

## Recorded Phase 8B Proof

The recorded live local proof used:

- Before failure:
  - `Send payment error: Failed to build route, PathFind error: no path found`
- Temporary channel id:
  - `0xee097073bebf5de069088d65de1b0d5f61ff64e21ecb96552ab79ce1104a47463`
- Channel id:
  - `0x1125001f2711a1d43aab727937def69c41fd760d7671debf3206fea922f54afd7`
- After payment:
  - `Success`
- Receiver invoice:
  - `Paid`
- Proof runner:
  - `ready`

The working quote for the proof case was:

- target payment: 1 CKB
- receiver reserve: 99 CKB
- receiver accept funding: 99 CKB
- opener funding: 120 CKB
- estimated usable liquidity: 21 CKB

## What This Demo Proves

- Sluice can detect the before failure.
- Sluice can prepare reserve-aware inbound liquidity.
- Sluice can retry after `ChannelReady`.
- Sluice can verify the payment and invoice state after the retry.

