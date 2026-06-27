# Win Gates

Sluice does not pass because code exists. It passes only when the phase gate has evidence.

## Phase 0: Repo and context

Pass only if:
- repo has source docs
- AI operator rules exist
- decision log exists
- spike log exists
- project scope is Cat 3 primary, Cat 2 fallback

## Phase 1: Fiber node setup

Pass only if:
- at least two Fiber nodes run locally or on testnet
- node_info works for each node
- peers can connect
- list_peers confirms connection

## Phase 2: Channel timing spike

Pass only if:
- open_channel is called from service node to receiver
- temporary channel id is captured
- list_channels is polled
- time from open_channel to ChannelReady is measured
- result is written into docs/SPIKE_LOG.md

## Phase 3: Before/after payment loop

Pass only if:
- before state shows receiver cannot receive the payment
- Sluice opens or prepares inbound liquidity
- after state shows the same receiver can receive
- payment evidence is captured
- README can reproduce the loop

## June 30 decision

If Phase 3 is real by June 30:
Continue Category 3.

If Phase 3 is not real by June 30:
Switch to Category 2 Route Confidence Engine.
