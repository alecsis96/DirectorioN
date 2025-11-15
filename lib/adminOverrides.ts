const DEFAULT_EMAILS = ['al36xiz@gmail.com'];

function parseEmails(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

const ENV_EMAILS = [
  ...parseEmails(process.env.ADMIN_OVERRIDE_EMAILS),
  ...parseEmails(process.env.NEXT_PUBLIC_ADMIN_OVERRIDE_EMAILS),
];

const ADMIN_OVERRIDE_SET = new Set<string>([...DEFAULT_EMAILS, ...ENV_EMAILS]);

export function hasAdminOverride(email?: string | null) {
  if (!email) return false;
  return ADMIN_OVERRIDE_SET.has(email.toLowerCase());
}
