# Sluice Submission

## Project Summary

Sluice is a scoped Just-In-Time inbound liquidity service for Fiber Network. It helps a receiver move from "payment cannot route" to a reserve-aware channel-ready state and then to a successful payment.

## Selected Category

Merchant, Liquidity, LSP, and Multi-Asset Infrastructure

## Team Members

Timothy Orichi

## Repo

<your public GitHub repo link>

## Hosted Demo

<your deployed static demo link>

## Video

<your YouTube/Loom/Drive video link>

## Final Submission Checklist

- Team members: Timothy Orichi
- Repository link: <your public GitHub repo link>
- Hosted demo link: <your deployed static demo link>
- Video link: <your YouTube/Loom/Drive video link>
- Technical breakdown: [TECHNICAL_BREAKDOWN.md](TECHNICAL_BREAKDOWN.md)
- AI allowance claim: yes

## Publication Status

- Local proof: complete
- Static demo: ready
- Hosted deployment: pending
- Final submission links: pending

## Technical Summary

- CLI for operators and local proof runs
- SDK for reusable developer integration
- HTTP API for external systems
- quote engine for reserve-aware sizing
- readiness checker for preflight state
- coordinator for inbound channel preparation
- proof runner for before/after payment verification

## Infrastructure Gap Addressed

Fiber builders can hit a real operational blocker before payment works:

- the receiver is not ready yet
- the receiver-side reserve matters
- the opener funding amount must leave enough spendable liquidity after reserve and fees
- readiness and payment success need to be observable, not guessed

Sluice turns that blocker into a documented, reusable workflow.

## What Is Fully Working

- reserve-aware quote calculations
- readiness checks
- dry-run and live prepare/proof flows
- SDK surface
- HTTP surface
- static integration examples
- recorded live before/after proof

## What Is Local-Only

- live Fiber execution
- channel opening and acceptance
- payment proof mutation
- node configuration and local RPC URLs

## What Is Not Production-Ready

- dynamic production pricing
- persistent job tracking
- hosted operator UI
- production key management
- full multi-asset policy modeling

## Future Roadmap

See [ROADMAP.md](ROADMAP.md).

## AI Allowance Claim

AI assistance was used for research, planning, code review, documentation drafting, and debugging support. All live Fiber tests, verification steps, commit gates, and submission decisions were human-directed and manually reviewed. AI usage allowance claim: yes.
