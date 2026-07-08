#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { SUPPORTED_MCPDS_VERSIONS } from "./version.js";

interface PackageJson {
  version?: string;
}

const args = process.argv.slice(2);
const packageJson = await readPackageJson();

if (args.includes("--version") || args.includes("-v")) {
  console.log(packageJson.version ?? "unknown");
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  printHelp(packageJson.version ?? "unknown");
  process.exit(0);
}

console.error(`Unknown argument: ${args[0]}`);
console.error("Run `npx @mcpds/spec --help` for usage.");
process.exit(1);

async function readPackageJson(): Promise<PackageJson> {
  const raw = await readFile(new URL("../package.json", import.meta.url), "utf8");
  return JSON.parse(raw) as PackageJson;
}

function printHelp(packageVersion: string): void {
  console.log(`@mcpds/spec ${packageVersion}`);
  console.log("");
  console.log("MCP Design Specification package.");
  console.log("");
  console.log("Usage:");
  console.log("  npx @mcpds/spec --help");
  console.log("  npx @mcpds/spec --version");
  console.log("");
  console.log("Package exports:");
  console.log("  @mcpds/spec        TypeScript types and schema source");
  console.log("  @mcpds/spec/schema Generated JSON Schema");
  console.log("");
  console.log(`Supported MCPDS versions: ${SUPPORTED_MCPDS_VERSIONS.join(", ")}`);
}