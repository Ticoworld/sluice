# Sluice Integration Guide

Sluice is exposed through three surfaces:

- CLI for operators and local proof runs
- SDK for in-process developer integration
- HTTP API for external systems and services

## When to Use the CLI

Use the CLI when you are:

- running the local proof flow by hand
- inspecting node readiness or channel state
- debugging a single service node and receiver pair

Useful commands:

- `quote`
- `doctor`
- `readiness`
- `prepare-inbound`
- `prove-payment`
- `node-info`
- `peers`
- `channels`

## When to Use the SDK

Use the SDK when you want Sluice inside your own Node.js or TypeScript code.

The SDK is the smallest reusable developer primitive:

- `quote()`
- `checkReadiness()`
- `prepareInbound()`
- `provePayment()`

Recommended defaults:

- `acceptMode: "detect"`
- dry-run unless live mutation is explicitly requested
- `execute: true` only when paired with `yes: true`

## When to Use the HTTP API

Use the HTTP API when you want to integrate from outside the process:

- wallet frontends
- merchant backends
- hosted demos
- external service orchestration

The HTTP layer wraps the SDK and exposes:

- `GET /health`
- `POST /v1/quote`
- `POST /v1/readiness`
- `POST /v1/prepare`
- `POST /v1/prove-payment`

## Wallet Flow

A wallet or receiver UI can check readiness before it shows payment confidence.

Pattern:

1. call `readiness`
2. inspect whether a ChannelReady path exists
3. if not ready, show a reserve-aware explanation
4. if ready, allow the user to continue with more confidence

## Merchant Backend Flow

A merchant backend can use Sluice before retrying payment.

Pattern:

1. customer payment attempt fails because the receiver is not ready
2. backend calls `prepare`
3. Sluice quotes and, if requested, coordinates the reserve-aware inbound channel
4. backend retries the payment after `ChannelReady`

## Service Operator Flow

An operator or LSP-style service can run Sluice around a service Fiber node:

1. keep the service node available
2. run readiness checks against a receiver
3. prepare the reserve-aware inbound path only when needed
4. retry the payment proof after the channel becomes ready

## Safety Model

- Dry-run is the default.
- Live mutation requires explicit confirmation.
- `execute: true` must be paired with `yes: true`.
- `acceptMode` defaults to `detect`.
- `manual` is the stable fallback.
- `auto` is exposed but treated as local-behavior-dependent.

## Related Docs

- [SDK guide](SDK.md)
- [HTTP API](HTTP_API.md)
- [Reserve finding](FIBER_RESERVE_FINDING.md)
- [SDK quote example](../examples/sdk/quote.ts)
- [SDK prepare example](../examples/sdk/prepare-dry-run.ts)
- [HTTP curl examples](../examples/http/curl.md)
- [Merchant checkout flow example](../examples/merchant-checkout/checkout-flow.ts)
- [Deployment guide](DEPLOYMENT.md)
- [OpenAPI spec](openapi.yaml)
