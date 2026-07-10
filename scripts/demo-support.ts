import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FiberRpcClient } from "../src/rpc/client.js";
import { loadNodeConfig } from "../src/config.js";
import { ckbToShannons } from "../src/core/reserve.js";
import { runDoctor, type DoctorResult } from "../src/core/doctor.js";
import { runPaymentProof, type ProofResult } from "../src/core/proof.js";
import type { AcceptMode } from "../src/core/coordinator.js";
import type { DoctorClients } from "../src/core/doctor.js";
import type { ProofClients } from "../src/core/proof.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const demoEnvPaths = [resolve(repoRoot, ".env.demo"), resolve(repoRoot, ".env")];

export interface DemoConfig {
  serviceNode: string;
  receiverNode: string;
  amountCkb: string;
  amountShannons: bigint;
  execute: boolean;
  yes: boolean;
}

export interface DemoFlags {
  execute: boolean;
  yes: boolean;
}

export interface DemoEndpointSummary {
  serviceRpcUrl: string;
  receiverRpcUrl: string;
}

export interface DemoProofRun {
  config: DemoConfig;
  flags: DemoFlags;
}

export interface PublicDemoStory {
  config: DemoConfig;
  endpoints: DemoEndpointSummary;
  liveExecutionEnabled: boolean;
  doctor: DoctorResult;
  proof: ProofResult;
}

export function loadDemoEnv(): void {
  loadDotenv({ path: demoEnvPaths, override: false });
}

export function isHelpRequested(argv: string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

export function printDemoHelp(command: string, body: string[]): void {
  console.log(`Usage: npm run ${command}`);
  for (const line of body) {
    console.log(line);
  }
}

function parseBoolean(value: string | undefined, name: string): boolean {
  if (value === undefined || value === "") {
    return false;
  }

  if (/^(true|1|yes|on)$/i.test(value)) {
    return true;
  }

  if (/^(false|0|no|off)$/i.test(value)) {
    return false;
  }

  throw new Error(`Invalid boolean value for ${name}: ${value}`);
}

function requiredEnvValue(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Set ${name} in .env.demo or your environment.`);
  }

  return value;
}

export function readDemoConfig(env: NodeJS.ProcessEnv = process.env): DemoConfig {
  const serviceNode = requiredEnvValue(env, "SLUICE_DEMO_SERVICE");
  const receiverNode = requiredEnvValue(env, "SLUICE_DEMO_RECEIVER");
  const amountCkb = env.SLUICE_DEMO_AMOUNT_CKB?.trim() || "1";

  return {
    serviceNode,
    receiverNode,
    amountCkb,
    amountShannons: ckbToShannons(amountCkb),
    execute: parseBoolean(env.SLUICE_DEMO_EXECUTE, "SLUICE_DEMO_EXECUTE"),
    yes: parseBoolean(env.SLUICE_DEMO_YES, "SLUICE_DEMO_YES"),
  };
}

export function readDemoFlags(argv: string[]): DemoFlags {
  return {
    execute: argv.includes("--execute"),
    yes: argv.includes("--yes"),
  };
}

export function proofIsAllowed(config: DemoConfig, flags: DemoFlags): boolean {
  return (config.execute || flags.execute) && (config.yes || flags.yes);
}

function resolveNodeRpcUrl(nodeName: string, env: NodeJS.ProcessEnv): string {
  const envUrl = env[`SLUICE_${nodeName.toUpperCase()}_RPC_URL`]?.trim();
  if (envUrl) {
    return envUrl;
  }

  try {
    return loadNodeConfig(nodeName).rpcUrl;
  } catch {
    return "unknown";
  }
}

export function resolveDemoEndpointSummary(config: DemoConfig, env: NodeJS.ProcessEnv = process.env): DemoEndpointSummary {
  return {
    serviceRpcUrl: resolveNodeRpcUrl(config.serviceNode, env),
    receiverRpcUrl: resolveNodeRpcUrl(config.receiverNode, env),
  };
}

export function createServiceClient(nodeName: string, env: NodeJS.ProcessEnv = process.env): FiberRpcClient {
  const rpcUrl = env[`SLUICE_${nodeName.toUpperCase()}_RPC_URL`];
  return new FiberRpcClient({ url: rpcUrl ?? loadNodeConfig(nodeName).rpcUrl });
}

export function createDemoClients(config: DemoConfig, env: NodeJS.ProcessEnv = process.env): DoctorClients & ProofClients {
  return {
    service: createServiceClient(config.serviceNode, env),
    receiver: createServiceClient(config.receiverNode, env),
  };
}

export async function runDemoDoctor(
  env: NodeJS.ProcessEnv = process.env,
  runner: typeof runDoctor = runDoctor,
): Promise<DoctorResult> {
  const config = readDemoConfig(env);
  return runner(createDemoClients(config, env), {
    serviceNode: config.serviceNode,
    receiverNode: config.receiverNode,
    targetPaymentShannons: config.amountShannons,
    acceptMode: "detect" as AcceptMode,
  });
}

export async function runDemoDry(
  env: NodeJS.ProcessEnv = process.env,
  runner: typeof runPaymentProof = runPaymentProof,
): Promise<ProofResult> {
  const config = readDemoConfig(env);
  return runner(
    createDemoClients(config, env),
    {
      serviceNode: config.serviceNode,
      receiverNode: config.receiverNode,
      targetPaymentShannons: config.amountShannons,
    },
    {
      execute: false,
      acceptMode: "detect" as AcceptMode,
    },
  );
}

export async function runDemoProof(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv.slice(2),
  runner: typeof runPaymentProof = runPaymentProof,
): Promise<ProofResult> {
  const config = readDemoConfig(env);
  const flags = readDemoFlags(argv);

  if (!proofIsAllowed(config, flags)) {
    throw new Error("Refusing to run demo proof. Set SLUICE_DEMO_EXECUTE=true and SLUICE_DEMO_YES=true, or pass --execute --yes.");
  }

  return runner(
    createDemoClients(config, env),
    {
      serviceNode: config.serviceNode,
      receiverNode: config.receiverNode,
      targetPaymentShannons: config.amountShannons,
    },
    {
      execute: true,
      acceptMode: "detect" as AcceptMode,
    },
  );
}

export async function runPublicDemo(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv.slice(2),
  runners: {
    doctor?: typeof runDemoDoctor;
    dry?: typeof runDemoDry;
    proof?: typeof runDemoProof;
  } = {},
): Promise<PublicDemoStory> {
  const config = readDemoConfig(env);
  const doctorRunner = runners.doctor ?? runDemoDoctor;
  const dryRunner = runners.dry ?? runDemoDry;
  const proofRunner = runners.proof ?? runDemoProof;
  const liveExecutionEnabled = proofIsAllowed(config, readDemoFlags(argv));
  const doctor = await doctorRunner(env);
  const proof = liveExecutionEnabled ? await proofRunner(env, argv) : await dryRunner(env);

  return {
    config,
    endpoints: resolveDemoEndpointSummary(config, env),
    liveExecutionEnabled,
    doctor,
    proof,
  };
}

function quoteLine(label: string, shannons: string, ckb: string): string {
  return `${label}: ${ckb} (${shannons} shannons)`;
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isConnectivityError(message: string): boolean {
  return /fetch failed|fiber rpc http error|econnrefused|enotfound|eai_again|etimedout|socket hang up|network error/i.test(message);
}

export function formatDemoError(error: unknown, config?: DemoConfig, env: NodeJS.ProcessEnv = process.env): string {
  const message = extractErrorMessage(error);

  if (/set sluice_demo_/i.test(message) || /required env/i.test(message)) {
    return [
      "Sluice demo is missing required configuration.",
      "Copy .env.demo.example to .env.demo and set the required values.",
      "No live mutation was performed.",
    ].join("\n");
  }

  if (isConnectivityError(message)) {
    const endpoints = config ? resolveDemoEndpointSummary(config, env) : undefined;
    const lines = [
      "Sluice demo could not reach the configured Fiber RPC endpoint.",
      endpoints ? `Service: ${config?.serviceNode} (${endpoints.serviceRpcUrl})` : undefined,
      endpoints ? `Receiver: ${config?.receiverNode} (${endpoints.receiverRpcUrl})` : undefined,
      "Start your local Fiber nodes, check .env.demo, then run again:",
      "npm run demo:doctor",
      "No live mutation was performed.",
    ];

    return lines.filter((line): line is string => line !== undefined).join("\n");
  }

  return message;
}

export function formatPublicDemoIntro(
  config: DemoConfig,
  endpoints: DemoEndpointSummary,
  liveExecutionEnabled: boolean,
): string {
  const lines = [
    "Sluice demo",
    "Sluice makes a Fiber receiver payable by preparing reserve-aware inbound liquidity.",
    "1. Load .env.demo",
    `2. Service: ${config.serviceNode} (${endpoints.serviceRpcUrl})`,
    `3. Receiver: ${config.receiverNode} (${endpoints.receiverRpcUrl})`,
    `4. Amount: ${config.amountCkb} CKB`,
    `5. Execute: ${liveExecutionEnabled ? "enabled" : "disabled"}`,
  ];

  return lines.join("\n");
}

export function formatPublicDemoBody(story: PublicDemoStory): string {
  const lines = [
    formatDemoDoctor(story.doctor),
    "",
    story.liveExecutionEnabled
      ? "Real proof is enabled. Live Fiber mutation was performed."
      : "Real proof is disabled. No live Fiber mutation was performed.",
    "",
    story.liveExecutionEnabled ? formatDemoProof(story.proof) : formatDemoDry(story.proof),
    "",
    story.liveExecutionEnabled
      ? "Before Sluice: receiver was not payable. After Sluice: payment succeeded and invoice became Paid."
      : "Dry-run complete. This shows the flow without changing Fiber state.",
  ];

  return lines.join("\n");
}

export function formatPublicDemo(story: PublicDemoStory): string {
  return [formatPublicDemoIntro(story.config, story.endpoints, story.liveExecutionEnabled), "", formatPublicDemoBody(story)].join("\n");
}

export function formatDemoDoctor(result: DoctorResult): string {
  const lines = [
    "Sluice demo doctor",
    `Service node: ${result.service_node}`,
    `Receiver node: ${result.receiver_node}`,
    `Receiver amount: ${result.quote.target_payment.ckb}`,
    `Service RPC reachable: ${result.service.rpc_reachable ? "yes" : "no"}`,
    `Receiver RPC reachable: ${result.receiver.rpc_reachable ? "yes" : "no"}`,
    quoteLine("Quote", result.quote.minimum_opener_funding.shannons, result.quote.minimum_opener_funding.ckb),
    quoteLine("Receiver accept funding", result.quote.receiver_accept_funding.shannons, result.quote.receiver_accept_funding.ckb),
    `Readiness status: ${result.readiness?.readiness_status ?? "unknown"}`,
    `Safety: read-only, execute disabled, yes required for live mutation`,
  ];

  if (result.readiness_error) {
    lines.push(`Readiness note: ${result.readiness_error}`);
  }

  return lines.join("\n");
}

export function formatDemoDry(result: ProofResult): string {
  const lines = [
    "Sluice demo dry-run",
    "This is read-only. No live Fiber mutation is performed.",
    `Service node: ${result.plan.service_node}`,
    `Receiver node: ${result.plan.receiver_node}`,
    `Target payment: ${result.plan.target_payment.ckb}`,
    quoteLine("Opener funding", result.plan.quote.recommended_opener_funding.shannons, result.plan.quote.recommended_opener_funding.ckb),
    quoteLine("Receiver accept funding", result.plan.quote.receiver_accept_funding.shannons, result.plan.quote.receiver_accept_funding.ckb),
    `Readiness status: ${result.plan.readiness_before.readiness_status}`,
    "Planned story:",
    ...result.plan.planned_steps.map((step, index) => `${index + 1}. ${step}`),
  ];

  return lines.join("\n");
}

export function formatDemoProof(result: ProofResult): string {
  if (!result.execution) {
    return formatDemoDry(result);
  }

  const beforeFailure = result.execution.before_payment.failed_error ?? result.execution.before_payment.status;
  const afterStatus = result.execution.after_payment.status;
  const lines = [
    "Sluice live proof",
    `Service node: ${result.plan.service_node}`,
    `Receiver node: ${result.plan.receiver_node}`,
    `Target payment: ${result.plan.target_payment.ckb}`,
    "1. Before payment attempt",
    `   Result: ${beforeFailure}`,
    "2. Sluice quote",
    `   Target: ${result.plan.quote.target_payment.ckb}`,
    `   Opener funding: ${result.plan.quote.recommended_opener_funding.ckb}`,
    `   Receiver accept funding: ${result.plan.quote.receiver_accept_funding.ckb}`,
    "3. Channel open",
    `   Temp ID: ${result.execution.channel.temporary_channel_id ?? "n/a"}`,
    "4. Receiver accepting channel",
    `   Channel ID: ${result.execution.channel.channel_id ?? "n/a"}`,
    "5. Waiting for ChannelReady",
    `   Status: ${result.execution.channel.status}`,
    "6. Payment retry",
    `   Result: ${afterStatus}`,
    "7. Invoice check",
    `   Invoice status: ${result.execution.receiver_invoice_status ?? "unknown"}`,
    "8. Final result",
    `   Before Sluice: receiver was not payable`,
    `   After Sluice: receiver is payable`,
    `   Note: ${result.execution.reason}`,
  ];

  return lines.join("\n");
}
