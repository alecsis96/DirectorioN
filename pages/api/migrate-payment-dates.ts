import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../lib/adminOverrides';

/**
 * API para migrar fechas de pago a negocios existentes
 * Solo ejecutable por administradores
 * 
 * POST /api/migrate-payment-dates
 * Body: { dryRun: boolean } // true para simular sin actualizar
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      console.error('[migrate-payment-dates] No token provided');
      return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
    }

    const auth = getAdminAuth();
    let decoded;
    
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (authError: any) {
      console.error('[migrate-payment-dates] Token verification failed:', authError.message);
      return res.status(401).json({ error: 'Token inválido o expirado. Por favor, vuelve a iniciar sesión.' });
    }
    
    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      console.error('[migrate-payment-dates] User is not admin:', decoded.email);
      return res.status(403).json({ error: 'Se requieren permisos de administrador' });
    }

    const { dryRun = false } = req.body;

    console.log(`🚀 Iniciando migración de fechas de pago (dryRun: ${dryRun}) por ${decoded.email}...`);

    const db = getAdminFirestore();
    
    // Obtener todos los negocios con plan de pago
    const snapshot = await db.collection('businesses')
      .where('plan', 'in', ['featured', 'sponsor'])
      .get();

    console.log(`📊 Encontrados ${snapshot.size} negocios con planes de pago`);

    const results = {
      total: snapshot.size,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      businesses: [] as any[]
    };

    // Procesar cada negocio
    for (const doc of snapshot.docs) {
      const business = doc.data();
      const businessId = doc.id;
      const businessName = business.name || business.businessName || businessId;

      // Saltar si ya tiene nextPaymentDate
      if (business.nextPaymentDate) {
        results.skipped++;
        continue;
      }

      try {
        // Calcular fecha de próximo pago
        let nextPaymentDate: Date;
        
        if (business.planUpdatedAt) {
          // Si tiene fecha de actualización de plan, usar esa + 30 días
          const planDate = new Date(business.planUpdatedAt);
          nextPaymentDate = new Date(planDate);
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
        } else if (business.approvedAt) {
          // Si no tiene planUpdatedAt pero tiene approvedAt
          const approvedDate = new Date(business.approvedAt);
          nextPaymentDate = new Date(approvedDate);
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
        } else {
          // Si no, usar fecha actual + 30 días
          nextPaymentDate = new Date();
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
        }

        // Preparar actualización
        const updateData: any = {
          nextPaymentDate: nextPaymentDate.toISOString(),
          isActive: business.isActive !== undefined ? business.isActive : true,
          paymentStatus: business.paymentStatus || 'active',
        };

        // Si tiene planUpdatedAt, usarlo como lastPaymentDate
        if (business.planUpdatedAt) {
          updateData.lastPaymentDate = business.planUpdatedAt;
        } else if (business.approvedAt) {
          updateData.lastPaymentDate = business.approvedAt;
        }

        // Actualizar documento (solo si no es dry run)
        if (!dryRun) {
          await db.collection('businesses').doc(businessId).update(updateData);
        }

        results.businesses.push({
          id: businessId,
          name: businessName,
          plan: business.plan,
          nextPaymentDate: nextPaymentDate.toISOString(),
          wasUpdated: !dryRun
        });

        results.updated++;
      } catch (error: any) {
        const errorMsg = `Error en ${businessName}: ${error.message}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    // Log resumen
    console.log('\n📈 RESUMEN DE MIGRACIÓN');
    console.log(`✅ Actualizados: ${results.updated}`);
    console.log(`⏭️  Saltados: ${results.skipped}`);
    console.log(`❌ Errores: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.error('Errores detallados:', results.errors);
    }

    return res.status(200).json({
      success: true,
      dryRun,
      results,
      message: dryRun 
        ? 'Simulación completada (no se realizaron cambios)'
        : 'Migración completada exitosamente'
    });

  } catch (error: any) {
    console.error('[migrate-payment-dates] Error fatal:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor',
      details: error.stack
    });
  }
}
