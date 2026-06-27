# Sluice Spike Plan

## Core question

Can we make this loop work on Fiber testnet?

1. Payment fails because receiver has no inbound capacity.
2. Sluice opens a channel from service node to receiver.
3. Channel reaches ready state.
4. The same payment succeeds.

## Measurements

- open_channel call time:
- ChannelReady time:
- total confirmation delay:
- payment failure before:
- payment success after:
- errors:

## Decision rule

If the real channel-open-to-payment-success loop works by June 30, continue Category 3.

If it does not work by June 30, switch to Category 2 Route Confidence Engine.
