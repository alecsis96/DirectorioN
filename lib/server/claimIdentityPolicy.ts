import type { Auth } from 'firebase-admin/auth';

/** Read-only. Duplicate-email or tenant configurations cannot resolve a unique global identity. */
export async function assertUnambiguousAuthProject(auth: Auth) {
  const projectId = auth.app.options.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) throw new Error('CLAIM_AUTH_POLICY_UNAVAILABLE');
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  let url: string, authorization: string;
  if (emulator && projectId.startsWith('demo-')) {
    url = `http://${emulator}/identitytoolkit.googleapis.com/v2/projects/${projectId}/config`;
    authorization = 'Bearer owner';
  } else {
    if (emulator) throw new Error('CLAIM_AUTH_POLICY_UNAVAILABLE');
    const credential = auth.app.options.credential;
    if (!credential) throw new Error('CLAIM_AUTH_POLICY_UNAVAILABLE');
    const access = await credential.getAccessToken();
    url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    authorization = `Bearer ${access.access_token}`;
  }
  const response = await fetch(url, { headers: { Authorization: authorization }, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('CLAIM_AUTH_POLICY_UNAVAILABLE');
  const config = await response.json();
  if (!config.signIn || config.signIn.allowDuplicateEmails === true || config.multiTenant?.allowTenants === true ||
      config.mfa?.state === 'MANDATORY') throw new Error('CLAIM_AUTH_POLICY_AMBIGUOUS');
}
