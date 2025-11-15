import DashboardEditor from '../../../components/DashboardEditor';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';

type DashboardParams = {
  id: string;
};

// Se resuelve la promesa 'params' con await directamente en la firma de la función.
export default async function DashboardBusinessPage({ params }: { params: DashboardParams | Promise<DashboardParams> }) {
  // Asegurarse de resolver params con await
  const resolvedParams = await params; 
  const { id } = resolvedParams;

  const businessId = decodeURIComponent(id);
  const db = getAdminFirestore();
  const snap = await db.doc(`businesses/${businessId}`).get();
  const initialBusiness = snap.exists
    ? JSON.parse(JSON.stringify({ id: snap.id, ...(snap.data() as Record<string, unknown>) }))
    : null;
  return <DashboardEditor businessId={businessId} initialBusiness={initialBusiness} />;
}
