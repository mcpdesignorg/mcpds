# MCP Design Specification 1.0 (MCPDS)

**A declarative, design-time specification format for Model Context Protocol servers.**

MCPDS is to MCP servers what OpenAPI is to REST APIs: a single human-authored,
tool-friendly document that fully describes a server — its identity, transport,
authentication, and every capability it exposes (tools, resources, prompts) —
before any server code exists. It is the source of truth from which servers are
scaffolded, clients are configured, documentation is generated, and registry
entries (`server.json`) are derived.

- **Document revision:** 1.0.0.
- **Format:** YAML (canonical). JSON is an allowed equivalent serialization.
- **Schema dialect:** JSON Schema 2020-12 by default. Another dialect MAY be
  selected per-schema via an explicit `$schema` keyword.
- **Target MCP protocol revision:** `2025-11-25` (declare per-document via the
  optional `x-mcpProtocolVersion` key; see §2).
- **Filename convention:** `mcp.yaml` or `*.mcp.yaml`.
- **Machine-readable schema:** the canonical JSON Schema for this format is
  published at `https://mcpdesign.org/schemas/mcpds-1.0.schema.json`. It defines
  the *structural* contract; the semantic rules in §12 are enforced by tooling in
  addition to the schema.

---

## 1. Design rationale

MCP exposes two layers of information that no single existing artifact covers:

1. **Distribution / runtime layer** — how a server is packaged, transported and
   launched. This is what the registry `server.json` describes (`packages`,
   `remotes`, `transport`, `environmentVariables`, …).
2. **Capability / contract layer** — what tools, resources and prompts the server
   exposes, with full input/output JSON Schemas. In live MCP this exists only at
   runtime via `tools/list`, `resources/list`, `prompts/list`; there is no
   standard *design-time* file for it.

MCPDS unifies both layers. The `server`, `transports`, `auth` and `packaging`
sections stay compatible with `server.json`; the `tools`, `resources` and `prompts` sections are the new part.

A conforming generator MUST be able to project an MCPDS document down to a valid
registry `server.json` (lossily — the capability layer is dropped; see §10).

---

## 2. Top-level structure

```yaml
mcpds: "1.0"            # REQUIRED. Spec version string; MUST be "1.0".
x-mcpProtocolVersion: "2025-11-25"  # OPTIONAL. MCP protocol revision targeted.
server: {}              # REQUIRED. Identity & metadata.
instructions: ""        # OPTIONAL. Server-wide guidance for the LLM.
capabilities: {}        # OPTIONAL. Declared protocol feature flags.
requiresClientCapabilities: []  # OPTIONAL. Client capabilities the server depends on.
transports: []          # REQUIRED. Transport AND remote-endpoint definitions.
auth: {}                # OPTIONAL. Authentication & authorization.
packaging: {}           # OPTIONAL. Local distribution packages.
tools: []               # OPTIONAL. Tool definitions.
resources: []           # OPTIONAL. Static resource definitions.
resourceTemplates: []   # OPTIONAL. URI-templated resource definitions.
prompts: []             # OPTIONAL. Prompt template definitions.
x-*: {}                 # OPTIONAL. Vendor extensions (any top-level x- key).
```

`x-mcpProtocolVersion` declares which MCP protocol revision the document targets.
It lets generators pick the correct schema surface — newer revisions add fields
(such as `tasks` and tool `execution`). When omitted, tools SHOULD assume the
latest revision they support.

Every object MAY carry a `meta` field (mapping to MCP's reserved `_meta`) and any
number of `x-*` extension keys.

**Key ordering.** YAML/JSON mappings are unordered, so mapping key order is *not* semantically significant and MUST NOT affect validation. For readability, authors SHOULD follow the top-level order shown above.

---

## 3. `server` — identity & metadata

Mirrors the registry `server.json` identity fields.

```yaml
server:
  name: "org.example/my-server"    # REQUIRED. Reverse-DNS namespaced ID.
                                   # MUST begin/end alphanumeric; may contain - _ .
  title: "My Server"               # OPTIONAL. Human display name.
  description: "What the server does."   # REQUIRED.
  version: "1.0"                   # REQUIRED.
  websiteUrl: "https://example.org"      # OPTIONAL.
  repository:                      # OPTIONAL. When present, url + source are REQUIRED.
    url: "https://github.com/org/repo"
    source: "github"               # github | gitlab | ...
    id: "optional-vcs-id"
  icons:                           # OPTIONAL. Per MCP icon spec. src REQUIRED URI per entry.
    - src: "https://example.org/icon.svg"
      mimeType: "image/svg+xml"
      sizes: ["any"]
      theme: "dark"                # light | dark
  authors:                         # OPTIONAL. (MCPDS extension.)
    - name: "Author Name"
      url: "https://example.org"
  license: "MIT"                   # OPTIONAL. SPDX identifier.
  meta: {}                         # OPTIONAL. -> _meta
```

**Name rules** (inherited from MCP): reverse-DNS namespace + `/` + name. The
namespace determines publishing authority (`io.github.<user>/*`,
`com.<domain>/*`). Labels such as `io.modelcontextprotocol` and `dev.mcp` are
reserved.

`server.name`, `server.description` and `server.version` are REQUIRED and MUST be
non-empty (matching the registry `server.json` `Server` object). `repository`,
when present, REQUIRES both `url` and `source`. Every `icons[]` entry REQUIRES
`src` formatted as a URI.

---

## 4. `instructions` & `capabilities`

```yaml
instructions: |
  Server-wide guidance injected into the model's system prompt.

capabilities:
  tools:
    listChanged: true       # Server may emit notifications/tools/list_changed
  resources:
    subscribe: true         # Clients may subscribe to resource updates
    listChanged: true
  prompts:
    listChanged: true
  logging: true             # Supports logging/setLevel + log notifications
  completions: true         # Supports argument completion
  tasks:                    # Task-augmented execution (rev. 2025-11-25)
    list: true              # Supports tasks/list
    cancel: true            # Supports tasks/cancel
    requests:               # Which request kinds may be run as tasks
      tools:
        call: true          # tools/call may be task-augmented
  experimental:             # Named experimental flags; each value is a boolean.
    myFeature: true
```

`instructions` maps to `InitializeResult.instructions`. `capabilities` maps to
`ServerCapabilities` declared during `initialize`; generators use these flags to
wire up the correct notification handlers.

The `tasks` capability was introduced in protocol revision `2025-11-25`. A server
declares it when one or more requests (currently `tools/call`) may run
asynchronously as a *task*; individual tools opt in via `tools[].execution` (§7).

### 4.1 `requiresClientCapabilities`

```yaml
requiresClientCapabilities: ["elicitation", "sampling"]
```

An optional array declaring which **client-side** MCP capabilities the server
actively calls. Known values:

| Value | Server calls | Purpose |
|---|---|---|
| `sampling` | `sampling/createMessage` | Server asks the client/LLM to generate text |
| `elicitation` | `elicitation/create` | Server asks the client to collect structured user input |
| `roots` | `roots/list` | Server queries the client's file-system roots |

When non-empty, clients SHOULD verify the declared capabilities are supported
before connecting. Unknown values MUST be tolerated.

---

## 5. `transports`

A server MAY support more than one transport. Each entry declares both *how* a
client talks to the server **and** *where it runs* — there is no separate
`remotes[]` section. A `stdio` transport runs locally and is distributed via
`packaging.packages[]`; a `streamable-http`/`sse` transport runs remotely at its
own `url` and carries its `headers` and `variables` inline. On export to
`server.json`, each remote transport projects to one `remotes[]` entry (§10).

```yaml
transports:
  - type: stdio                    # stdio | streamable-http | sse(legacy)

  - type: streamable-http
    url: "https://api.example.org/mcp/{tenant}"   # may use {var} templates
    variables:
      tenant:
        description: "Tenant identifier"
        isRequired: true
        default: "public"
    sessions: true                 # Stateful sessions via Mcp-Session-Id
    sse: true                      # Server may stream via SSE on this transport
    cors:                          # OPTIONAL, HTTP only
      allowedOrigins: ["https://app.example.org"]
    headers:                       # OPTIONAL static/required request headers
      - name: "MCP-Protocol-Version"
        isRequired: true
      - name: "X-API-Key"
        description: "API key header for deployments that require one."
        isRequired: true
        isSecret: true
```

| Field        | Applies to | Notes |
|--------------|-----------|-------|
| `type`       | all        | REQUIRED. `stdio` local; `streamable-http` recommended remote; `sse` legacy |
| `url`        | http/sse   | REQUIRED for `streamable-http` and `sse`; supports `{variable}` templating |
| `variables`  | http/sse   | declared template vars (description, isRequired, default, choices) |
| `sessions`   | http       | whether server keeps session state |
| `sse`        | http       | whether the server may stream responses via SSE |
| `cors`       | http       | allowed browser origins |
| `headers`    | http       | declared request headers (name, description, isRequired, isSecret, default, choices) |

Every transport REQUIRES `type`. A `streamable-http` or `sse` transport
additionally REQUIRES a non-empty `url`. Static API keys or bearer headers
required by a remote deployment are modeled here as `headers`, not as MCP auth
schemes (§6).

---

## 6. `auth`

Authentication is declared **once, at the server level** — it describes how a
client authenticates to the server as a whole. MCP authorizes the transport
connection/session, not individual requests, so MCPDS has **no per-tool or
per-resource `security`** field and **no default-scheme mechanism**. Supported
surfaces are those defined by MCP itself: OAuth 2.1 for HTTP transports,
environment variables for stdio/local execution, and an explicit `none` scheme.

```yaml
auth:
  schemes:
    none:
      type: none                   # No auth (typical for stdio local)

    oauth:
      type: oauth2                 # OAuth 2.1 / Protected Resource Metadata
      flows:
        authorizationCode:
          authorizationUrl: "https://auth.example.org/authorize"
          tokenUrl: "https://auth.example.org/token"
          scopes:
            "tools:read": "List and read tool metadata"
            "tools:write": "Create and modify tools"
      resourceMetadataUrl: "https://api.example.org/.well-known/oauth-protected-resource"

    env:
      type: env                    # Secrets supplied as environment variables
      variables:
        - name: "API_TOKEN"
          description: "Personal access token"
          isSecret: true
          isRequired: true
```

Supported `type` values: `none`, `oauth2`, `env`. All schemes are server-wide.
Every `env` scheme variable REQUIRES `name`; `description`, `default`,
`isSecret` and `isRequired` are OPTIONAL.

API keys, basic auth and static bearer-token headers are outside MCP core
authorization; describe them as `transports[].headers` (§5).

---

## 7. `tools`

The primary design surface. Each tool mirrors the MCP `Tool` object: `name`,
`title`, `description`, `inputSchema`, optional `outputSchema`, `annotations`,
`execution`, `icons`.
MCPDS adds design-time conveniences (`examples`).

Only `name` and `inputSchema` are REQUIRED. `description` is strongly recommended
(it is the prompt context the model sees) but optional; tooling SHOULD emit a
*warning*, not an error, when it is missing.

```yaml
tools:
  - name: "create_tool"                  # REQUIRED. Unique. 1-128 chars, [A-Za-z0-9_.-].
    title: "Create Tool"                 # OPTIONAL. Human label.
    description: |                       # RECOMMENDED. Prompt context for the LLM.
      Add a new tool definition to the working spec. Use when the user wants to
      expose a new capability. Returns the updated tool list.

    inputSchema:                         # REQUIRED. JSON Schema 2020-12, object.
      type: object
      properties:
        name:
          type: string
          pattern: "^[a-z0-9_]+$"
          description: "Unique tool identifier."
        description:
          type: string
          description: "Human + model facing description."
        inputSchema:
          type: object
          description: "JSON Schema for the tool's parameters."
      required: ["name", "description"]
      additionalProperties: false

    outputSchema:                        # OPTIONAL. JSON Schema for structured result.
      type: object
      properties:
        toolCount: { type: integer }
        tool:
          type: object
          properties:
            name: { type: string }
            title: { type: string }
          required: ["name"]
      required: ["toolCount"]

    annotations:                         # OPTIONAL. Behavioral hints for clients.
      title: "Create Tool"
      readOnlyHint: false
      destructiveHint: false
      idempotentHint: true
      openWorldHint: false

    execution:                           # OPTIONAL. Task-augmented execution (rev. 2025-11-25).
      taskSupport: "optional"            # "forbidden" (default) | "optional" | "required"

    icons:                               # OPTIONAL. src REQUIRED URI per entry.
      - src: "https://example.org/tools/create.svg"
        mimeType: "image/svg+xml"

    examples:                            # OPTIONAL. Sample calls for docs/tests.
      - name: "Add an echo tool"
        input:
          name: "echo"
          description: "Echo the input back."
        output:
          toolCount: 1
          tool: { name: "echo" }

    meta: {}                             # OPTIONAL -> _meta
```

### 7.1 `annotations` reference

| Hint              | Meaning | Default |
|-------------------|---------|---------|
| `readOnlyHint`    | Tool does not modify its environment | `false` |
| `destructiveHint` | Tool may perform irreversible updates (only meaningful if not read-only) | `true` |
| `idempotentHint`  | Repeated identical calls have no additional effect | `false` |
| `openWorldHint`   | Tool touches external/open systems | `true` |

Annotations are **hints**, not guarantees; clients MUST NOT rely on them for
security decisions.

### 7.2 `execution` reference

| Field         | Meaning | Values | Default |
|---------------|---------|--------|---------|
| `taskSupport` | Whether `tools/call` for this tool may be task-augmented | `forbidden` \| `optional` \| `required` | `forbidden` |

A value other than `forbidden` requires the server to declare `capabilities.tasks`
(§4). `required` means the tool MUST be invoked as a task.

**Name rules:** a tool `name` MUST be 1–128 characters, case-sensitive, using
only `A–Z a–z 0–9 _ - .` (pattern `^[A-Za-z0-9_.-]+$`). `snake_case` is
recommended.

---

## 8. `resources` & `resourceTemplates`

Static resources have a concrete `uri`; templated ones use RFC 6570 URI templates.

```yaml
resources:
  - uri: "spec://current"                # REQUIRED.
    name: "current-spec"                 # REQUIRED. Programmatic id.
    title: "Current Working Spec"        # OPTIONAL.
    description: "The MCPDS document being edited."
    mimeType: "application/yaml"         # OPTIONAL.
    size: null                           # OPTIONAL. Bytes, if known.
    icons:                               # OPTIONAL. src REQUIRED URI per entry.
      - src: "https://example.org/resources/spec.svg"
        mimeType: "image/svg+xml"
    annotations:
      audience: ["assistant", "user"]    # Who is this for?
      priority: 0.8                      # 0..1 importance.
      lastModified: "2025-11-25T10:00:00Z"

resourceTemplates:
  - uriTemplate: "spec://tools/{toolName}"   # REQUIRED.
    name: "tool-by-name"
    title: "Tool Definition"
    description: "Fetch a single tool definition by name."
    mimeType: "application/json"
    icons:
      - src: "https://example.org/resources/tool.svg"
        mimeType: "image/svg+xml"
    annotations:
      audience: ["assistant"]
      priority: 0.5
      lastModified: "2025-11-25T10:00:00Z"
    parameters:                              # MCPDS: documents template vars.
      - name: "toolName"
        description: "The tool's unique name."
        required: true
        completion: true                     # Server offers completion for this arg.
```

Every `resources[]` entry REQUIRES `uri` and `name`; every `resourceTemplates[]`
entry REQUIRES `uriTemplate` and `name`. `annotations.priority`, when present,
MUST be a number between `0` and `1` inclusive. Every `parameters[]` entry
REQUIRES `name`.

`subscribe` and `listChanged` behavior is governed by `capabilities.resources`.

---

## 9. `prompts`

Reusable, parameterized prompt templates (MCP `Prompt` objects).

```yaml
prompts:
  - name: "scaffold_server"              # REQUIRED.
    title: "Scaffold MCP Server"         # OPTIONAL.
    description: "Generate server code from the current spec."
    arguments:
      - name: "language"                 # REQUIRED per argument.
        title: "Language"                # OPTIONAL.
        description: "Target language."  # OPTIONAL.
        required: true                   # OPTIONAL.
      - name: "includeTests"
        title: "Include tests"
        description: "Emit a test suite too."
        required: false
    icons:
      - src: "https://example.org/prompts/scaffold.svg"
    meta: {}
```

Every prompt REQUIRES `name`. Every `arguments[]` entry REQUIRES `name`;
`title`, `description` and `required` are OPTIONAL.

---

## 10. `packaging` — distribution (server.json projection)

Carries the **local, installable** distribution artifacts (the registry
`packages[]`) so a generator can emit a publishable registry entry. Remote
endpoints are **not** repeated here — they live in `transports[]` (§5) and project
to `server.json` `remotes[]` on export.

Each `packages[]` entry REQUIRES `registryType`, `identifier` and `transport`.
`registryType` is an open set: `npm`, `pypi`, `cargo`, `nuget`, `oci` and `mcpb`
are the known values, and any other non-empty registry type is permitted.
`version` is OPTIONAL at the schema layer because OCI versions are part of the
image reference and MCPB versions may be omitted; publishers SHOULD provide a
specific package version when the selected registry uses one. When present,
`version` MUST be 1–255 characters and MUST NOT be the string `latest`.
`registryBaseUrl`, when present, MUST be formatted as a URI. A package with
`registryType: mcpb` additionally REQUIRES `fileSha256`, which MUST be a
lowercase 64-character SHA-256 hex digest.

```yaml
packaging:
  packages:
    - registryType: "npm"                # npm | pypi | cargo | nuget | oci | mcpb | ... (open set)
      registryBaseUrl: "https://registry.npmjs.org"
      identifier: "@org/my-server"
      version: "1.0.0"                   # OPTIONAL. 1-255 chars; MUST NOT be "latest".
      transport: { type: "stdio" }       # REQUIRED. Local runtime transport (see 10.3).
      runtimeHint: "npx"                 # OPTIONAL launcher hint
      runtimeArguments:                  # args to the runtime
        - type: "named"
          name: "-y"
      packageArguments:                  # args to the package itself
        - type: "positional"
          valueHint: "target_dir"
          value: "/project"
      environmentVariables:
        - name: "LOG_LEVEL"
          description: "debug | info | warn | error"
          default: "info"
          isSecret: false
          isRequired: false
  meta:
    "io.modelcontextprotocol.registry/publisher-provided":
      tool: "mcp-designer"
      version: "1.0.0"
```

### 10.1 Input objects

`environmentVariables[]` entries, `transport.headers[]` entries and the argument
kinds in 10.2 share a common **input object** shape (mirroring the registry
`server.json` input model):

| Field         | Type      | Notes |
|---------------|-----------|-------|
| `description` | string    | Human-readable purpose of the input |
| `isRequired`  | boolean   | Whether the user must supply a value |
| `format`      | string    | `string` (default) \| `number` \| `boolean` \| `filepath` |
| `value`       | string    | Fixed or templated value; may embed `{variable}` placeholders |
| `isSecret`    | boolean   | Value is sensitive; tooling MUST mask it |
| `default`     | string    | Default value when the user supplies none |
| `placeholder` | string    | UI hint shown when no value is set |
| `choices`     | string[]  | Allowed values |
| `variables`   | map       | Declares each `{variable}` used in `value`; every entry is itself an input object |

`environmentVariables[]` entries and `transport.headers[]` entries additionally
REQUIRE `name` (a *named* input).

### 10.2 `runtimeArguments` & `packageArguments`

Both argument lists use the input-object fields from 10.1 plus:

| Field        | Type    | Notes |
|--------------|---------|-------|
| `type`       | string  | REQUIRED. `positional` \| `named` |
| `name`       | string  | REQUIRED when `type: named` (e.g. `-y`, `--port`) |
| `valueHint`  | string  | Placeholder name of a positional value |
| `isRepeated` | boolean | Argument may be passed multiple times |

A `named` argument REQUIRES `name`. A `positional` argument REQUIRES at least
one of `valueHint` or `value`.

### 10.3 Package `transport`

Declares the local runtime transport of the installed package (registry
`Package.transport` parity):

```yaml
transport:
  type: "stdio"                    # REQUIRED. stdio | streamable-http | sse
  # For streamable-http / sse packages:
  # url: "http://localhost:{port}/mcp"   # REQUIRED. http(s) URL or {variable} template.
  # headers:                             # OPTIONAL. Named inputs (10.1).
  #   - name: "X-API-Key"
  #     isSecret: true
  #     isRequired: true
```

`type` is REQUIRED and MUST be one of `stdio`, `streamable-http`, `sse`. When
`type` is `streamable-http` or `sse`, `url` is REQUIRED and MUST be either an
absolute `http(s)` URL or a template beginning with a `{variable}` reference
(for example `{baseUrl}/mcp`); each such variable is declared as an input
object. `headers`, when present, is an array of named inputs (10.1).

**Projection rule:** to produce `server.json`, take `server.name`,
`server.description`, `server.version`, `server.repository`,
`packaging.packages` and `packaging.meta` as `_meta`, and derive `remotes[]` from the
`transports[]` whose `type` is `streamable-http` or `sse` (each contributes one
`remotes[]` entry carrying its `url`, `headers` and `variables`). The capability
layer (`tools`/`resources`/`prompts`) has no `server.json` equivalent and is
omitted.

---

## 11. Minimal conforming document

```yaml
mcpds: "1.0"
server:
  name: "org.example/hello"
  description: "Minimal MCP server."
  version: "1.0.0"
transports:
  - type: stdio
tools:
  - name: "echo"
    description: "Echo a message back to the caller."
    inputSchema:
      type: object
      properties:
        message: { type: string }
      required: ["message"]
      additionalProperties: false
```

---

## 12. Validation rules (normative summary)

1. `mcpds` MUST be present and equal the string `"1.0"`. `server.name`,
   `server.description` and `server.version` MUST be present and non-empty.
   `transports` MUST contain at least one entry.
2. `server.name` MUST match the reverse-DNS + name grammar (§3).
3. Every `tools[].name`, `resources[].name`, `resourceTemplates[].name` and
   `prompts[].name` MUST be unique within its collection.
4. Every `tools[]` entry MUST declare `name` and `inputSchema`. A tool `name`
   MUST be 1–128 characters and match `^[A-Za-z0-9_.-]+$`. A missing
   `tools[].description` SHOULD raise a *warning*, not an error.
5. Every `inputSchema` and `outputSchema` MUST be a valid JSON Schema object
   with top-level `type: object`. The dialect defaults to JSON Schema 2020-12
   when `$schema` is absent; a different dialect MAY be selected via `$schema`.
6. Every `$ref` MUST resolve within the document.
7. Every `transports[]` entry MUST declare `type`; `type` MUST be one of
   `stdio`, `streamable-http`, `sse`. A `streamable-http` or `sse` transport
   MUST declare a non-empty `url`.
8. `tools[].execution.taskSupport`, if present, MUST be one of `forbidden`,
   `optional`, `required`; a non-`forbidden` value SHOULD be accompanied by a
   declared `capabilities.tasks`.
9. Every `packaging.packages[]` entry MUST declare `registryType`, `identifier`
   and `transport`. `version`, when present, MUST be 1–255 characters and MUST
   NOT be the string `latest`. `registryType: mcpb` REQUIRES `fileSha256`; any
   `fileSha256` value MUST match `^[a-f0-9]{64}$`.
10. Every package `transport` MUST declare `type` as one of `stdio`,
    `streamable-http`, `sse`; when `type` is `streamable-http` or `sse`, `url`
    is REQUIRED and MUST be an absolute `http(s)` URL or begin with a
    `{variable}` template reference.
11. Every `runtimeArguments[]` / `packageArguments[]` entry MUST declare `type`
    as `positional` or `named`. A `named` argument MUST declare `name`; a
    `positional` argument MUST declare `valueHint` or `value`. Every
    `environmentVariables[]` entry and every named-input header MUST declare
    `name`.
12. Every `icons[].src` MUST be present and formatted as a URI. Every
    `icons[].sizes[]` value MUST be either `any` or `WxH` (for example,
    `48x48`). Every `icons[].theme`, when present, MUST be `light` or `dark`.
13. `server.repository`, when present, MUST declare `url` and `source`.
14. `requiresClientCapabilities`, if present, MUST be an array of strings; known
    values are `sampling`, `elicitation`, `roots`. Unknown values MUST be
    tolerated.
15. Unknown `x-*` keys MUST be ignored by validators (forward compatibility).

### 12.1 Conformance & machine validation

Validation happens at two layers:

1. **Structural layer** — the canonical JSON Schema published at
   `https://mcpdesign.org/schemas/mcpds-1.0.schema.json`. It checks document
   shape and every constraint expressible in JSON Schema: rule 1 (required keys,
   the `mcpds: "1.0"` constant, at least one transport), the `name` /
   `inputSchema` presence and the tool-name pattern of rule 4, the `url`
   requirement of rule 7, the `taskSupport` enumeration of rule 8, and rules
   9–14 except as noted below. The schema is intentionally permissive
   (`additionalProperties: true`) so `x-*` extensions pass.
2. **Semantic layer** — rules 2, 3, 5 and 6, the allowed transport `type` values
   of rule 7, the `capabilities.tasks` correlation of rule 8, the
   recommended-`description` warning of rule 4, the tolerance requirements of
   rule 14 and the extension handling of rule 15 (reverse-DNS naming,
   cross-collection uniqueness, `$ref` resolution, JSON Schema validity of
   embedded schemas, and validator behavior). These cannot be expressed in
   plain JSON Schema and MUST be enforced by tooling on top of structural
   validation.

A document is **conforming** only when it passes *both* layers.

---

## 13. Relationship to MCP artifacts

MCPDS sits alongside two artifacts already defined by the MCP ecosystem and
overlaps with each only partially:

- **The MCP protocol** (the `2025-11-25` revision) defines the *runtime*
  capability layer. A live server exposes its tools, resources and prompts only
  on demand via `tools/list`, `resources/list`, `prompts/list` and `initialize`;
  there is no standard *design-time* document for it.
- **The registry `server.json`** defines the *distribution* layer — how a server
  is packaged, transported and launched (`packages`, `remotes`, `transport`,
  `environmentVariables`, …). It says nothing about the capabilities a server
  exposes.

MCPDS unifies both into a single, human-authored design-time file:

| Concern | MCP protocol (runtime) | registry `server.json` | **MCPDS 1.0** |
|---|---|---|---|
| Service identity | `InitializeResult` / `Implementation` | top-level fields | `server` |
| Transport | negotiated per connection | `packages[].transport` / `remotes[]` | `transports` (single section) |
| Auth | OAuth 2.1 / env (per connection) | `remotes[].headers` for static headers | `auth` (server-level) + `transports[].headers` |
| Capabilities / contract | `tools/list`, `resources/list`, `prompts/list` (runtime only) | — | `tools` / `resources` / `prompts` |
| Distribution | — | `packages` / `remotes` | `packaging.packages` + `transports` (remotes) |
| Schema dialect | JSON Schema 2020-12 | JSON Schema 2020-12 | JSON Schema 2020-12 |

MCPDS is the superset: the only artifact that carries *both* the distribution
layer (projectable to `server.json`, §10) and the full capability contract in one
design-time file — before any server code exists.
