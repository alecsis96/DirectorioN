import CampaignsAdminClient from '../../../components/admin/campaigns/CampaignsAdminClient';
import { listCampaigns } from '../../../lib/server/campaignsData';
import { fetchBusinesses } from '../../../lib/server/businessData';
import { requireAdminPage } from '../../../lib/server/adminPageAuthorization';
import { pickBusinessPreview } from '../../../types/business';

export const dynamic = 'force-dynamic';

export default async function AdminCampaignsPage() {
  await requireAdminPage('/admin/campaigns');

  const [{ businesses }, campaigns] = await Promise.all([
    fetchBusinesses(400),
    listCampaigns({ activeOnly: false }),
  ]);

  const businessOptions = businesses.map((business) => pickBusinessPreview(business));

  return <CampaignsAdminClient initialCampaigns={campaigns} businesses={businessOptions} />;
}
