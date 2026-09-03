/**
 * Flags canónicos del paquete desplegable de Cloud Functions.
 *
 * Este paquete se compila y despliega independientemente de Next.js, por lo
 * que no debe importar `lib/featureFlags.ts`. Al cambiar monetización, ambos
 * flags deben actualizarse juntos y la prueba de paridad debe permanecer verde.
 */
export const MONETIZATION_FEATURE_ENABLED = false;

// Rollout 0.2R. Functions se despliega de forma independiente y falla cerrado.
export const PUBLIC_APPLICATION_V2_ENABLED =
  process.env.PUBLIC_APPLICATION_V2_ENABLED === "true";
export const OWNERSHIP_CLAIMS_ENABLED =
  process.env.OWNERSHIP_CLAIMS_ENABLED === "true";
export const EMAIL_LINK_AUTH_ENABLED =
  process.env.EMAIL_LINK_AUTH_ENABLED === "true";

// Canal operativo independiente; se activa sólo después de configurar el bot.
export const TELEGRAM_APPLICATION_ALERTS_ENABLED =
  process.env.TELEGRAM_APPLICATION_ALERTS_ENABLED === "true";

export const MONETIZATION_DISABLED_CODE = "MONETIZATION_DISABLED";
export const MONETIZATION_DISABLED_MESSAGE =
  "Monetization is temporarily disabled";

export const MONETIZATION_DISABLED_RESULT = Object.freeze({
  enabled: false,
  code: MONETIZATION_DISABLED_CODE,
  message: MONETIZATION_DISABLED_MESSAGE,
});
