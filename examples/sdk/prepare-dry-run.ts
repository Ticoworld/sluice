import { Sluice } from "../../src/sdk/index.js";

async function main(): Promise<void> {
  const sluice = new Sluice({
    serviceRpcUrl: "http://127.0.0.1:8257",
  });

  const result = await sluice.prepareInbound({
    receiverRpcUrl: process.env.SLUICE_NODE5_RPC_URL ?? "http://127.0.0.1:8267",
    amountCkb: "1",
    acceptMode: "detect",
    dryRun: true,
  });

  console.log(JSON.stringify(result.plan.planned_steps, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
