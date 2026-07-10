import { isHelpRequested, loadDemoEnv, readDemoConfig, runDemoDry, formatDemoDry, formatDemoError, printDemoHelp, type DemoConfig } from "./demo-support.js";

const argv = process.argv.slice(2);

if (isHelpRequested(argv)) {
  printDemoHelp("demo:dry", [
    "Run the proof flow in dry-run mode only.",
    "",
    "Required env:",
    "  SLUICE_DEMO_SERVICE",
    "  SLUICE_DEMO_RECEIVER",
    "  SLUICE_DEMO_AMOUNT_CKB",
    "  matching SLUICE_<NAME>_RPC_URL values for any non-built-in node names",
  ]);
  process.exit(0);
}

loadDemoEnv();

let config: DemoConfig;

try {
  config = readDemoConfig();
} catch (error: unknown) {
  console.error(formatDemoError(error));
  process.exitCode = 1;
  process.exit();
}

runDemoDry()
  .then((result) => {
    console.log(formatDemoDry(result));
  })
  .catch((error: unknown) => {
    console.error(formatDemoError(error, config));
    process.exitCode = 1;
  });
