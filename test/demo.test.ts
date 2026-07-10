import { describe, expect, it, vi } from "vitest";
import { formatDemoError, readDemoConfig, runDemoDoctor, runDemoDry, runDemoProof, runPublicDemo } from "../scripts/demo-support.js";

function makeEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return {
    SLUICE_DEMO_SERVICE: "node4",
    SLUICE_DEMO_RECEIVER: "node9",
    SLUICE_DEMO_AMOUNT_CKB: "1",
    SLUICE_DEMO_EXECUTE: "false",
    SLUICE_DEMO_YES: "false",
    SLUICE_NODE9_RPC_URL: "http://127.0.0.1:8307",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe("demo harness", () => {
  it("parses demo env config", () => {
    const config = readDemoConfig(makeEnv({
      SLUICE_DEMO_AMOUNT_CKB: "2.5",
      SLUICE_DEMO_EXECUTE: "true",
      SLUICE_DEMO_YES: "true",
    }));

    expect(config.serviceNode).toBe("node4");
    expect(config.receiverNode).toBe("node9");
    expect(config.amountCkb).toBe("2.5");
    expect(config.amountShannons).toBe(250_000_000n);
    expect(config.execute).toBe(true);
    expect(config.yes).toBe(true);
  });

  it("refuses demo proof unless execute and yes are enabled", async () => {
    await expect(
      runDemoProof(
        makeEnv({
          SLUICE_DEMO_EXECUTE: "false",
          SLUICE_DEMO_YES: "false",
        }),
        [],
        vi.fn(),
      ),
    ).rejects.toThrow(/Refusing to run demo proof/i);
  });

  it("runs the doctor path without requiring live mutation", async () => {
    const runner = vi.fn().mockResolvedValue({
      mode: "read-only",
      service_node: "node4",
      receiver_node: "node9",
      accept_mode: "detect",
      quote: {
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
        receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
        fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
        minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
        explanation: "quoted",
      },
      safety: {
        read_only: true,
        dry_run_default: true,
        execute_allowed: false,
        execute_requires_yes: true,
      },
      service: {
        rpc_reachable: true,
        node_info_available: true,
        pubkey: "02service",
        list_peers_available: true,
        list_channels_available: true,
      },
      receiver: {
        rpc_reachable: true,
        node_info_available: true,
        pubkey: "02receiver",
        list_channels_available: true,
      },
      rpc_methods: {
        service: { node_info: true, list_peers: true, list_channels: true },
        receiver: { node_info: true, list_channels: true },
      },
    } as never);

    await runDemoDoctor(makeEnv({}), runner as never);

    expect(runner).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        serviceNode: "node4",
        receiverNode: "node9",
        targetPaymentShannons: 100_000_000n,
      }),
    );
  });

  it("runs the dry demo without live mutation", async () => {
    const runner = vi.fn().mockResolvedValue({
      mode: "dry-run",
      plan: {
        service_node: "node4",
        receiver_node: "node9",
        receiver_pubkey: "02receiver",
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        quote: {
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
          minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
          explanation: "quoted",
        },
        invoice_currency: "Fibt",
        invoice_description: "phase 8 before/after payment proof",
        readiness_before: {
          service_node: "node4",
          receiver_pubkey: "02receiver",
          service_node_pubkey: "02service",
          receiver_reachable: false,
          peer_connected: false,
          channel_ready: false,
          outbound_liquidity_sufficient: false,
          readiness_status: "not_ready",
          reason: "not ready",
          recommended_quote: {
            target_payment: { shannons: "100000000", ckb: "1 CKB" },
            receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
            receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
            fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
            minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
            explanation: "quoted",
          },
        },
        channel_plan: {
          service_node: "node4",
          receiver_node: "node9",
          receiver_pubkey: "02receiver",
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          readiness_satisfied: false,
          accept_mode: "detect",
          planned_steps: ["open channel"],
          readiness: {
            service_node: "node4",
            receiver_pubkey: "02receiver",
            service_node_pubkey: "02service",
            receiver_reachable: false,
            peer_connected: false,
            channel_ready: false,
            outbound_liquidity_sufficient: false,
            readiness_status: "not_ready",
            reason: "not ready",
            recommended_quote: {
              target_payment: { shannons: "100000000", ckb: "1 CKB" },
              receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
              receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
              fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
              minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
              explanation: "quoted",
            },
          },
        },
        planned_steps: ["open channel"],
      },
    } as never);

    await runDemoDry(makeEnv({}), runner as never);

    expect(runner).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        serviceNode: "node4",
        receiverNode: "node9",
        targetPaymentShannons: 100_000_000n,
      }),
      expect.objectContaining({
        execute: false,
      }),
    );
  });

  it("runs the public demo in safe mode without live proof", async () => {
    const doctor = vi.fn().mockResolvedValue({
      mode: "read-only",
      service_node: "node4",
      receiver_node: "node9",
      accept_mode: "detect",
      quote: {
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
        receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
        fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
        minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
        explanation: "quoted",
      },
      safety: {
        read_only: true,
        dry_run_default: true,
        execute_allowed: false,
        execute_requires_yes: true,
      },
      service: {
        rpc_reachable: true,
        node_info_available: true,
        pubkey: "02service",
        list_peers_available: true,
        list_channels_available: true,
      },
      receiver: {
        rpc_reachable: true,
        node_info_available: true,
        pubkey: "02receiver",
        list_channels_available: true,
      },
      rpc_methods: {
        service: { node_info: true, list_peers: true, list_channels: true },
        receiver: { node_info: true, list_channels: true },
      },
    } as never);
    const dry = vi.fn().mockResolvedValue({
      mode: "dry-run",
      plan: {
        service_node: "node4",
        receiver_node: "node9",
        receiver_pubkey: "02receiver",
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        quote: {
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
          minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
          explanation: "quoted",
        },
        invoice_currency: "Fibt",
        invoice_description: "phase 8 before/after payment proof",
        readiness_before: {
          service_node: "node4",
          receiver_pubkey: "02receiver",
          service_node_pubkey: "02service",
          receiver_reachable: false,
          peer_connected: false,
          channel_ready: false,
          outbound_liquidity_sufficient: false,
          readiness_status: "not_ready",
          reason: "not ready",
          recommended_quote: {
            target_payment: { shannons: "100000000", ckb: "1 CKB" },
            receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
            receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
            fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
            minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
            explanation: "quoted",
          },
        },
        channel_plan: {
          service_node: "node4",
          receiver_node: "node9",
          receiver_pubkey: "02receiver",
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          readiness_satisfied: false,
          accept_mode: "detect",
          planned_steps: ["open channel"],
          readiness: {
            service_node: "node4",
            receiver_pubkey: "02receiver",
            service_node_pubkey: "02service",
            receiver_reachable: false,
            peer_connected: false,
            channel_ready: false,
            outbound_liquidity_sufficient: false,
            readiness_status: "not_ready",
            reason: "not ready",
            recommended_quote: {
              target_payment: { shannons: "100000000", ckb: "1 CKB" },
              receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
              receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
              fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
              minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
              explanation: "quoted",
            },
          },
        },
        planned_steps: ["open channel"],
      },
    } as never);
    const proof = vi.fn();

    const story = await runPublicDemo(makeEnv({}), [], {
      doctor: doctor as never,
      dry: dry as never,
      proof: proof as never,
    });

    expect(story.liveExecutionEnabled).toBe(false);
    expect(doctor).toHaveBeenCalledTimes(1);
    expect(dry).toHaveBeenCalledTimes(1);
    expect(proof).not.toHaveBeenCalled();
  });

  it("runs the public demo in live mode only when execute and yes are enabled", async () => {
    const doctor = vi.fn().mockResolvedValue({
      mode: "read-only",
      service_node: "node4",
      receiver_node: "node9",
      accept_mode: "detect",
      quote: {
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
        receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
        fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
        minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
        explanation: "quoted",
      },
      safety: {
        read_only: true,
        dry_run_default: true,
        execute_allowed: false,
        execute_requires_yes: true,
      },
      service: {
        rpc_reachable: true,
        node_info_available: true,
        pubkey: "02service",
        list_peers_available: true,
        list_channels_available: true,
      },
      receiver: {
        rpc_reachable: true,
        node_info_available: true,
        pubkey: "02receiver",
        list_channels_available: true,
      },
      rpc_methods: {
        service: { node_info: true, list_peers: true, list_channels: true },
        receiver: { node_info: true, list_channels: true },
      },
    } as never);
    const proof = vi.fn().mockResolvedValue({
      mode: "execute",
      plan: {
        service_node: "node4",
        receiver_node: "node9",
        receiver_pubkey: "02receiver",
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        quote: {
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
          minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
          explanation: "quoted",
        },
        invoice_currency: "Fibt",
        invoice_description: "phase 8 before/after payment proof",
        readiness_before: {
          service_node: "node4",
          receiver_pubkey: "02receiver",
          service_node_pubkey: "02service",
          receiver_reachable: false,
          peer_connected: false,
          channel_ready: false,
          outbound_liquidity_sufficient: false,
          readiness_status: "not_ready",
          reason: "not ready",
          recommended_quote: {
            target_payment: { shannons: "100000000", ckb: "1 CKB" },
            receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
            receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
            fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
            minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
            explanation: "quoted",
          },
        },
        channel_plan: {
          service_node: "node4",
          receiver_node: "node9",
          receiver_pubkey: "02receiver",
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          readiness_satisfied: false,
          accept_mode: "detect",
          planned_steps: ["open channel"],
          readiness: {
            service_node: "node4",
            receiver_pubkey: "02receiver",
            service_node_pubkey: "02service",
            receiver_reachable: false,
            peer_connected: false,
            channel_ready: false,
            outbound_liquidity_sufficient: false,
            readiness_status: "not_ready",
            reason: "not ready",
            recommended_quote: {
              target_payment: { shannons: "100000000", ckb: "1 CKB" },
              receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
              receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
              fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
              minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
              explanation: "quoted",
            },
          },
        },
        planned_steps: ["open channel"],
      },
      execution: {
        status: "ready",
        reason: "ready",
        before_payment: {
          attempted: true,
          payment_hash: "0xhash",
          invoice_address: "fibt1demo",
          status: "Failed",
          failed_error: "no path found",
        },
        channel: {
          status: "ready",
          reason: "ChannelReady reached",
          temporary_channel_id: "0xtemp",
          channel_id: "0xchannel",
          manual_accept_attempted: true,
        },
        after_payment: {
          attempted: true,
          payment_hash: "0xhash",
          invoice_address: "fibt1demo",
          status: "Success",
        },
        receiver_invoice_status: "Paid",
        service_payment_status: "Success",
      },
    } as never);

    const story = await runPublicDemo(
      makeEnv({
        SLUICE_DEMO_EXECUTE: "true",
        SLUICE_DEMO_YES: "true",
      }),
      [],
      {
        doctor: doctor as never,
        dry: vi.fn() as never,
        proof: proof as never,
      },
    );

    expect(story.liveExecutionEnabled).toBe(true);
    expect(doctor).toHaveBeenCalledTimes(1);
    expect(proof).toHaveBeenCalledTimes(1);
  });

  it("keeps the public demo in dry mode when execute is enabled without yes", async () => {
    const doctor = vi.fn().mockResolvedValue({
      mode: "read-only",
      service_node: "node4",
      receiver_node: "node9",
      accept_mode: "detect",
      quote: {
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
        receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
        fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
        minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
        explanation: "quoted",
      },
      safety: {
        read_only: true,
        dry_run_default: true,
        execute_allowed: false,
        execute_requires_yes: true,
      },
      service: {
        rpc_reachable: true,
        node_info_available: true,
        pubkey: "02service",
        list_peers_available: true,
        list_channels_available: true,
      },
      receiver: {
        rpc_reachable: true,
        node_info_available: true,
        pubkey: "02receiver",
        list_channels_available: true,
      },
      rpc_methods: {
        service: { node_info: true, list_peers: true, list_channels: true },
        receiver: { node_info: true, list_channels: true },
      },
    } as never);
    const dry = vi.fn().mockResolvedValue({
      mode: "dry-run",
      plan: {
        service_node: "node4",
        receiver_node: "node9",
        receiver_pubkey: "02receiver",
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        quote: {
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
          minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
          explanation: "quoted",
        },
        invoice_currency: "Fibt",
        invoice_description: "phase 8 before/after payment proof",
        readiness_before: {
          service_node: "node4",
          receiver_pubkey: "02receiver",
          service_node_pubkey: "02service",
          receiver_reachable: false,
          peer_connected: false,
          channel_ready: false,
          outbound_liquidity_sufficient: false,
          readiness_status: "not_ready",
          reason: "not ready",
          recommended_quote: {
            target_payment: { shannons: "100000000", ckb: "1 CKB" },
            receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
            receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
            fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
            minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
            explanation: "quoted",
          },
        },
        channel_plan: {
          service_node: "node4",
          receiver_node: "node9",
          receiver_pubkey: "02receiver",
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          readiness_satisfied: false,
          accept_mode: "detect",
          planned_steps: ["open channel"],
          readiness: {
            service_node: "node4",
            receiver_pubkey: "02receiver",
            service_node_pubkey: "02service",
            receiver_reachable: false,
            peer_connected: false,
            channel_ready: false,
            outbound_liquidity_sufficient: false,
            readiness_status: "not_ready",
            reason: "not ready",
            recommended_quote: {
              target_payment: { shannons: "100000000", ckb: "1 CKB" },
              receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
              receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
              fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
              minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
              explanation: "quoted",
            },
          },
        },
        planned_steps: ["open channel"],
      },
    } as never);
    const proof = vi.fn();

    const story = await runPublicDemo(
      makeEnv({
        SLUICE_DEMO_EXECUTE: "true",
        SLUICE_DEMO_YES: "false",
      }),
      [],
      {
        doctor: doctor as never,
        dry: dry as never,
        proof: proof as never,
      },
    );

    expect(story.liveExecutionEnabled).toBe(false);
    expect(doctor).toHaveBeenCalledTimes(1);
    expect(dry).toHaveBeenCalledTimes(1);
    expect(proof).not.toHaveBeenCalled();
  });

  it("formats RPC failures with a human-readable demo message", () => {
    const config = readDemoConfig(makeEnv({}));
    const message = formatDemoError(new Error("fetch failed"), config, makeEnv({}));

    expect(message).toContain("Sluice demo could not reach the configured Fiber RPC endpoint.");
    expect(message).toContain("Service: node4");
    expect(message).toContain("Receiver: node9");
    expect(message).toContain("npm run demo:doctor");
    expect(message).toContain("No live mutation was performed.");
  });

  it("accepts demo proof only when live execution is enabled", async () => {
    const runner = vi.fn().mockResolvedValue({
      mode: "execute",
      plan: {
        service_node: "node4",
        receiver_node: "node9",
        receiver_pubkey: "02receiver",
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        quote: {
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
          minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
          explanation: "quoted",
        },
        invoice_currency: "Fibt",
        invoice_description: "phase 8 before/after payment proof",
        readiness_before: {
          service_node: "node4",
          receiver_pubkey: "02receiver",
          service_node_pubkey: "02service",
          receiver_reachable: false,
          peer_connected: false,
          channel_ready: false,
          outbound_liquidity_sufficient: false,
          readiness_status: "not_ready",
          reason: "not ready",
          recommended_quote: {
            target_payment: { shannons: "100000000", ckb: "1 CKB" },
            receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
            receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
            fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
            minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
            estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
            explanation: "quoted",
          },
        },
        channel_plan: {
          service_node: "node4",
          receiver_node: "node9",
          receiver_pubkey: "02receiver",
          target_payment: { shannons: "100000000", ckb: "1 CKB" },
          opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
          readiness_satisfied: false,
          accept_mode: "detect",
          planned_steps: ["open channel"],
          readiness: {
            service_node: "node4",
            receiver_pubkey: "02receiver",
            service_node_pubkey: "02service",
            receiver_reachable: false,
            peer_connected: false,
            channel_ready: false,
            outbound_liquidity_sufficient: false,
            readiness_status: "not_ready",
            reason: "not ready",
            recommended_quote: {
              target_payment: { shannons: "100000000", ckb: "1 CKB" },
              receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
              receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
              fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
              minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
              estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
              explanation: "quoted",
            },
          },
        },
        planned_steps: ["open channel"],
      },
      execution: {
        status: "ready",
        reason: "ready",
        before_payment: {
          attempted: true,
          payment_hash: "0xhash",
          invoice_address: "fibt1demo",
          status: "Failed",
          failed_error: "no path found",
        },
        channel: {
          status: "ready",
          reason: "ChannelReady reached",
          temporary_channel_id: "0xtemp",
          channel_id: "0xchannel",
          manual_accept_attempted: true,
        },
        after_payment: {
          attempted: true,
          payment_hash: "0xhash",
          invoice_address: "fibt1demo",
          status: "Success",
        },
        receiver_invoice_status: "Paid",
        service_payment_status: "Success",
      },
    } as never);

    await runDemoProof(
      makeEnv({
        SLUICE_DEMO_EXECUTE: "true",
        SLUICE_DEMO_YES: "true",
      }),
      [],
      runner as never,
    );

    expect(runner).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        serviceNode: "node4",
        receiverNode: "node9",
        targetPaymentShannons: 100_000_000n,
      }),
      expect.objectContaining({
        execute: true,
      }),
    );
  });
});
