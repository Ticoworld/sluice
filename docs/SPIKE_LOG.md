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

## 2026-06-27 Phase 2 timed reserve-aware probe

Timed 499/99 reserve-aware probe:

- open_channel started: `2026-06-27T03:13:31.2615783Z`
- open_channel succeeded and returned temporary_channel_id:
  `0x4057fa69f08df6f6a7310461df4990f565c043877363033a5a32ecffcf781c6a`
- accept_channel started: `2026-06-27T03:14:17.0549747Z`
- accept_channel errored:
  `No channel with temp id Hash256(0x4057fa69f08df6f6a7310461df4990f565c043877363033a5a32ecffcf781c6a) found`
- accept_channel did not return channel_id.
- A live channel later appeared in list_channels:
  `0xf4e8f98b3b5fd557025df1e36e85e27cf229c0bafce15639833557b880a6a99d`
- ChannelReady observed:
  - node2: `2026-06-27T03:14:44.0484303Z`
  - node1: `2026-06-27T03:14:44.2019332Z`
- final state:
  - node1: ChannelReady
  - node2: ChannelReady

Durations:

- open -> accept attempt: `45.7933964s`
- accept attempt -> first ChannelReady observation: `26.9934556s`
- open -> first ChannelReady observation: `72.7868520s`

Verdict:

- Phase 2 timing passes because ChannelReady was reached on both sides with a measured open-to-ready duration.
- Important anomaly: manual accept_channel returned no-temp-id-found even though the channel still reached ChannelReady. This must be investigated before automating accept behavior.

## 2026-06-27 Accept-path investigation

Source-backed finding:

- `auto_accept_amount: 1000000000` belongs to the UDT config path, not the CKB channel accept path.
- CKB channel auto-accept is controlled separately by Fiber CKB auto-accept settings.
- Official/public node docs describe the working CKB pattern as 499 CKB opener funding with 99 CKB reserve on each side, leaving about 400 CKB usable after reserve.

Interpretation:

- The best explanation for the Phase 2 anomaly is that node2 auto-accepted the CKB channel before manual `accept_channel` was called.
- Manual `accept_channel` then failed because the temp id was already gone.

Sluice decision:

- Primary path: detect CKB auto-accept and track the channel to `ChannelReady`.
- Fallback path: surface manual accept guidance when auto-accept is disabled or not triggered.
- Build readiness logic around `open_channel` followed by channel-state inspection, not around assuming manual accept is always required.

## 2026-06-27 Phase 3A

Phase 3A after-channel payment proof:

- A fresh active Fiber node setup was used for this payment proof after regenerating local test nodes for clean credential recovery.
- node2 created a Fibt invoice for `100000000` shannons, which is `1 CKB`.
- node1 paid the invoice.
- payment hash: `0x1e8b2fa4509064801ca20c0922e5305dcdf5f57b080cc5c843abafc720ed0517`
- `payment get_payment` on node1 returned `Success`.
- `payment list_payments --status Success` included the payment.
- `invoice get_invoice` on node2 showed the invoice as `Paid`.
- No implementation was added.

Verdict:

- Phase 3A passed.
- The ready reserve-aware channel can carry payment.
- This does not yet prove the full before/after demo because the receiver already had a ready channel.

Next phase:

- Phase 3B
- Prove a clean before/after flow:
  1. receiver has no usable inbound path/channel
  2. payment fails or readiness fails
  3. reserve-aware channel coordination creates a usable path
  4. same style payment succeeds after `ChannelReady`

## 2026-06-28 Phase 3B

Clean before/after loop:

- node4 was created as a fresh payer / service opener.
- node3 was used as the receiver.
- node4 RPC/P2P ports: `8257/8258`
- node4 and node3 were connected as peers.
- Before channel setup, both sides had no existing `ChannelReady` channel between them.
- node3 created a 1 CKB Fibt invoice.
- node4 attempted to pay before a usable channel existed.
- before-payment failure string:
  `Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 100000000`
- node4 opened a reserve-aware channel to node3 with opener amount `12000000000` shannons, which is `120 CKB`.
- node3 manually accepted with `9900000000` shannons, which is `99 CKB`.
- open_channel temp id:
  `0x1085f881557f63c4198b9675deefb072b7ed4cb181b1ec720e69f74cf6ae349a`
- accepted channel id:
  `0x03b8c8f33b0e98b8d3a9f19a6012d837299199f4b6ed765940ad38a7aa1100c9`
- node4 channel state reached `ChannelReady`.
- node3 channel state reached `ChannelReady`.
- after-channel payment succeeded.
- `payment get_payment` returned `Success`.
- node3 `invoice get_invoice` showed `Paid`.
- No implementation was added.

Key learning:

- 499 CKB is not required for this controlled manual-accept proof.
- 120 CKB opener funding plus 99 CKB receiver funding was enough to create usable liquidity for a 1 CKB payment.
- Sluice should calculate minimum viable reserve-aware channel amounts instead of blindly using the public-node 499 CKB pattern.
- Sluice must distinguish total wallet balance from spendable funding capacity, because node1 had headline balance but failed funding tx construction due to spendable-cell constraints.
- node4 was used as the clean opener after node1 showed opener-side spendable-capacity issues.

Verdict:

- Phase 3B passed.
- The full before/after proof is now complete.
- Cat 3 remains confirmed.
- The product implementation can begin after the docs commit.

## 2026-07-03 Phase 4

Typed Fiber RPC client foundation:

- Added `FiberRpcClient` (`src/rpc/client.ts`) wrapping `node_info`, `list_peers`, and `list_channels` over JSON-RPC 2.0, with zod-validated response shapes (`src/rpc/types.ts`).
- Added named node config (`src/config.ts`) for `node3` (receiver, `http://127.0.0.1:8247`) and `node4` (service opener, `http://127.0.0.1:8257`), overridable via `SLUICE_<NODE>_RPC_URL` env vars, no secrets involved.
- Added a CLI (`src/cli.ts`, wired through `src/index.ts`) with `node-info <node>`, `peers <node>`, and `channels <node>` commands.
- Tests use a mocked `fetch`, not live Fiber nodes: `npx vitest run` passed 9/9.
- Live smoke test against node3/node4 passed for `node-info`, `peers`, and `channels` on both nodes.

Next phase:

- Phase 5, reserve-aware channel requirement calculation, building on this typed client.

## 2026-07-03 Phase 5

Reserve-aware quote engine:

- Implemented a pure reserve-aware quote engine with exact CKB/shannon conversion helpers.
- Added the default accept-side reserve of `9900000000` shannons, which is `99 CKB`.
- Added quote calculation for a target payment amount and exposed it through the CLI.
- Added `quote --amount-ckb 1` and `quote --amount-shannons 100000000` support.
- For the 1 CKB proof case, the quote returns:
  - target payment: `100000000` shannons, `1 CKB`
  - receiver reserve required: `9900000000` shannons, `99 CKB`
  - receiver accept funding: `9900000000` shannons, `99 CKB`
  - fee/headroom: `2000000000` shannons, `20 CKB`
  - minimum opener funding: `12000000000` shannons, `120 CKB`
  - estimated usable liquidity: `2100000000` shannons, `21 CKB`

Validation:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed for 3 files and 15 tests.
- `npx tsx src/index.ts quote --amount-ckb 1` passed.
- `npx tsx src/index.ts quote --amount-shannons 100000000` passed.

Limitations:

- Phase 5 does not open channels, send payments, or call live Fiber nodes.
- Quote policy is conservative and testnet-oriented.
- Production fee policy, dynamic cell selection, and real LSP pricing remain future work.

Next phase:

- Phase 6, payment readiness checking.

## 2026-07-03 Phase 6

Readiness checker:

- Implemented a read-only payment readiness checker that inspects service-node info, peers, and channels before any channel coordination happens.
- Added conservative parsing for live Fiber channel state and liquidity fields so the checker returns `unknown` instead of faking liquidity when the field shape is unclear.
- Added a CLI command: `readiness --service node4 --receiver-pubkey <pubkey> --amount-ckb 1`.
- The checker uses the Phase 5 reserve-aware quote engine to recommend the minimum viable channel plan.

Validation:

- `npx tsc --noEmit` passed.
- `npx vitest run` passed for 4 files and 20 tests.
- Live smoke call against node4/node3 passed with no crash.
- Live readiness output for the Phase 6 proof case returned:
  - `receiver_reachable: true`
  - `peer_connected: false`
  - `channel_ready: true`
  - `outbound_liquidity_sufficient: true`
  - `readiness_status: ready`
  - reason: payment is ready because a ChannelReady path exists and outbound liquidity covers the target payment
- Live channel liquidity was parsed from the Fiber response as a clearly-present hex balance field, not guessed.

Limitations:

- Phase 6 is still read-only.
- It does not open channels, send payments, or create invoices.
- It does not build a dashboard or database.

Next phase:

- Phase 7, reserve-aware channel coordination.
