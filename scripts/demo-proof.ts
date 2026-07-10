import { isHelpRequested, loadDemoEnv, readDemoConfig, runDemoProof, formatDemoProof, formatDemoError, printDemoHelp, type DemoConfig } from "./demo-support.js";

const argv = process.argv.slice(2);

if (isHelpRequested(argv)) {
  printDemoHelp("demo:proof", [
    "Run the real local proof only when live execution is explicitly enabled.",
    "",
    "Required env:",
    "  SLUICE_DEMO_SERVICE",
    "  SLUICE_DEMO_RECEIVER",
    "  SLUICE_DEMO_AMOUNT_CKB",
    "  SLUICE_DEMO_EXECUTE=true",
    "  SLUICE_DEMO_YES=true",
    "  matching SLUICE_<NAME>_RPC_URL values for any non-built-in node names",
    "",
    "Or pass --execute --yes after the script command.",
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

runDemoProof(undefined, argv)
  .then((result) => {
    console.log("Sluice demo proof");
    console.log(formatDemoProof(result));
  })
  .catch((error: unknown) => {
    console.error(formatDemoError(error, config));
    process.exitCode = 1;
  });
