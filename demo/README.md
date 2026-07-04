# Sluice Demo Folder

This folder is a static, hosted-demo-ready replay of the recorded Phase 8B proof.

Contents:

- `index.html`: static demo page
- `proof-data.json`: recorded proof and quote data

## What It Is

- a replay of the recorded live local proof
- a way to explain Sluice quickly to judges and builders
- a static page that can be hosted anywhere

## What It Is Not

- a full dashboard
- a live Fiber executor
- a payment app

The local runbook in `docs/DEMO.md` is what performs the live execution.

## Static Deploy Notes

- Host the repository root or mirror the `docs/` folder alongside this demo folder.
- The demo page uses relative links back to `docs/SDK.md`, `docs/HTTP_API.md`, `docs/INTEGRATION_GUIDE.md`, and `docs/FIBER_RESERVE_FINDING.md`.
- The replay data lives in `proof-data.json` and is loaded by `index.html` at runtime.
