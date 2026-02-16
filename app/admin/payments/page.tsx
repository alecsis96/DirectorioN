import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import PaymentManager from '../../../components/PaymentManagerWrapper';
import ReceiptListClient from '../../../components/ReceiptListClient';

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
  const businesses = snapshot.docs
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
    .filter((biz: any) => {
      if (biz.plan === 'free') return false;
      
      // Incluir negocios deshabilitados
      if (biz.isActive === false) return true;
      
      // Incluir negocios con pagos vencidos o próximos a vencer
      if (biz.nextPaymentDate) {
        const nextPayment = new Date(biz.nextPaymentDate);
        return nextPayment <= in7Days;
      }
      
      // Incluir negocios con estado de pago problemático
      if (['pending', 'overdue', 'canceled'].includes(biz.paymentStatus)) return true;
      if (['past_due', 'unpaid', 'canceled', 'payment_failed'].includes(biz.stripeSubscriptionStatus)) return true;
      
      return false;
    })
    .sort((a: any, b: any) => {
      // Ordenar: deshabilitados primero, luego por fecha de pago
      if (a.isActive === false && b.isActive !== false) return -1;
      if (a.isActive !== false && b.isActive === false) return 1;
      
      if (a.nextPaymentDate && b.nextPaymentDate) {
        return new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime();
      }
      
      return 0;
    });

  return businesses;
}

type TransferReceipt = {
  id: string;
  businessId: string;
  businessName: string;
  ownerEmail?: string | null;
  plan: string;
  fileName: string;
  fileType: string;
  fileData?: string;  // Legacy
  fileUrl?: string;   // Nuevo
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
    // Si el índice no está listo, retornar array vacío temporalmente
    return [];
  }
}

export default async function AdminPaymentsPage() {
  try {
    await requireAdmin();
    const [businesses, receipts] = await Promise.all([
      getBusinessesWithPaymentIssues(), 
      getTransferReceipts()
    ]);

    return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Panel de control</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#38761D] mb-2">💳 Gestión de Pagos</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Administra pagos, deshabilita o elimina negocios con problemas de pago
          </p>
        </div>
        
        {/* KPIs - Mobile-first compactos */}
        <div className="mb-6 sm:mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 sm:p-4 flex flex-col justify-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-700 leading-none">
              {businesses.filter((b: any) => b.isActive === false).length}
            </div>
            <div className="text-xs sm:text-sm text-red-600 mt-2 font-medium">Deshabilitados</div>
          </div>
          
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 sm:p-4 flex flex-col justify-center">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-700 leading-none">
              {businesses.filter((b: any) => {
                if (!b.nextPaymentDate || b.isActive === false) return false;
                const days = Math.ceil((new Date(b.nextPaymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return days <= 7 && days > 0;
              }).length}
            </div>
            <div className="text-xs sm:text-sm text-yellow-600 mt-2 font-medium">Próximos 7d</div>
          </div>
          
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1 flex flex-col justify-center">
            <div className="text-2xl sm:text-3xl font-bold text-orange-700 leading-none">
              {businesses.filter((b: any) => {
                if (!b.nextPaymentDate || b.isActive === false) return false;
                const days = Math.ceil((new Date(b.nextPaymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return days < 0;
              }).length}
            </div>
            <div className="text-xs sm:text-sm text-orange-600 mt-2 font-semibold">⚠️ Vencidos</div>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <PaymentManager businesses={businesses} />
          <ReceiptListClient initialReceipts={receipts} />
        </div>
      </div>
    </main>
    );
  } catch (error) {
    console.error('[AdminPaymentsPage] Error:', error);
    return (
      <main className="p-4 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-bold text-red-900">Error al cargar la página</h2>
          <p className="text-sm text-red-700 mt-2">
            Hubo un problema al cargar los datos. Por favor, intenta de nuevo más tarde.
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-red-600">Ver detalles técnicos</summary>
            <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </details>
        </div>
      </main>
    );
  }
}
