export type ExtensionKey = `x-${string}`;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type UnknownRecord = Record<string, unknown>;

export interface ExtensibleObject {
  meta?: UnknownRecord;
  [key: ExtensionKey]: unknown;
  [key: string]: unknown;
}

export interface McpdsDocument extends ExtensibleObject {
  mcpds: string;
  server: ServerInfo;
  instructions?: string;
  capabilities?: Capabilities;
  requiresClientCapabilities?: string[];
  transports: Transport[];
  auth?: AuthConfig;
  packaging?: Packaging;
  tools?: ToolDefinition[];
  resources?: ResourceDefinition[];
  resourceTemplates?: ResourceTemplateDefinition[];
  prompts?: PromptDefinition[];
}

export interface ServerInfo extends ExtensibleObject {
  name: string;
  title?: string;
  description: string;
  version: string;
  websiteUrl?: string;
  repository?: RepositoryInfo;
  icons?: IconInfo[];
  authors?: AuthorInfo[];
  license?: string;
}

export interface RepositoryInfo extends ExtensibleObject {
  url?: string;
  source?: string;
  id?: string;
}

export interface IconInfo extends ExtensibleObject {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: "light" | "dark";
}

export interface AuthorInfo extends ExtensibleObject {
  name: string;
  url?: string;
}

export interface Capabilities extends ExtensibleObject {
  tools?: { listChanged?: boolean } & ExtensibleObject;
  resources?: { subscribe?: boolean; listChanged?: boolean } & ExtensibleObject;
  prompts?: { listChanged?: boolean } & ExtensibleObject;
  logging?: boolean;
  completions?: boolean;
  tasks?: TasksCapability;
  experimental?: Record<string, boolean>;
}

export interface TasksCapability extends ExtensibleObject {
  list?: boolean;
  cancel?: boolean;
  requests?: { tools?: { call?: boolean } & ExtensibleObject } & ExtensibleObject;
}

export type TransportType = "stdio" | "streamable-http" | "sse";

export interface Transport extends ExtensibleObject {
  type: TransportType | string;
  url?: string;
  variables?: Record<string, TransportVariable>;
  sessions?: boolean;
  sse?: boolean;
  cors?: { allowedOrigins?: string[] } & ExtensibleObject;
  headers?: TransportHeader[];
}

export interface TransportVariable extends ExtensibleObject {
  description?: string;
  isRequired?: boolean;
  default?: JsonValue;
  choices?: JsonValue[];
}

export interface TransportHeader extends ExtensibleObject {
  name: string;
  description?: string;
  default?: string;
  choices?: string[];
  isSecret?: boolean;
  isRequired?: boolean;
}

export interface AuthConfig extends ExtensibleObject {
  schemes?: Record<string, AuthScheme>;
}

export type AuthScheme = NoneAuthScheme | OAuth2AuthScheme | EnvAuthScheme | ExtensibleObject;

export interface NoneAuthScheme extends ExtensibleObject {
  type: "none";
}

export interface OAuth2AuthScheme extends ExtensibleObject {
  type: "oauth2";
  flows?: UnknownRecord;
  resourceMetadataUrl?: string;
}

export interface EnvAuthScheme extends ExtensibleObject {
  type: "env";
  variables?: EnvironmentVariable[];
}

export interface EnvironmentVariable extends ExtensibleObject {
  name: string;
  description?: string;
  default?: string;
  isSecret?: boolean;
  isRequired?: boolean;
}

export interface ToolDefinition extends ExtensibleObject {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchemaObject;
  outputSchema?: JsonSchemaObject;
  annotations?: ToolAnnotations;
  execution?: ToolExecution;
  icons?: IconInfo[];
  examples?: ToolExample[];
}

export type TaskSupport = "forbidden" | "optional" | "required";

export interface ToolExecution extends ExtensibleObject {
  taskSupport?: TaskSupport;
}

export interface ToolAnnotations extends ExtensibleObject {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolExample extends ExtensibleObject {
  name?: string;
  input?: JsonValue;
  output?: JsonValue;
}

export interface ResourceDefinition extends ExtensibleObject {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number | null;
  icons?: IconInfo[];
  annotations?: ResourceAnnotations;
}

export interface ResourceAnnotations extends ExtensibleObject {
  audience?: string[];
  priority?: number;
  lastModified?: string;
}

export interface ResourceTemplateDefinition extends ExtensibleObject {
  uriTemplate: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  icons?: IconInfo[];
  annotations?: ResourceAnnotations;
  parameters?: TemplateParameter[];
}

export interface TemplateParameter extends ExtensibleObject {
  name: string;
  description?: string;
  required?: boolean;
  completion?: boolean;
}

export interface PromptDefinition extends ExtensibleObject {
  name: string;
  title?: string;
  description?: string;
  arguments?: PromptArgument[];
  icons?: IconInfo[];
}

export interface PromptArgument extends ExtensibleObject {
  name: string;
  title?: string;
  description?: string;
  required?: boolean;
}

export interface Packaging extends ExtensibleObject {
  packages?: PackageDefinition[];
}

export interface PackageDefinition extends ExtensibleObject {
  registryType?: "npm" | "pypi" | "cargo" | "nuget" | "oci" | "mcpb" | string;
  registryBaseUrl?: string;
  identifier?: string;
  version?: string;
  fileSha256?: string;
  transport?: LocalTransport;
  runtimeHint?: string;
  runtimeArguments?: PackageArgument[];
  packageArguments?: PackageArgument[];
  environmentVariables?: KeyValueInput[];
}

export interface LocalTransport extends ExtensibleObject {
  type?: TransportType | string;
  url?: string;
  headers?: KeyValueInput[];
}

export type InputFormat = "string" | "number" | "boolean" | "filepath";

export interface InputDefinition extends ExtensibleObject {
  description?: string;
  isRequired?: boolean;
  format?: InputFormat | string;
  value?: string;
  isSecret?: boolean;
  default?: string;
  placeholder?: string;
  choices?: string[];
}

export interface InputWithVariables extends InputDefinition {
  variables?: Record<string, InputDefinition>;
}

export interface KeyValueInput extends InputWithVariables {
  name: string;
}

export interface PackageArgument extends InputWithVariables {
  type: "positional" | "named" | string;
  name?: string;
  valueHint?: string;
  isRepeated?: boolean;
}

export interface JsonSchemaObject extends ExtensibleObject {
  $schema?: string;
  $id?: string;
  $ref?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  items?: JsonSchemaObject | JsonSchemaObject[];
  additionalProperties?: boolean | JsonSchemaObject;
  enum?: JsonValue[];
  default?: JsonValue;
}

export type ValidationSeverity = "error" | "warning";
export type ValidationSection =
  | "root"
  | "server"
  | "capabilities"
  | "transports"
  | "auth"
  | "tools"
  | "resources"
  | "resourceTemplates"
  | "prompts"
  | "packaging"
  | "yaml";

export interface ValidationIssue {
  path: string;
  section: ValidationSection;
  severity: ValidationSeverity;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ParsedSpecDocument {
  source: string;
  spec?: McpdsDocument;
  diagnostics: ValidationIssue[];
}