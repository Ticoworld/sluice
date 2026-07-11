# Sluice SDK

Sluice exposes a small developer-facing SDK on top of the proven Fiber RPC, quote, readiness, channel preparation, and payment proof flows.

## Local Usage

In this repo, import the SDK from source:

```ts
import { Sluice } from "./src/sdk/index.js";
```

## Package Usage

```bash
npm install @ticoworld/sluice
```

When Sluice is installed as a package or consumed from an `npm pack` tarball:

```ts
import { Sluice } from "@ticoworld/sluice";
```

The package root re-exports the SDK entry, and the `@ticoworld/sluice/sdk` subpath is also available for direct SDK imports.
CommonJS consumers can use:

```js
const { Sluice } = require("@ticoworld/sluice");
```

The same pattern works for `require("@ticoworld/sluice/sdk")`.

Create one SDK instance for the service node you want to operate:

```ts
const sluice = new Sluice({
  serviceRpcUrl: "http://127.0.0.1:8257",
});
```

## Node Resolution

Built-in node names come from the repo config. Additional local nodes are resolved from environment variables.

Examples:

```powershell
SLUICE_NODE5_RPC_URL=http://127.0.0.1:8267
SLUICE_NODE7_RPC_URL=http://127.0.0.1:8287
```

If a node name is not built in and no matching env var exists, the SDK reports it as unknown instead of guessing.

## Quote

```ts
const quote = sluice.quote({
  amountCkb: "1",
});
```

The quote engine is integer-safe and reserve-aware:

- 1 CKB = 100000000 shannons
- default accept-side reserve = 9900000000 shannons, or 99 CKB

## Readiness

```ts
const readiness = await sluice.checkReadiness({
  receiverRpcUrl: "http://127.0.0.1:8287",
  amountCkb: "1",
});
```

Use readiness when you want a read-only answer to:

- whether the receiver is reachable
- whether a peer connection exists
- whether a ChannelReady path exists
- whether readable outbound liquidity is sufficient

## Prepare Inbound

```ts
const prepared = await sluice.prepareInbound({
  receiverRpcUrl: "http://127.0.0.1:8287",
  amountCkb: "1",
  dryRun: true,
  acceptMode: "detect",
});
```

For live mutation:

```ts
const live = await sluice.prepareInbound({
  receiverRpcUrl: "http://127.0.0.1:8287",
  amountCkb: "1",
  execute: true,
  yes: true,
  acceptMode: "manual",
});
```

## Prove Payment

```ts
const proof = await sluice.provePayment({
  receiverRpcUrl: "http://127.0.0.1:8287",
  amountCkb: "1",
  dryRun: true,
});
```

The proof runner follows the same guardrails:

- create receiver invoice
- attempt before-payment
- prepare reserve-aware inbound liquidity
- retry payment after ChannelReady
- verify payment Success
- verify receiver invoice Paid

## Safety Model

- Dry-run is the default.
- Live mutation requires `execute: true` and `yes: true`.
- The SDK uses integer shannons internally to avoid floating-point drift.
- The SDK never needs local secret paths or private keys.

## acceptMode

`acceptMode` controls how the channel coordinator behaves:

- `detect` is the recommended default
- `manual` prefers the proven manual-accept path
- `auto` is exposed for local-behavior-dependent setups, but it is not the default

The current recommendation is:

- default to `detect`
- fall back to `manual` when you want the stable proven path
- treat `auto` as experimental and environment-dependent
