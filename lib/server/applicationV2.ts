import { randomBytes } from 'node:crypto';

import {
  type AnonymousApplicationV2Input,
  buildApplicationV2Record,
} from '../applications/applicationV2';
import { PUBLIC_APPLICATION_V2_ENABLED } from '../featureFlags';
import { getAdminFirestore } from './firebaseAdmin';

export function generateApplicationV2Id(): string {
  return randomBytes(20).toString('base64url');
}

type ApplicationV2CreationOptions = {
  now?: Date;
  applicationId?: string;
  enabled?: boolean;
  db?: ReturnType<typeof getAdminFirestore>;
};

/**
 * Servicio exclusivamente servidor. 0.2R.1 no expone ninguna ruta pública que lo invoque.
 */
export async function createApplicationV2(
  input: AnonymousApplicationV2Input,
  options: ApplicationV2CreationOptions = {},
) {
  const enabled = options.enabled ?? PUBLIC_APPLICATION_V2_ENABLED;
  if (!enabled) {
    throw new Error('PUBLIC_APPLICATION_V2_DISABLED');
  }

  const applicationId = options.applicationId ?? generateApplicationV2Id();
  const record = buildApplicationV2Record(input, options.now);
  const db = options.db ?? getAdminFirestore();

  await db.collection('applications').doc(applicationId).create(record);
  return { applicationId, application: record };
}
