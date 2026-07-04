# Video Script

## 0-10 seconds

"Fiber receivers can fail to receive because inbound liquidity is missing. Sluice solves that by preparing reserve-aware inbound liquidity on demand."

## 10-25 seconds

"Sluice is a scoped Just-In-Time inbound liquidity service for Fiber Network. It gives builders a CLI, SDK, and HTTP API for the same proven flow."

## 25-45 seconds

"Before Sluice, the payment failed with no route: `Send payment error: Failed to build route, PathFind error: no path found`."

## 45-65 seconds

"Sluice quotes the reserve-aware path, opens the channel, detects the receiver pending entry, accepts the channel, and waits for `ChannelReady`."

## 65-80 seconds

"After Sluice, the retry succeeds. The recorded proof shows `Success` on payment and `Paid` on the receiver invoice."

## 80-90 seconds

"Builders can use the SDK in code, the HTTP API from external systems, or the CLI for local operators. Sluice turns a Fiber receive blocker into a reusable integration primitive."

