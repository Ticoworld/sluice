# Sluice Deployment Guide

Sluice is designed to sit beside a controlled Fiber service node and help an operator, merchant backend, or wallet backend prepare reserve-aware inbound liquidity before retrying a payment.

## Who Runs Sluice

Typical operators are:

- a service node operator
- a merchant backend
- a wallet backend
- an LSP-style helper service

Sluice is not a hosted wallet or payment app. It is the coordination layer that helps a real Fiber flow recover from a receiver-not-ready state.

## Recommended Deployment

The current recommended setup is:

1. run Sluice HTTP beside a controlled Fiber service node
2. point merchant or wallet backend code at the Sluice HTTP API or SDK
3. keep live mutation behind `execute: true` and `yes: true`
4. treat the hosted demo as replay and documentation, not live Fiber execution

This keeps the public surface simple while leaving the live Fiber node under operator control.

## Operational Modes

### Self-hosted operator mode

Use this when you run the Fiber service node and the Sluice process yourself.

Good for:

- local proof runs
- operator testing
- LSP-style manual coordination

### Merchant backend mode

Use this when checkout or retry logic lives in your backend.

Good for:

- retrying a payment after a receiver-not-ready failure
- calling `POST /v1/prepare` before a second attempt
- keeping reserve math out of checkout code

### Wallet or backend SDK mode

Use the SDK when you want in-process integration.

Good for:

- Node.js services
- TypeScript backends
- CLI helpers and internal tools

Package consumers can import Sluice as:

```ts
import { Sluice } from "sluice";
```

or:

```js
const { Sluice } = require("sluice");
```

## URLs and Trust Boundaries

`serviceRpcUrl` points at the service node that Sluice uses to inspect and coordinate liquidity.

`receiverRpcUrl` points at the receiver node or wallet-side node being prepared.

These URLs are operational inputs, not secrets by themselves. What must stay private is whatever your node operator treats as sensitive, such as local credentials, wallet key material, or any RPC endpoint that should not be exposed publicly.

## Public vs Private

Safe to expose publicly:

- the static demo
- documentation
- the package tarball
- quote and readiness explanations

Should stay private or controlled:

- live Fiber RPC endpoints
- node operator credentials
- wallet or funding control
- any path that can mutate live Fiber state

## What the Hosted Demo Is

The hosted demo is replay-first.

It shows the recorded Phase 8B proof and links to the docs. It does not claim to run live Fiber from the public page.

## What Production Still Needs

Production deployment still needs:

- real infrastructure around the Fiber node
- a stable operator process
- logging and monitoring
- policy choices for routing and timeouts
- a production hosting plan for the demo and submission assets

Sluice covers the coordination piece, not the whole payment platform.

## Mutation Safety

Live mutation requires:

- `execute: true`
- `yes: true`

That applies to the CLI, SDK, and HTTP API.

