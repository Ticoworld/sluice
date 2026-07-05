import { Sluice } from "../../src/sdk/index.js";

type PaymentAttempt = {
  ok: boolean;
  error?: string;
};

async function attemptMerchantPayment(): Promise<PaymentAttempt> {
  return {
    ok: false,
    error: "Send payment error: Failed to build route, PathFind error: no path found",
  };
}

async function retryMerchantPayment(): Promise<PaymentAttempt> {
  return {
    ok: true,
  };
}

async function main(): Promise<void> {
  const sluice = new Sluice({
    serviceRpcUrl: "http://127.0.0.1:8257",
  });

  const firstAttempt = await attemptMerchantPayment();
  if (firstAttempt.ok) {
    console.log("Payment succeeded on the first try.");
    return;
  }

  console.log(firstAttempt.error);

  const prepare = await sluice.prepareInbound({
    receiverRpcUrl: "http://127.0.0.1:8267",
    amountCkb: "1",
    acceptMode: "detect",
    dryRun: true,
  });

  console.log("Sluice prepare plan:");
  console.log(JSON.stringify(prepare.plan.planned_steps, null, 2));

  const retry = await retryMerchantPayment();
  if (retry.ok) {
    console.log("Payment succeeded after ChannelReady.");
    return;
  }

  console.log("Payment still failed after prepare.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

