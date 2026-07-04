# Auto-Accept Finding

Date: 2026-07-04

## Summary

Fiber CKB auto-accept did not prove reliable enough to replace the manual accept path in this local test setup.

The stable, proven behavior remains:

- open channel from the service node
- observe the receiver pending channel
- manually call `accept_channel`
- wait for the channel to advance toward `ChannelReady`

## Test Setup

- Service/opener: `node4`
- Disabled receiver: `node10`
  - RPC: `8317`
  - P2P: `8318`
  - `auto_accept_channel_ckb_funding_amount: 0x0`
  - `open_channel_auto_accept_min_ckb_funding_amount: 0x2540be400`
- Enabled receiver: `node11`
  - RPC: `8327`
  - P2P: `8328`
  - `auto_accept_channel_ckb_funding_amount: 0x2540be400`
  - `open_channel_auto_accept_min_ckb_funding_amount: 0x2540be400`
- Opener amount used for both tests: `12000000000` shannons, `120 CKB`
- Receiver accept amount used for both tests: `9900000000` shannons, `99 CKB`

## Disabled Receiver Result

- `open_channel` from node4 to node10 returned temporary channel id `0x847c9ab2226a95775a5ab5883188f79bdc2be1b65d3f4b630953cf8ab431350a`
- `channel list_channels --only-pending true` on node10 showed the pending inbound channel
- `channel list_channels` on node10 did not show the pending channel before manual accept
- `accept_channel` on node10 succeeded and returned channel id `0x9595eb599302441a5eec5846733d8ff105fca16a8dd7599490eb27a2d373ce9e`

## Enabled Receiver Result

- `open_channel` from node4 to node11 returned temporary channel id `0x5e92407ee2a6571134de888752b405ce0d233af29b5ceeb0d614848c981379e9`
- `channel list_channels --only-pending true` on node11 showed the pending inbound channel
- The pending temp id did not disappear during the observation window
- `accept_channel` on node11 remained valid and succeeded, returning channel id `0x2964613d19a612a210c10257d3d64920f34e6d1bedf15408d19ad0cbbf4a29e7`
- Auto-accept did not clear the need for manual accept in this test

## Finding

- Auto-accept should not be treated as the only or default path for Sluice.
- Manual accept is the stable proven path.
- The SDK should expose explicit modes:
  - `manual`
  - `auto`
  - `detect`
- Recommended default: `detect`, with a manual fallback when auto-accept is not clearly observed.

## Practical Implication

Sluice should detect the receiver state and support the manual path as the primary safe behavior. Auto-accept can be supported as an optimization, but it should not be assumed to happen reliably in every local Fiber setup.
