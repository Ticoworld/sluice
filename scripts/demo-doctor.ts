import { isHelpRequested, loadDemoEnv, readDemoConfig, runDemoDoctor, formatDemoDoctor, formatDemoError, printDemoHelp, type DemoConfig } from "./demo-support.js";

const argv = process.argv.slice(2);

if (isHelpRequested(argv)) {
  printDemoHelp("demo:doctor", [
    "Run a read-only infrastructure check for the configured service and receiver.",
    "",
    "Required env:",
    "  SLUICE_DEMO_SERVICE",
    "  SLUICE_DEMO_RECEIVER",
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

runDemoDoctor()
  .then((result) => {
    console.log(formatDemoDoctor(result));
  })
  .catch((error: unknown) => {
    console.error(formatDemoError(error, config));
    process.exitCode = 1;
  });
