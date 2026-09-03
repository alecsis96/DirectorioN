export const MENU_FEATURE_ENABLED = false;
export const MONETIZATION_FEATURE_ENABLED = false;

// Rollout 0.2R: independientes de monetización y apagados por defecto.
export const PUBLIC_APPLICATION_V2_ENABLED = process.env.PUBLIC_APPLICATION_V2_ENABLED === 'true';
export const OWNERSHIP_CLAIMS_ENABLED = process.env.OWNERSHIP_CLAIMS_ENABLED === 'true';
export const EMAIL_LINK_AUTH_ENABLED = process.env.EMAIL_LINK_AUTH_ENABLED === 'true';

export type PublicApplicationTurnstileMode = 'off' | 'observe' | 'enforce';

export function parsePublicApplicationTurnstileMode(
  value: string | undefined,
): PublicApplicationTurnstileMode {
  return value === 'observe' || value === 'enforce' ? value : 'off';
}

// 0.2R.2.1: rollout independiente. `off` conserva Etapa 1 sin CAPTCHA.
export const PUBLIC_APPLICATION_TURNSTILE_MODE = parsePublicApplicationTurnstileMode(
  process.env.PUBLIC_APPLICATION_TURNSTILE_MODE,
);
