# Sluice Source Map

These are the official sources AI agents must use before making technical claims.

## Hackathon

Nervos Talk announcement:
https://talk.nervos.org/t/gone-in-60ms-fiber-network-infrastructure-hackathon-announcement/10418

CKBoost campaign:
https://ckboost.netlify.app/

Key rules:
- Infrastructure only, not products built on top.
- Category-based prize allocation.
- Submission must fit one category.
- Category 3 includes LSP service tooling, liquidity quote tools, liquidity dashboards, merchant and multi-asset infrastructure.
- Submissions must state what is real, mocked, simulated, and production-out-of-scope.
- AI is allowed, but purely AI-generated projects score poorly.

## Fiber technical docs

Fiber RPC README:
https://github.com/nervosnetwork/fiber/blob/develop/crates/fiber-lib/src/rpc/README.md

Basic transfer example:
https://www.fiber.world/docs/quick-start/basic-transfer

Important RPC methods for Sluice:
- node_info
- connect_peer
- list_peers
- open_channel
- open_channel_with_external_funding
- submit_signed_funding_tx
- list_channels
- new_invoice
- send_payment
- get_payment
- list_payments
- build_router
- send_payment_with_router

## Project direction

Primary:
Category 3, scoped JIT inbound-liquidity service.

Fallback:
Category 2, route confidence engine.

Primary proof:
A receiver cannot receive a payment because inbound liquidity is missing.
Sluice opens inbound liquidity from a service node.
The same payment succeeds after the channel becomes ready.
