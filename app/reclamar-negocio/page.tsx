import OwnershipClaimClient from '../../components/OwnershipClaimClient';
import { EMAIL_LINK_AUTH_ENABLED, OWNERSHIP_CLAIMS_ENABLED } from '../../lib/featureFlags';

export default function ClaimBusinessPage() {
  const enabled = OWNERSHIP_CLAIMS_ENABLED && EMAIL_LINK_AUTH_ENABLED;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      <OwnershipClaimClient enabled={enabled} />
    </main>
  );
}
