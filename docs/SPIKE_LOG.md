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
