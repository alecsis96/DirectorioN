/**
 * Flags canónicos del paquete desplegable de Cloud Functions.
 *
 * Este paquete se compila y despliega independientemente de Next.js, por lo
 * que no debe importar `lib/featureFlags.ts`. Al cambiar monetización, ambos
 * flags deben actualizarse juntos y la prueba de paridad debe permanecer verde.
 */
export const MONETIZATION_FEATURE_ENABLED = false;

export const MONETIZATION_DISABLED_CODE = "MONETIZATION_DISABLED";
export const MONETIZATION_DISABLED_MESSAGE =
  "Monetization is temporarily disabled";

export const MONETIZATION_DISABLED_RESULT = Object.freeze({
  enabled: false,
  code: MONETIZATION_DISABLED_CODE,
  message: MONETIZATION_DISABLED_MESSAGE,
});
