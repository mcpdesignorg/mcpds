export const SUPPORTED_MCPDS_VERSIONS = ["1.0"] as const;
export type SupportedMcpdsVersion = (typeof SUPPORTED_MCPDS_VERSIONS)[number];

export function isSupportedVersion(version: unknown): version is SupportedMcpdsVersion {
  return typeof version === "string" && (SUPPORTED_MCPDS_VERSIONS as readonly string[]).includes(version);
}
