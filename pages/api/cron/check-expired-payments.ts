import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';

/**
 * Cron job para verificar pagos VENCIDOS y degradar planes
 * Se ejecuta diariamente (10:00 AM) después del check de recordatorios
 * 
 * FLUJO DE DEGRADACIÓN:
 * 1. Día de vencimiento (día 0): paymentStatus cambia a 'overdue', mantiene plan
 * 2. Días 1-7: Período de gracia - mantiene plan, envía recordatorios urgentes
 * 3. Día 7+: Si no pagó → DEGRADA a plan 'free' automáticamente
 * 
 * Esto da una semana de oportunidad para pagar sin perder beneficios premium.
 */

const GRACE_PERIOD_DAYS = 7; // Días de gracia antes de degradar a FREE

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autorización
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔍 Starting expired payment check...');
    
    const db = getAdminFirestore();
    const now = new Date();
    const businesses = await db.collection('businesses')
      .where('plan', 'in', ['featured', 'sponsor'])
      .where('isActive', '==', true)
      .get();

    const toDegrade: string[] = [];
    const toMarkOverdue: string[] = [];
    const overdueReminders: Array<{
      businessId: string;
      businessName: string;
      ownerEmail: string;
      whatsapp: string | null;
      plan: string;
      daysOverdue: number;
    }> = [];

    for (const doc of businesses.docs) {
      const data = doc.data();
      const nextPaymentDate = data.nextPaymentDate?.toDate?.() || null;
      
      if (!nextPaymentDate) continue;

      const daysOverdue = Math.floor((now.getTime() - nextPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Pago vencido
      if (daysOverdue >= 0) {
        // Si acaba de vencer (día 0), marcar como overdue
        if (daysOverdue === 0 && data.paymentStatus === 'active') {
          toMarkOverdue.push(doc.id);
          console.log(`⚠️ Payment just expired for ${data.name} - marking as overdue`);
        }

        // Si está en período de gracia (días 1-7), enviar recordatorios
        if (daysOverdue >= 1 && daysOverdue <= GRACE_PERIOD_DAYS) {
          if (data.paymentStatus !== 'overdue') {
            // Actualizar a overdue si no lo está
            await db.collection('businesses').doc(doc.id).update({
              paymentStatus: 'overdue',
            });
          }

          // Enviar recordatorio urgente diario
          overdueReminders.push({
            businessId: doc.id,
            businessName: data.name || 'Tu negocio',
            ownerEmail: data.ownerEmail,
            whatsapp: data.WhatsApp || null,
            plan: data.plan,
            daysOverdue,
          });
          
          console.log(`⏰ Grace period day ${daysOverdue}/7 for ${data.name}`);
        }

        // Si ya pasó el período de gracia (día 7+), degradar a FREE
        if (daysOverdue > GRACE_PERIOD_DAYS && data.plan !== 'free') {
          toDegrade.push(doc.id);
          console.log(`🔻 Downgrading ${data.name} to FREE (${daysOverdue} days overdue)`);
          
          await db.collection('businesses').doc(doc.id).update({
            plan: 'free',
            paymentStatus: 'canceled',
            planUpdatedAt: now.toISOString(),
            previousPlan: data.plan, // Guardar plan anterior por si regresa
            downgradedAt: now.toISOString(),
            disabledReason: `Pago vencido desde hace ${daysOverdue} días`,
          });

          // Notificar degradación
          if (data.ownerEmail) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-payment-reminder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'email',
                to: data.ownerEmail,
                businessName: data.name,
                plan: data.plan,
                action: 'downgraded',
              }),
            });
          }
        }
      }
    }

    // Marcar como overdue los que acaban de vencer
    for (const businessId of toMarkOverdue) {
      await db.collection('businesses').doc(businessId).update({
        paymentStatus: 'overdue',
      });
    }

    // Enviar recordatorios de período de gracia
    const reminderResults = await Promise.allSettled(
      overdueReminders.map(async (reminder) => {
        const promises: Promise<any>[] = [];

        // Email
        if (reminder.ownerEmail) {
          promises.push(
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-payment-reminder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'email',
                to: reminder.ownerEmail,
                businessName: reminder.businessName,
                plan: reminder.plan,
                action: 'overdue',
                daysOverdue: reminder.daysOverdue,
                graceDaysLeft: GRACE_PERIOD_DAYS - reminder.daysOverdue,
              }),
            })
          );
        }

        // WhatsApp
        if (reminder.whatsapp) {
          promises.push(
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-payment-reminder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'whatsapp',
                to: reminder.whatsapp,
                businessName: reminder.businessName,
                plan: reminder.plan,
                action: 'overdue',
                daysOverdue: reminder.daysOverdue,
                graceDaysLeft: GRACE_PERIOD_DAYS - reminder.daysOverdue,
              }),
            })
          );
        }

        return Promise.all(promises);
      })
    );

    const remindersSent = reminderResults.filter((r) => r.status === 'fulfilled').length;

    console.log('✅ Expired payment check complete');
    res.status(200).json({
      success: true,
      markedOverdue: toMarkOverdue.length,
      degradedToFree: toDegrade.length,
      overdueRemindersSent: remindersSent,
      gracePeriodBusinesses: overdueReminders.length,
      message: `Processed ${businesses.size} premium businesses`,
    });
  } catch (error) {
    console.error('❌ Error checking expired payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
