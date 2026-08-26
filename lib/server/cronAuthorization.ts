export function isCronRequestAuthorized(
  authorizationHeader: string | undefined,
  configuredSecret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!configuredSecret) return false;
  return authorizationHeader === `Bearer ${configuredSecret}`;
}
