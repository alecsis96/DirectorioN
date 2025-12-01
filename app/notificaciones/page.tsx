import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';
import Link from 'next/link';
import { Bell, CheckCircle, XCircle, AlertCircle, Clock, ArrowLeft, DollarSign, Eye, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getAuthUser() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) {
    return null;
  }

  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    return decoded;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(token);
      return decoded;
    } catch (error) {
      console.error('[notificaciones] auth error', error);
      return null;
    }
  }
}

type Notification = {
  id: string;
  type: 'application_approved' | 'business_published' | 'business_rejected' | 'payment_reminder' | 'plan_upgraded' | 'review_received' | 'business_disabled';
  title: string;
  message: string;
  businessId?: string;
  businessName?: string;
  date: Date;
  read: boolean;
  icon: 'success' | 'error' | 'warning' | 'info';
};

async function getUserNotifications(userId: string, userEmail: string): Promise<Notification[]> {
  const db = getAdminFirestore();
  const notifications: Notification[] = [];

  // Obtener negocios del usuario
  const businessesSnapshot = await db
    .collection('businesses')
    .where('ownerId', '==', userId)
    .get();

  const businesses = businessesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as any)
  }));

  // Crear notificaciones basadas en el estado de los negocios
  for (const business of businesses) {
    const businessName = business.name || business.businessName || 'Tu negocio';
    
    // Negocio publicado
    if (business.status === 'published' && business.updatedAt) {
      notifications.push({
        id: `published-${business.id}`,
        type: 'business_published',
        title: '✅ Negocio publicado',
        message: `${businessName} ha sido aprobado y está visible en el directorio.`,
        businessId: business.id,
        businessName,
        date: business.updatedAt?.toDate?.() || new Date(business.updatedAt),
        read: false,
        icon: 'success',
      });
    }

    // Negocio en revisión
    if (business.status === 'review') {
      notifications.push({
        id: `review-${business.id}`,
        type: 'application_approved',
        title: '👀 Negocio en revisión',
        message: `${businessName} está siendo revisado por el equipo de administración.`,
        businessId: business.id,
        businessName,
        date: business.updatedAt?.toDate?.() || new Date(business.updatedAt || Date.now()),
        read: false,
        icon: 'info',
      });
    }

    // Negocio rechazado
    if (business.status === 'rejected') {
      notifications.push({
        id: `rejected-${business.id}`,
        type: 'business_rejected',
        title: '❌ Negocio rechazado',
        message: `${businessName} no cumple con los requisitos. ${business.rejectionReason || 'Contacta con soporte.'}`,
        businessId: business.id,
        businessName,
        date: business.updatedAt?.toDate?.() || new Date(business.updatedAt),
        read: false,
        icon: 'error',
      });
    }

    // Negocio deshabilitado
    if (business.isActive === false) {
      notifications.push({
        id: `disabled-${business.id}`,
        type: 'business_disabled',
        title: '⚠️ Negocio deshabilitado',
        message: `${businessName} ha sido deshabilitado. ${business.disabledReason || 'Contacta con soporte.'}`,
        businessId: business.id,
        businessName,
        date: business.updatedAt?.toDate?.() || new Date(business.updatedAt),
        read: false,
        icon: 'warning',
      });
    }

    // Recordatorio de pago próximo
    if (business.nextPaymentDate && business.isActive !== false) {
      const nextPayment = new Date(business.nextPaymentDate);
      const now = new Date();
      const daysUntilPayment = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilPayment <= 7 && daysUntilPayment > 0) {
        notifications.push({
          id: `payment-${business.id}`,
          type: 'payment_reminder',
          title: '💳 Pago próximo',
          message: `El pago de ${businessName} vence en ${daysUntilPayment} día${daysUntilPayment > 1 ? 's' : ''}.`,
          businessId: business.id,
          businessName,
          date: now,
          read: false,
          icon: 'warning',
        });
      } else if (daysUntilPayment < 0) {
        notifications.push({
          id: `payment-overdue-${business.id}`,
          type: 'payment_reminder',
          title: '🚨 Pago vencido',
          message: `El pago de ${businessName} está vencido hace ${Math.abs(daysUntilPayment)} día${Math.abs(daysUntilPayment) > 1 ? 's' : ''}.`,
          businessId: business.id,
          businessName,
          date: now,
          read: false,
          icon: 'error',
        });
      }
    }

    // Plan mejorado
    if (business.plan === 'featured' || business.plan === 'sponsor') {
      if (business.lastPaymentDate) {
        const lastPayment = business.lastPaymentDate?.toDate?.() || new Date(business.lastPaymentDate);
        const daysSinceUpgrade = Math.floor((Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceUpgrade <= 7) {
          notifications.push({
            id: `upgraded-${business.id}`,
            type: 'plan_upgraded',
            title: '🎉 Plan mejorado',
            message: `${businessName} ahora tiene el plan ${business.plan === 'sponsor' ? 'Sponsor' : 'Featured'}.`,
            businessId: business.id,
            businessName,
            date: lastPayment,
            read: false,
            icon: 'success',
          });
        }
      }
    }

    // Reseñas recientes (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const reviewsSnapshot = await db
      .collection('reviews')
      .where('businessId', '==', business.id)
      .orderBy('created', 'desc')
      .limit(5)
      .get();

    for (const reviewDoc of reviewsSnapshot.docs) {
      const review = reviewDoc.data();
      const reviewDate = review.created?.toDate?.() || new Date(review.created);
      
      if (reviewDate >= sevenDaysAgo) {
        notifications.push({
          id: `review-${reviewDoc.id}`,
          type: 'review_received',
          title: '⭐ Nueva reseña',
          message: `${review.name || 'Alguien'} dejó una reseña de ${review.rating} estrella${review.rating > 1 ? 's' : ''} en ${businessName}.`,
          businessId: business.id,
          businessName,
          date: reviewDate,
          read: false,
          icon: 'info',
        });
      }
    }
  }

  // Ordenar por fecha más reciente
  notifications.sort((a, b) => b.date.getTime() - a.date.getTime());

  return notifications;
}

export default async function NotificacionesPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/para-negocios?auth=required');
  }

  const notifications = await getUserNotifications(user.uid, user.email || '');

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      case 'warning': return AlertCircle;
      default: return Bell;
    }
  };

  const getIconColor = (icon: string) => {
    switch (icon) {
      case 'success': return 'bg-green-100 text-green-600';
      case 'error': return 'bg-red-100 text-red-600';
      case 'warning': return 'bg-amber-100 text-amber-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/mis-negocios"
          className="inline-flex items-center gap-2 text-[#38761D] hover:text-[#2d5418] mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Mis Negocios
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 bg-[#38761D] rounded-lg flex items-center justify-center">
              <Bell className="w-7 h-7 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notificaciones
              </h1>
              <p className="text-sm text-gray-600">
                {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
              <Bell className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Sin notificaciones
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Aquí aparecerán actualizaciones importantes sobre tus negocios, pagos, reseñas y más.
            </p>
            <Link
              href="/mis-negocios"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2d5418] transition shadow-lg hover:shadow-xl"
            >
              <FileText className="w-5 h-5" />
              Ir a Mis Negocios
            </Link>
          </div>
        ) : (
          /* Notifications List */
          <div className="space-y-3">
            {notifications.map((notification) => {
              const IconComponent = getIconComponent(notification.icon);
              const iconColorClass = getIconColor(notification.icon);

              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-md transition p-4 ${
                    !notification.read ? 'border-l-4 border-[#38761D]' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconColorClass}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(notification.date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      {notification.businessId && (
                        <Link
                          href={`/dashboard/${notification.businessId}`}
                          className="text-sm text-[#38761D] hover:text-[#2d5418] font-medium inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Ver negocio →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        {notifications.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Las notificaciones se generan automáticamente basadas en la actividad de tus negocios. Revisa regularmente para estar al día.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
