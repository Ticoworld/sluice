import {
  formatDemoError,
  formatPublicDemoBody,
  formatPublicDemoIntro,
  isHelpRequested,
  loadDemoEnv,
  printDemoHelp,
  readDemoConfig,
  type DemoConfig,
  resolveDemoEndpointSummary,
  runPublicDemo,
  proofIsAllowed,
  readDemoFlags,
} from "./demo-support.js";

const argv = process.argv.slice(2);

if (isHelpRequested(argv)) {
  printDemoHelp("demo", [
    "Judge-facing public demo entrypoint.",
    "",
    "Public flow:",
    "  cp .env.demo.example .env.demo",
    "  npm run demo",
    "",
    "Maintainer commands:",
    "  npm run demo:doctor",
    "  npm run demo:dry",
    "  npm run demo:proof",
    "",
    "Requires local Fiber RPC endpoints described in .env.demo.",
  ]);
  process.exit(0);
}

loadDemoEnv();

let config: DemoConfig;
const flags = readDemoFlags(argv);

try {
  config = readDemoConfig();
} catch (error: unknown) {
  console.error(formatDemoError(error));
  process.exitCode = 1;
  process.exit();
}

const endpoints = resolveDemoEndpointSummary(config);
const liveExecutionEnabled = proofIsAllowed(config, flags);
console.log(formatPublicDemoIntro(config, endpoints, liveExecutionEnabled));

runPublicDemo(undefined, argv)
  .then((result) => {
    console.log(formatPublicDemoBody(result));
  })
  .catch((error: unknown) => {
    console.error(formatDemoError(error, config));
    process.exitCode = 1;
  });
