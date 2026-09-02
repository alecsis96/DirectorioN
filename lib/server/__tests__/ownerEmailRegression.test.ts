import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('ownerEmail ownership regressions', () => {
  it('/metricas neither queries businesses by ownerEmail nor assigns ownerId', () => {
    const metricas = source('app/metricas/page.tsx');

    expect(metricas).not.toMatch(/collection\(['"]businesses['"]\)[\s\S]{0,120}where\(['"]ownerEmail['"]/);
    expect(metricas).not.toMatch(/ownerId\s*:\s*userId/);
    expect(metricas).not.toMatch(/Updating ownerId|Updated ownerId/);
  });

  it('/api/my-businesses scopes private business reads to the decoded uid', () => {
    const route = source('app/api/my-businesses/route.ts');

    expect(route).toContain("where('ownerId', '==', uid)");
    expect(route).not.toMatch(/collection\(['"]businesses['"]\)[\s\S]{0,120}where\(['"]ownerEmail['"]/);
    expect(route).not.toMatch(/collection\(['"]applications['"]\)[\s\S]{0,120}where\(['"]ownerEmail['"]/);
  });

  it('client management links never infer ownership from matching email', () => {
    const authHook = source('hooks/useAuth.ts');
    const detail = source('components/BusinessDetailView.tsx');

    expect(authHook).not.toContain('isOwnerByEmail');
    expect(detail).not.toContain('isOwnerByEmail');
  });

  it('/api/solicitud rejects a different requested email and uses uid for user businesses', () => {
    const route = source('app/api/solicitud/[email]/route.ts');

    expect(route).toContain('requesterEmail !== email');
    expect(route).toContain("where('ownerId', '==', decoded.uid)");
    expect(route).toContain("doc(decoded.uid).get()");
  });

  it('assisted registration creates an ownerless review draft', () => {
    const actions = source('app/actions/adminBusinessActions.ts');
    const assistedAction = actions.slice(actions.indexOf('export async function createAssistedBusiness'));

    expect(assistedAction).not.toMatch(/\bownerId\s*:/);
    expect(assistedAction).toContain("businessStatus: 'draft'");
    expect(assistedAction).toContain("visibility: 'hidden'");
  });
});
