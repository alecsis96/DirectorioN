import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import CampaignsAdminClient from '../../../components/admin/campaigns/CampaignsAdminClient';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import { listCampaigns } from '../../../lib/server/campaignsData';
import { fetchBusinesses } from '../../../lib/server/businessData';
import { getAdminAuth } from '../../../lib/server/firebaseAdmin';
import { pickBusinessPreview } from '../../../types/business';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) {
    redirect('/para-negocios?auth=required');
  }

  const auth = getAdminAuth();

  try {
    const decoded = await auth.verifySessionCookie(token, true);
    if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(token);
      if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
    } catch (error) {
      console.error('[admin/campaigns] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

export default async function AdminCampaignsPage() {
  await requireAdmin();

  const [{ businesses }, campaigns] = await Promise.all([
    fetchBusinesses(400),
    listCampaigns({ activeOnly: false }),
  ]);

  const businessOptions = businesses.map((business) => pickBusinessPreview(business));

  return <CampaignsAdminClient initialCampaigns={campaigns} businesses={businessOptions} />;
}
