# Spike Log

## 2026-06-27

Workspace opened in VS Code.

Next task:
Create source map, AI operator rules, and win gates before asking Claude/Codex to implement anything.

Phase 0 reviewed and passed based on the current repository docs.

## 2026-06-27 Phase 1

Fresh node directories used:

- `C:\Users\timot\Desktop\2026\CKB\fiber-local-node\sluice-node1`
- `C:\Users\timot\Desktop\2026\CKB\fiber-local-node\sluice-node2`

Fiber version:

- `fnn Fiber v0.8.1 (b560023 2026-04-16)`

Node ports:

- node1 RPC/P2P: `8227/8228`
- node2 RPC/P2P: `8237/8238`

Evidence summary:

- node1 start: success
- node2 start: success
- node1 node_info: success through `fnn-cli`
- node2 node_info: success through `fnn-cli`
- node2 pubkey captured: yes
- connect_peer: success
- list_peers node1 shows node2: yes
- list_peers node2 shows node1: yes

Phase 1 verdict: passed.

Next phase:

- Phase 2, channel timing spike
- Measure `open_channel` to `ChannelReady`

## 2026-06-27 Phase 2

Zero-funding acceptor probe:

- node1 opened a 100 CKB attempt with `10000000000` shannons.
- node2 attempted `accept_channel --funding-amount 0`.
- runtime rejected it with `Invalid parameter: The funding amount (0) should be greater than or equal to 9900000000`.
- the same failure occurred again without `--one-way true`.
- the old pending attempts were cleaned up and marked closed or funding aborted.

Reserve-aware probe:

- node1 opened a fresh channel with `49900000000` shannons, which is 499 CKB.
- node2 accepted with `9900000000` shannons, which is 99 CKB.
- the channel progressed from `NegotiatingFunding` to `ChannelReady` on both sides.
- exact open-to-ready timing was not captured in this run.

Timing honesty:

- `ChannelReady` was observed, but exact open-to-ready timing was not captured in this run.
- A second timed probe is required before Phase 2 is fully closed.

Verdict:

- Phase 2 functional proof passed.
- Phase 2 timing measurement remains pending.

## Measurements

### Channel open timing

Attempt 1:
- service node:
- receiver node:
- open_channel called at:
- temporary_channel_id:
- ChannelReady at:
- total time:
- result:
- errors:

Attempt 2:
- service node:
- receiver node:
- open_channel called at:
- temporary_channel_id:
- ChannelReady at:
- total time:
- result:
- errors:

Attempt 3:
- service node:
- receiver node:
- open_channel called at:
- temporary_channel_id:
- ChannelReady at:
- total time:
- result:
- errors:
