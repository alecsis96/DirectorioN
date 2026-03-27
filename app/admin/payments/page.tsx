import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import PaymentManager from '../../../components/PaymentManagerWrapper';
import ReceiptListClient from '../../../components/ReceiptListClient';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { downgradeExpiredPremiumPlans } from '../../../lib/server/premiumPlanExpiry';

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
      console.error('[admin/payments] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

async function getBusinessesWithPaymentIssues() {
  const db = getAdminFirestore();
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const snapshot = await db.collection('businesses').get();
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.businessName || 'Sin nombre',
        ownerEmail: data.ownerEmail,
        ownerName: data.ownerName,
        plan: data.plan,
        isActive: data.isActive,
        paymentStatus: data.paymentStatus,
        nextPaymentDate: data.nextPaymentDate,
        lastPaymentDate: data.lastPaymentDate,
        disabledReason: data.disabledReason,
        stripeSubscriptionStatus: data.stripeSubscriptionStatus,
        paymentHistory: data.paymentHistory || [],
      };
    })
    .filter((business: any) => {
      if (business.plan === 'free') return false;
      if (business.isActive === false) return true;

      if (business.nextPaymentDate) {
        const nextPayment = new Date(business.nextPaymentDate);
        return nextPayment <= in7Days;
      }

      if (['pending', 'overdue', 'canceled'].includes(business.paymentStatus)) return true;
      if (['past_due', 'unpaid', 'canceled', 'payment_failed'].includes(business.stripeSubscriptionStatus)) return true;
      return false;
    })
    .sort((left: any, right: any) => {
      if (left.isActive === false && right.isActive !== false) return -1;
      if (left.isActive !== false && right.isActive === false) return 1;

      if (left.nextPaymentDate && right.nextPaymentDate) {
        return new Date(left.nextPaymentDate).getTime() - new Date(right.nextPaymentDate).getTime();
      }

      return 0;
    });
}

type TransferReceipt = {
  id: string;
  businessId: string;
  businessName: string;
  ownerEmail?: string | null;
  plan: string;
  fileName: string;
  fileType: string;
  fileData?: string;
  fileUrl?: string;
  status: string;
  createdAt?: string;
};

async function getTransferReceipts(): Promise<TransferReceipt[]> {
  const db = getAdminFirestore();

  try {
    const snap = await db
      .collection('paymentReceipts')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        businessId: data.businessId,
        businessName: data.businessName || 'Sin nombre',
        ownerEmail: data.ownerEmail || null,
        plan: data.plan || 'sponsor',
        fileName: data.fileName || 'comprobante',
        fileType: data.fileType || 'application/octet-stream',
        fileData: data.fileData || undefined,
        fileUrl: data.fileUrl || undefined,
        status: data.status || 'pending',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });
  } catch (error) {
    console.error('[getTransferReceipts] Error fetching receipts:', error);
    return [];
  }
}

export default async function AdminPaymentsPage() {
  try {
    await requireAdmin();
    await downgradeExpiredPremiumPlans({ force: true });

    const [businesses, receipts] = await Promise.all([getBusinessesWithPaymentIssues(), getTransferReceipts()]);

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6">
            <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Operacion</p>
            <h1 className="mb-2 text-2xl font-bold text-[#38761D] sm:text-3xl">Pagos</h1>
            <p className="text-sm text-gray-600">Revisa vencimientos, pausa negocios con riesgo y valida comprobantes sin ruido analitico.</p>
          </div>

          <div className="space-y-6">
            <PaymentManager businesses={businesses} />
            <ReceiptListClient initialReceipts={receipts} />
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error('[AdminPaymentsPage] Error:', error);
    return (
      <main className="mx-auto max-w-7xl p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-bold text-red-900">Error al cargar pagos</h2>
          <p className="mt-2 text-sm text-red-700">Hubo un problema al cargar los datos. Intenta de nuevo mas tarde.</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-red-600">Ver detalle tecnico</summary>
            <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </details>
        </div>
      </main>
    );
  }
}
