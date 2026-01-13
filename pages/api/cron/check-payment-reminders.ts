import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/server/firebaseAdmin';

/**
 * Cron job para verificar pagos próximos a vencer
 * Se ejecuta diariamente para enviar recordatorios por email y WhatsApp
 * Notifica 7, 3 y 1 días antes del vencimiento
 */

const REMINDER_DAYS = [7, 3, 1]; // Días antes de vencer para enviar recordatorio

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar que sea una petición de cron o tenga autorización
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔔 Starting payment reminder check...');
    
    const now = new Date();
    const businesses = await db.collection('businesses')
      .where('plan', 'in', ['featured', 'sponsor'])
      .where('paymentStatus', '==', 'active')
      .where('isActive', '==', true)
      .get();

    const reminders: Array<{
      businessId: string;
      businessName: string;
      ownerEmail: string;
      phone: string | null;
      whatsapp: string | null;
      plan: string;
      daysUntilDue: number;
      nextPaymentDate: Date;
    }> = [];

    businesses.forEach((doc) => {
      const data = doc.data();
      const nextPaymentDate = data.nextPaymentDate?.toDate?.() || null;
      
      if (!nextPaymentDate) return;

      const daysUntilDue = Math.floor((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Verificar si debe enviar recordatorio
      if (REMINDER_DAYS.includes(daysUntilDue)) {
        reminders.push({
          businessId: doc.id,
          businessName: data.name || 'Tu negocio',
          ownerEmail: data.ownerEmail,
          phone: data.phone || null,
          whatsapp: data.WhatsApp || null,
          plan: data.plan,
          daysUntilDue,
          nextPaymentDate,
        });
      }
    });

    console.log(`📊 Found ${reminders.length} businesses needing reminders`);

    // Enviar notificaciones
    const results = await Promise.allSettled(
      reminders.map(async (reminder) => {
        const promises: Promise<any>[] = [];

        // Enviar email
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
                daysUntilDue: reminder.daysUntilDue,
                nextPaymentDate: reminder.nextPaymentDate.toISOString(),
              }),
            })
          );
        }

        // Enviar WhatsApp
        const whatsappNumber = reminder.whatsapp || reminder.phone;
        if (whatsappNumber) {
          promises.push(
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-payment-reminder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'whatsapp',
                to: whatsappNumber,
                businessName: reminder.businessName,
                plan: reminder.plan,
                daysUntilDue: reminder.daysUntilDue,
                nextPaymentDate: reminder.nextPaymentDate.toISOString(),
              }),
            })
          );
        }

        await Promise.all(promises);

        // Registrar en Firestore que se envió el recordatorio
        await db.collection('businesses').doc(reminder.businessId).update({
          [`paymentReminders.${reminder.daysUntilDue}days`]: new Date(),
        });

        return { businessId: reminder.businessId, success: true };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Reminders sent: ${successful} successful, ${failed} failed`);

    return res.status(200).json({
      ok: true,
      totalReminders: reminders.length,
      successful,
      failed,
      reminders: reminders.map(r => ({
        businessName: r.businessName,
        daysUntilDue: r.daysUntilDue,
      })),
    });

  } catch (error) {
    console.error('❌ Error checking payment reminders:', error);
    return res.status(500).json({ 
      error: 'Failed to check payment reminders',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
