export const MENU_FEATURE_ENABLED = false;
export const MONETIZATION_FEATURE_ENABLED = false;

// Rollout 0.2R: independientes de monetización y apagados por defecto.
export const PUBLIC_APPLICATION_V2_ENABLED = process.env.PUBLIC_APPLICATION_V2_ENABLED === 'true';
export const OWNERSHIP_CLAIMS_ENABLED = process.env.OWNERSHIP_CLAIMS_ENABLED === 'true';
export const EMAIL_LINK_AUTH_ENABLED = process.env.EMAIL_LINK_AUTH_ENABLED === 'true';
