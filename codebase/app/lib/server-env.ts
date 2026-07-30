export type ServerEnvName =
  | "GEMINI_API_KEY"
  | "GEMINI_MODEL"
  | "GEMINI_EMBEDDING_MODEL";

export function getServerEnv(name: ServerEnvName): string | undefined {
  const nodeValue = process.env[name];
  return typeof nodeValue === "string" && nodeValue.trim()
    ? nodeValue.trim()
    : undefined;
}
