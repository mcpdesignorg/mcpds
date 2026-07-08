# MCPDS — MCP Design Specification

[![npm version](https://img.shields.io/npm/v/@mcpds/spec)](https://www.npmjs.com/package/@mcpds/spec)
[![License: MIT](https://img.shields.io/npm/l/@mcpds/spec)](https://github.com/mirekholec/mcpds/blob/main/LICENSE)
[![Spec 1.0.0](https://img.shields.io/badge/spec-1.0.0-blue)](https://www.npmjs.com/package/@mcpds/spec)
[![JSON Schema](https://img.shields.io/badge/JSON%20Schema-draft--07-orange)](https://json-schema.org/)

**A tool-agnostic, declarative format for describing Model Context Protocol servers.**

MCPDS is to MCP servers what OpenAPI is to REST APIs. Today MCP servers exist only as code — there's no shared way to design, review, document, or generate them across languages and tools. MCPDS defines a single human-readable document (`*.mcp.yaml`) that any tool can read, validate, and build on.

This repository is the home of the MCPDS standard and the `@mcpds/spec` npm package, which ships the schema and TypeScript types for use in tools built on top of MCPDS.

> **MCP Designer** — the official visual editor for `.mcp.yaml` files — is built on top of this standard. See [mcpdesign.org](https://mcpdesign.org).

## Repository contents

| Path | Description |
|---|---|
| [`schemas/mcpds-1.0.0.md`](schemas/mcpds-1.0.0.md) | Human-readable specification (latest) |
| [`schemas/mcpds-1.0.schema.json`](schemas/mcpds-1.0.schema.json) | JSON Schema for validating `.mcp.yaml` files |
| [`src/types.ts`](src/types.ts) | TypeScript types (`McpdsDocument`, etc.) |
| [`src/schema/mcpds-schema.ts`](src/schema/mcpds-schema.ts) | JSON Schema object (TypeScript source of truth) |
| [`examples/`](examples) | Sample `.mcp.yaml` documents |

## Using the package

```bash
npm install @mcpds/spec
```

```ts
import { mcpdsSchema, type McpdsDocument } from "@mcpds/spec";
```

Subpath exports:

```ts
import schema from "@mcpds/spec/schema";
```

## CLI

The package can be run directly with `npx @mcpds/spec` for quick package and
schema version checks:

```bash
npx @mcpds/spec --help
npx @mcpds/spec --version
```

From this repository checkout, use the local npm binary after building:

```bash
npm run build
npm exec -- mcpds-spec --help
```

When installed globally, it exposes the `mcpds-spec` binary:

```bash
npm install -g @mcpds/spec
mcpds-spec --help
```

## JSON Schema

The schema is [defined in TypeScript](src/schema/mcpds-schema.ts) first, but [made available as JSON Schema](schemas/mcpds-1.0.schema.json) as well, for wider compatibility. The `.json` file is generated from the TypeScript source via `tools/generate-schema.mjs`.

If you want to validate or generate `.mcp.yaml` files, reference the bundled JSON Schema directly:

```yaml
# yaml-language-server: $schema=https://unpkg.com/@mcpds/spec/schemas/mcpds-1.0.schema.json
```

Or resolve it from the package in code:

```ts
import schema from "@mcpds/spec/schema";
// schema.$id === "https://mcpds.org/schema/1.0"
```

## Versioning

The package version tracks the MCPDS schema version. A major version bump signals a breaking change to the schema structure.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — created by Miroslav Holec ([@mirekholec](https://github.com/mirekholec))
