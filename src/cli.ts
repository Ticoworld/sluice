import { Command } from "commander";
import { buildReserveAwareQuote, formatReserveAwareQuote } from "./core/quote.js";
import { ckbToShannons, parseShannons } from "./core/reserve.js";
import { FiberRpcClient } from "./rpc/client.js";
import { loadNodeConfig } from "./config.js";

function clientFor(name: string): FiberRpcClient {
  const config = loadNodeConfig(name);
  return new FiberRpcClient({ url: config.rpcUrl });
}

export function buildCli(): Command {
  const program = new Command();

  program
    .name("sluice")
    .description("Sluice: reserve-aware JIT inbound liquidity primitive for Fiber receivers");

  program
    .command("node-info <node>")
    .description("Show node_info for a configured node (e.g. node3, node4)")
    .action(async (node: string) => {
      const info = await clientFor(node).nodeInfo();
      console.log(JSON.stringify(info, null, 2));
    });

  program
    .command("peers <node>")
    .description("Show list_peers for a configured node")
    .action(async (node: string) => {
      const result = await clientFor(node).listPeers();
      console.log(JSON.stringify(result, null, 2));
    });

  program
    .command("channels <node>")
    .description("Show list_channels for a configured node")
    .option("--include-closed", "include closed channels")
    .option("--only-pending", "only show pending channels")
    .option("--pubkey <pubkey>", "filter by counterparty pubkey")
    .action(async (node: string, options: { includeClosed?: boolean; onlyPending?: boolean; pubkey?: string }) => {
      const result = await clientFor(node).listChannels({
        include_closed: options.includeClosed,
        only_pending: options.onlyPending,
        pubkey: options.pubkey,
      });
      console.log(JSON.stringify(result, null, 2));
    });

  program
    .command("quote")
    .description("Calculate a reserve-aware channel quote for a target payment")
    .option("--amount-ckb <amount>", "target payment amount in CKB")
    .option("--amount-shannons <amount>", "target payment amount in shannons")
    .action((options: { amountCkb?: string; amountShannons?: string }) => {
      const hasCkb = options.amountCkb !== undefined;
      const hasShannons = options.amountShannons !== undefined;

      if (hasCkb === hasShannons) {
        program.error("Provide exactly one of --amount-ckb or --amount-shannons.");
      }

      const targetPaymentShannons = hasCkb
        ? ckbToShannons(options.amountCkb as string)
        : parseShannons(options.amountShannons as string);

      const quote = buildReserveAwareQuote({ targetPaymentShannons });
      console.log(JSON.stringify(formatReserveAwareQuote(quote), null, 2));
    });

  return program;
}
