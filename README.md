# Sluice

Sluice is a scoped Just-In-Time inbound liquidity service for Fiber Network.

The goal is simple:

1. A receiver cannot receive a Fiber payment because they lack inbound capacity.
2. Sluice opens inbound liquidity from a service node.
3. The same payment succeeds after the channel becomes ready.

Category: Merchant, Liquidity, LSP, and Multi-Asset Infrastructure.

Status: submission package.

> **Alpha release.** Sluice is hackathon-stage Fiber infrastructure tooling. The SDK, CLI, and HTTP API are usable for local integration and testing, but this is not production LSP infrastructure yet. See [docs/REAL_VS_SIMULATED.md](docs/REAL_VS_SIMULATED.md) for exactly what is real, replayed, and out of scope.

## Install

```bash
npm install @ticoworld/sluice@alpha
```

```ts
import { Sluice } from "@ticoworld/sluice";

const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257" });
const quote = sluice.quote({ amountCkb: "1" });
```

See [docs/SDK.md](docs/SDK.md) for the full SDK surface, and [docs/HTTP_API.md](docs/HTTP_API.md) for the HTTP API if you'd rather integrate from outside Node.js.

## Verify the Live Proof Locally

```powershell
cp .env.demo.example .env.demo
npm run demo
```

This runs the same before/after payment proof described in [docs/REAL_VS_SIMULATED.md](docs/REAL_VS_SIMULATED.md) against local Fiber nodes. For the maintainer-only commands and the local proof runbook, see [docs/DEMO.md](docs/DEMO.md).

## Repo Map

- [docs/SOURCES.md](docs/SOURCES.md): official source list and project direction references.
- [docs/AI_OPERATOR_RULES.md](docs/AI_OPERATOR_RULES.md): working rules for AI agents in this repo.
- [docs/WIN_GATES.md](docs/WIN_GATES.md): phase pass/fail criteria for the project.
- [docs/SPIKE.md](docs/SPIKE.md): spike question, measurement plan, and decision rule.
- [docs/REAL_VS_SIMULATED.md](docs/REAL_VS_SIMULATED.md): what is real, what is simulated, and what is out of scope.
- [docs/DECISION_LOG.md](docs/DECISION_LOG.md): dated scope and direction decisions.
- [docs/SPIKE_LOG.md](docs/SPIKE_LOG.md): spike notes and measurement log.
- [docs/SDK.md](docs/SDK.md): public SDK usage, safety model, and examples.
- [docs/HTTP_API.md](docs/HTTP_API.md): HTTP service API, endpoint list, safety model, and curl examples.

## For Builders

- [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md): when to use CLI, SDK, or HTTP and how the safety model works.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): recommended operator, merchant, and wallet deployment patterns.
- [docs/DEMO.md](docs/DEMO.md): public `npm run demo` flow, dry-run proof, and local proof runbook.
- [docs/FIBER_RESERVE_FINDING.md](docs/FIBER_RESERVE_FINDING.md): the reserve-aware Fiber finding that shaped the Sluice quote and prepare flow.
- [docs/SDK.md](docs/SDK.md): SDK usage from source or as an installed package for ESM, TypeScript, and CommonJS consumers.
- [examples/sdk/quote.ts](examples/sdk/quote.ts): SDK quote example for the 1 CKB proof case.
- [examples/sdk/prepare-dry-run.ts](examples/sdk/prepare-dry-run.ts): SDK dry-run prepare example with detect mode.
- [examples/merchant-checkout/checkout-flow.ts](examples/merchant-checkout/checkout-flow.ts): concrete merchant retry flow that calls Sluice before retrying payment.
- [examples/wallet-backend/receiver-readiness.ts](examples/wallet-backend/receiver-readiness.ts): wallet backend readiness check before showing a receive invoice as payable.
- [examples/http/curl.md](examples/http/curl.md): curl examples for the HTTP API.

## Infrastructure Readiness

- [src/cli.ts](src/cli.ts): CLI entrypoint with `doctor`, quote, readiness, prepare, and proof commands.
- [docs/openapi.yaml](docs/openapi.yaml): OpenAPI contract for the HTTP surface.
- [Dockerfile](Dockerfile): container recipe for the Sluice HTTP service on port 8787.
- [.env.example](.env.example): sample local node URL environment values without secrets.
- [.github/workflows/ci.yml](.github/workflows/ci.yml): build, typecheck, and test CI workflow.
- [scripts/package-smoke.mjs](scripts/package-smoke.mjs): npm pack and external consumer smoke test.

## Submission Package

- [docs/DEMO.md](docs/DEMO.md): one-page demo summary, local runbook, and recorded proof replay notes.
- [docs/SUBMISSION.md](docs/SUBMISSION.md): judge-facing submission summary and placeholders.
- [docs/TECHNICAL_BREAKDOWN.md](docs/TECHNICAL_BREAKDOWN.md): architecture and component breakdown.
- [docs/ROADMAP.md](docs/ROADMAP.md): short-, medium-, and long-term roadmap.
- [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md): visual shot list for the ~90-second demo video.
- [docs/AI_USAGE.md](docs/AI_USAGE.md): AI usage and human verification statement.
- [demo/README.md](demo/README.md): static hosted-demo-ready folder overview.
- [demo/index.html](demo/index.html): replay page for the recorded Phase 8B proof.
- [demo/proof-data.json](demo/proof-data.json): replay data used by the static hosted demo.
