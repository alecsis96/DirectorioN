import OwnershipClaimClient from '../../components/OwnershipClaimClient';
import { OWNERSHIP_CLAIMS_ENABLED, EMAIL_LINK_AUTH_ENABLED } from '../../lib/featureFlags';
import EmailLinkLogin from '../../components/EmailLinkLogin';
import { safeInternalNext } from '../../lib/authRedirect';

export const dynamic = 'force-dynamic';

export default async function ClaimLoginPage({ searchParams }: { searchParams: Promise<{ flow?: string; next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeInternalNext(params.next, '');
  if (params.flow === 'login' || nextPath) return <main className="min-h-screen bg-gray-50 px-4 py-16">
    <EmailLinkLogin emailLinkEnabled={EMAIL_LINK_AUTH_ENABLED} nextPath={nextPath || '/dashboard'} />
  </main>;
  return <main className="min-h-screen bg-gray-50 px-4 py-16">
    <OwnershipClaimClient enabled={OWNERSHIP_CLAIMS_ENABLED} emailLinkEnabled={EMAIL_LINK_AUTH_ENABLED} login />
  </main>;
}
