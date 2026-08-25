import { MONETIZATION_FEATURE_ENABLED } from './featureFlags';

export function isAlgoliaPublicRouteEnabled(
  monetizationEnabled = MONETIZATION_FEATURE_ENABLED,
): boolean {
  return monetizationEnabled;
}
