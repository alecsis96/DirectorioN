const warnMissingKey = (key: string) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[env] Missing value for ${key}`);
  }
};

const PUBLIC_VALUES: Record<string, string | undefined> = {
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
};

export const requiredPublicEnv = (key: string): string | null => {
  const value = PUBLIC_VALUES[key] ?? process.env[key];
  if (typeof value === "string" && value.trim().length) {
    return value;
  }
  warnMissingKey(key);
  return null;
};

export const optionalPublicEnv = (key: string): string | null => {
  const value = PUBLIC_VALUES[key] ?? process.env[key];
  if (typeof value === "string" && value.trim().length) {
    return value;
  }
  return null;
};
