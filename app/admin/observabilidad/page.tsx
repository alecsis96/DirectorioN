import AdminRecordsObservability from '../../../components/admin/observability/AdminRecordsObservability';
import { buildAdminObservability } from '../../../lib/adminObservability';
import { requireAdminPage } from '../../../lib/server/adminPageAuthorization';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { serializeTimestamps } from '../../../lib/server/serializeFirestore';

export const dynamic = 'force-dynamic';

export default async function AdminObservabilityPage() {
  await requireAdminPage();
  const db = getAdminFirestore();
  const [applicationSnapshot, businessSnapshot] = await Promise.all([
    db.collection('applications').get(),
    db.collection('businesses').get(),
  ]);
  const data = buildAdminObservability(
    applicationSnapshot.docs.map(document => ({ id: document.id, data: serializeTimestamps(document.data()) })),
    businessSnapshot.docs.map(document => ({ id: document.id, data: serializeTimestamps(document.data()) })),
  );

  return (
    <AdminRecordsObservability applications={data.applications} businesses={data.businesses} />
  );
}
