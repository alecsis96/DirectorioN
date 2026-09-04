import OwnershipClaimClient from '../../components/OwnershipClaimClient';
import { OWNERSHIP_CLAIMS_ENABLED } from '../../lib/featureFlags';

export const dynamic = 'force-dynamic';

export default function ClaimBusinessPage() {
  const enabled = OWNERSHIP_CLAIMS_ENABLED;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      <OwnershipClaimClient enabled={enabled} />
    </main>
  );
}
