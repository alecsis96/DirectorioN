const warnMissingKey = (key: string) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[env] Missing value for ${key}`);
  }
};

export const requiredPublicEnv = (key: string): string | null => {
  const value = process.env[key];
  if (typeof value === "string" && value.trim().length) {
    return value;
  }
  warnMissingKey(key);
  return null;
};

export const optionalPublicEnv = (key: string): string | null => {
  const value = process.env[key];
  if (typeof value === "string" && value.trim().length) {
    return value;
  }
  return null;
};
