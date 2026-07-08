// Projects an MCPDS document (YAML or JSON) down to a registry `server.json`.
//
// MCPDS unifies the distribution layer and the capability layer in one document.
// The registry only understands the distribution layer, so this tool applies the
// projection rule from §10 of the specification (schemas/mcpds-1.0.0.md):
//
//   take `server.name`, `server.description`, `server.version`,
//   `server.websiteUrl`, `server.repository`, `packaging.packages`, and
//   `packaging.meta` -> `_meta`; derive `remotes[]` from every
//   `transports[]` entry whose `type` is `streamable-http` or `sse` (each
//   contributes one remote carrying its `url`, `headers` and `variables`). The
//   capability layer (`tools`/`resources`/`prompts`) has no `server.json`
//   equivalent and is dropped.
//
// Usage:
//   node tools/project-server-json.mjs <input.mcp.yaml> [output.server.json]
//
// When the output path is omitted, `server.json` is written next to the input.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";

const REGISTRY_SCHEMA_URL =
  "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";

const REMOTE_TRANSPORT_TYPES = new Set(["streamable-http", "sse"]);

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function loadDocument(inputPath) {
  let raw;
  try {
    raw = readFileSync(inputPath, "utf8");
  } catch {
    fail(`cannot read input file: ${inputPath}`);
  }
  try {
    // `yaml.parse` also accepts JSON, since JSON is a subset of YAML.
    return parseYaml(raw);
  } catch (err) {
    fail(`failed to parse MCPDS document: ${err.message}`);
  }
}

function projectRemotes(transports) {
  if (!Array.isArray(transports)) return [];
  const remotes = [];
  for (const transport of transports) {
    if (!transport || !REMOTE_TRANSPORT_TYPES.has(transport.type)) continue;
    if (!transport.url) {
      fail(`transport of type "${transport.type}" is missing a required "url"`);
    }
    const remote = { type: transport.type, url: transport.url };
    if (transport.headers !== undefined) remote.headers = transport.headers;
    if (transport.variables !== undefined) remote.variables = transport.variables;
    remotes.push(remote);
  }
  return remotes;
}

function projectServerJson(doc) {
  if (!doc || typeof doc !== "object") {
    fail("MCPDS document did not parse to an object");
  }

  const { server, packaging, transports } = doc;

  if (!server || typeof server !== "object") {
    fail("MCPDS document is missing the required `server` section");
  }
  for (const field of ["name", "description", "version"]) {
    if (!server[field]) fail(`server.${field} is required to project server.json`);
  }

  const out = {
    $schema: REGISTRY_SCHEMA_URL,
    name: server.name,
    description: server.description,
  };

  if (server.repository !== undefined) out.repository = server.repository;
  out.version = server.version;
  if (server.websiteUrl !== undefined) out.websiteUrl = server.websiteUrl;

  if (packaging && Array.isArray(packaging.packages) && packaging.packages.length > 0) {
    out.packages = packaging.packages;
  }

  const remotes = projectRemotes(transports);
  if (remotes.length > 0) out.remotes = remotes;

  // MCPDS `meta` maps to the reserved `_meta` field.
  if (packaging && packaging.meta !== undefined) out._meta = packaging.meta;

  return out;
}

function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg) {
    console.error(
      "usage: node tools/project-server-json.mjs <input.mcp.yaml> [output.server.json]",
    );
    process.exit(1);
  }

  const inputPath = resolve(process.cwd(), inputArg);
  const outputPath = outputArg
    ? resolve(process.cwd(), outputArg)
    : join(dirname(inputPath), "server.json");

  const doc = loadDocument(inputPath);
  const serverJson = projectServerJson(doc);

  const json = `${JSON.stringify(serverJson, null, 2)}\n`;
  writeFileSync(outputPath, json, "utf8");

  console.log(`Wrote ${outputPath}`);
}

main();
