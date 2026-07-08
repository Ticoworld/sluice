import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(command, args, cwd, options = {}) {
  const { stdout } = await execFileAsync(command, args, {
    cwd,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
    shell: options.shell ?? false,
  });

  return stdout;
}

async function writePackageJson(dir, data) {
  await writeFile(join(dir, "package.json"), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeTsConfig(dir) {
  await writeFile(
    join(dir, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          skipLibCheck: true,
        },
        include: ["index.ts"],
      },
      null,
      2,
    )}\n`,
  );
}

async function main() {
  const packOutput = await run(npmCommand, ["pack", "--json"], repoRoot, { shell: process.platform === "win32" });
  const packLines = packOutput.trim().split(/\r?\n/);
  const jsonStartIndex = packLines.findIndex((line) => line.trimStart().startsWith("["));
  assert(jsonStartIndex >= 0, "npm pack did not return package metadata.");
  const packInfo = JSON.parse(packLines.slice(jsonStartIndex).join("\n"));
  assert(Array.isArray(packInfo) && packInfo.length > 0, "npm pack did not return package metadata.");
  const tarballPath = join(repoRoot, packInfo[0].filename);
  const tempRoot = await mkdtemp(join(tmpdir(), "sluice-package-smoke-"));

  try {
    const esmDir = join(tempRoot, "esm");
    const tsDir = join(tempRoot, "ts");
    const cjsDir = join(tempRoot, "cjs");

    await mkdir(esmDir, { recursive: true });
    await mkdir(tsDir, { recursive: true });
    await mkdir(cjsDir, { recursive: true });

    await writePackageJson(esmDir, {
      name: "sluice-esm-smoke",
      private: true,
      type: "module",
    });
    await run(npmCommand, ["install", tarballPath], esmDir, { shell: process.platform === "win32" });
    await writeFile(
      join(esmDir, "index.js"),
      `
import { Sluice } from "sluice";
import { Sluice as SluiceSubpath } from "sluice/sdk";

const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257" });
const quote = sluice.quote({ amountCkb: "1" });

if (quote.minimum_opener_funding.ckb !== "120 CKB") {
  throw new Error("ESM root quote mismatch");
}

if (typeof SluiceSubpath !== "function") {
  throw new Error("ESM subpath import mismatch");
}

console.log("esm-ok");
`.trimStart(),
    );
    await run(process.execPath, ["index.js"], esmDir);

    await writePackageJson(tsDir, {
      name: "sluice-ts-smoke",
      private: true,
      type: "module",
    });
    await writeTsConfig(tsDir);
    await run(npmCommand, ["install", "typescript", "tsx"], tsDir, { shell: process.platform === "win32" });
    await run(npmCommand, ["install", tarballPath], tsDir, { shell: process.platform === "win32" });
    await writeFile(
      join(tsDir, "index.ts"),
      `
import { Sluice } from "sluice";

const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257" });
const quote = sluice.quote({ amountCkb: "1" });

if (quote.minimum_opener_funding.ckb !== "120 CKB") {
  throw new Error("TypeScript consumer quote mismatch");
}

console.log("ts-ok");
`.trimStart(),
    );
    await run(npmCommand, ["exec", "tsc", "--noEmit"], tsDir, { shell: process.platform === "win32" });
    await run(npmCommand, ["exec", "tsx", "index.ts"], tsDir, { shell: process.platform === "win32" });

    await writePackageJson(cjsDir, {
      name: "sluice-cjs-smoke",
      private: true,
    });
    await run(npmCommand, ["install", tarballPath], cjsDir, { shell: process.platform === "win32" });
    await writeFile(
      join(cjsDir, "index.js"),
      `
const { Sluice } = require("sluice");
const { Sluice: SluiceSubpath } = require("sluice/sdk");

const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257" });
const quote = sluice.quote({ amountCkb: "1" });

if (quote.minimum_opener_funding.ckb !== "120 CKB") {
  throw new Error("CommonJS root quote mismatch");
}

if (typeof SluiceSubpath !== "function") {
  throw new Error("CommonJS subpath import mismatch");
}

console.log("cjs-ok");
`.trimStart(),
    );
    await run(process.execPath, ["index.js"], cjsDir);
  } finally {
    await rm(tarballPath, { force: true });
    await rm(tempRoot, { recursive: true, force: true });
  }

  console.log("package smoke passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
