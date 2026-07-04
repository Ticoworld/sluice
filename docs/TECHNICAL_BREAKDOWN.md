# Technical Breakdown

## Problem

A receiver cannot always receive a Fiber payment immediately. The obstacle is not just routing. It can also be reserve-aware channel preparation, outbound liquidity, and readiness state.

## Architecture

Sluice is built in layers:

1. CLI for local operators
2. SDK for importable developer use
3. HTTP API for external integrations
4. Core modules for quote, readiness, coordinator, and proof flows

## CLI

The CLI is the operator surface.

It provides:

- `quote`
- `readiness`
- `prepare-inbound`
- `prove-payment`
- inspection helpers such as `node-info`, `peers`, and `channels`

## SDK

The SDK is the reusable developer primitive.

It exposes:

- `quote()`
- `checkReadiness()`
- `prepareInbound()`
- `provePayment()`

The SDK defaults to dry-run behavior and requires explicit confirmation for live mutation.

## HTTP API

The HTTP API wraps the SDK for external systems.

Endpoints:

- `GET /health`
- `POST /v1/quote`
- `POST /v1/readiness`
- `POST /v1/prepare`
- `POST /v1/prove-payment`

## Quote Engine

The quote engine is pure and integer-safe.

It calculates:

- target payment
- receiver reserve requirement
- receiver accept funding
- opener funding
- estimated usable liquidity

## Readiness Checker

The readiness checker reads live Fiber state and answers:

- is the receiver reachable
- is the peer connected
- does a ChannelReady path exist
- is outbound liquidity sufficient
- what action is needed next

## Coordinator

The coordinator plans or executes reserve-aware inbound channel preparation.

It supports:

- dry-run planning
- explicit execute mode
- detect/manual/auto accept modes
- ChannelReady polling
- timeout and failure classification

## Proof Runner

The proof runner ties the whole flow together.

It:

- creates the invoice
- proves the before failure
- prepares inbound liquidity
- retries payment after `ChannelReady`
- verifies payment `Success`
- verifies receiver invoice `Paid`

## Safety Model

- dry-run is the default
- live mutation requires `execute: true` and `yes: true`
- the HTTP layer and SDK both preserve the same guardrail
- examples and hosted demo content are replay or guidance, not live Fiber execution

## Live Proof Summary

The recorded live before/after proof used:

- before failure: `Send payment error: Failed to build route, PathFind error: no path found`
- temporary channel id: `0xee097073bebf5de069088d65de1b0d5f61ff64e21ecb96552ab79ce1104a47463`
- channel id: `0x1125001f2711a1d43aab727937def69c41fd760d7671debf3206fea922f54afd7`
- after payment: `Success`
- invoice status: `Paid`

