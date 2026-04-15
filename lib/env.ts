function normalizeEnv(value?: string) {
  if (!value) return undefined;
  let trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null") {
    return undefined;
  }
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEnv(name: string) {
  const value = normalizeEnv(process.env[name]);
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export const env = {
  mongodbUri: () => requireEnv("MONGODB_URI"),
  authSecret: () => requireEnv("AUTH_SECRET"),
  accessPin: () => normalizeEnv(process.env.ACCESS_PIN),
  accessPinHash: () => normalizeEnv(process.env.ACCESS_PIN_HASH)
};
