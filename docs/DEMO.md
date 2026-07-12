# Sluice Demo

Sluice turns a Fiber receive failure into a reserve-aware channel-ready path and a successful payment, using the same CLI, SDK, and HTTP surfaces that builders can integrate.

The demo is terminal-first on purpose. This is infrastructure, so the most honest demo is a repeatable command sequence, not a fake browser UI.

## Public Demo

Copy the demo env file, fill in your local node values, then run the public demo entrypoint:

```powershell
cp .env.demo.example .env.demo
npm run demo
```

`.env.demo.example` intentionally uses placeholder names (`service1`, `receiver1`) plus explicit `SLUICE_<NAME>_RPC_URL` entries so the demo does not silently depend on one maintainer's old local node names.

`npm run demo` loads `.env.demo`, checks the configured service and receiver, computes the quote, checks readiness, and then:

- runs a safe dry-run story when live execution is not enabled
- runs the real local proof only when `SLUICE_DEMO_EXECUTE=true` and `SLUICE_DEMO_YES=true`, or when `--execute --yes` is passed

If the local Fiber RPC endpoints are unavailable, the command prints a human-readable setup message instead of a raw transport error.

## Advanced Commands

These stay available for debugging and maintainer use:

```powershell
npm run demo:doctor
```

Read-only setup check for the configured service and receiver.

```powershell
npm run demo:dry
```

Dry-run proof story only. No Fiber mutation.

```powershell
npm run demo:proof
```

Real proof runner, gated behind `SLUICE_DEMO_EXECUTE=true` and `SLUICE_DEMO_YES=true`, or `--execute --yes`.

## Local Runnable Demo

The lower-level commands remain available if you want to call the core flow directly.

```powershell
npx tsx src/index.ts quote --amount-ckb 1
```

```powershell
$env:SLUICE_SERVICE1_RPC_URL="http://127.0.0.1:8257"
$env:SLUICE_RECEIVER1_RPC_URL="http://127.0.0.1:8307"
npx tsx src/index.ts readiness --service service1 --receiver-pubkey <receiver1_pubkey> --amount-ckb 1
```

```powershell
$env:SLUICE_SERVICE1_RPC_URL="http://127.0.0.1:8257"
$env:SLUICE_RECEIVER1_RPC_URL="http://127.0.0.1:8307"
npx tsx src/index.ts prepare-inbound --service service1 --receiver receiver1 --amount-ckb 1
```

```powershell
$env:SLUICE_SERVICE1_RPC_URL="http://127.0.0.1:8257"
$env:SLUICE_RECEIVER1_RPC_URL="http://127.0.0.1:8307"
npx tsx src/index.ts prove-payment --service service1 --receiver receiver1 --amount-ckb 1
```

Live mutation is only for prepared local nodes:

```powershell
$env:SLUICE_SERVICE1_RPC_URL="http://127.0.0.1:8257"
$env:SLUICE_RECEIVER1_RPC_URL="http://127.0.0.1:8307"
npx tsx src/index.ts prove-payment --service service1 --receiver receiver1 --amount-ckb 1 --execute --yes
```

## Hosted Demo

The hosted demo is intentionally static. It replays the recorded Phase 8B proof and links builders to the SDK and HTTP documentation.

- It does not pretend to execute live Fiber on the hosted page.
- It shows the recorded proof data from the live local run.
- It is meant to help judges and builders understand the flow quickly.
- Deploy the static demo from the repository root or any host that also serves the `docs/` folder, because the demo page links back to the documentation with relative paths.
- The demo assets are `demo/index.html`, `demo/proof-data.json`, and `demo/README.md`.

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

## Fresh rerun note

- The authoritative successful live proof is the recorded Phase 8B run documented in `docs/REAL_VS_SIMULATED.md`, `docs/DECISION_LOG.md`, and `docs/SPIKE_LOG.md`.
- Fresh reruns can still fail if the local operator relies on unstable public CKB RPC infrastructure during funding-collaboration steps.
- If a live rerun does not end with `ChannelReady`, payment `Success`, and receiver invoice `Paid`, treat it as an environment failure and do not present it as a successful proof clip.
