import { Sluice } from "../../src/sdk/index.js";

async function main(): Promise<void> {
  const sluice = new Sluice({
    serviceRpcUrl: "http://127.0.0.1:8257",
  });

  const receiverRpcUrl = "http://127.0.0.1:8267";
  const amountCkb = "1";

  const readiness = await sluice.checkReadiness({
    receiverRpcUrl,
    amountCkb,
  });

  console.log(`Readiness status: ${readiness.readiness_status}`);
  console.log(readiness.reason);

  if (readiness.readiness_status === "ready") {
    console.log("Safe to show this invoice as payable now.");
    return;
  }

  console.log("Not ready yet. Requesting a reserve-aware prepare plan (dry run)...");

  const prepare = await sluice.prepareInbound({
    receiverRpcUrl,
    amountCkb,
    acceptMode: "detect",
    dryRun: true,
  });

  console.log("Sluice prepare plan:");
  console.log(JSON.stringify(prepare.plan.planned_steps, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
