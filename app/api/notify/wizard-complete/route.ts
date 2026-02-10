/**
 * API Route: POST /api/notify/wizard-complete
 * 
 * Endpoint seguro para enviar notificaciones cuando se completa el wizard de registro
 * 
 * Features:
 * - Validación de autenticación (Firebase Auth)
 * - Verificación de que el business existe en Firestore
 * - Idempotencia (no duplica notificaciones)
 * - Soporte para Twilio y CallMeBot
 * - Fallback a Slack opcional
 * - Logs en Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';
import { 
  sendWizardCompleteNotification, 
  sendSlackFallback,
  type NotificationPayload 
} from '../../../../lib/whatsapp/notificationService';

interface RequestBody {
  businessId: string;
  businessName: string;
  category?: string;
  phone?: string;
  ownerName?: string;
  ownerEmail?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const auth = getAdminAuth();
    
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // 2. Parsear body
    let body: RequestBody;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 3. Validar campos requeridos
    if (!body.businessId || !body.businessName) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, businessName' },
        { status: 400 }
      );
    }

    // 4. Verificar que el business existe (puede estar en applications o businesses)
    const db = getAdminFirestore();
    
    // Buscar en applications primero (wizard)
    let businessDoc = await db.doc(`applications/${decoded.uid}`).get();
    
    // Si no está en applications, buscar en businesses (ya aprobado)
    if (!businessDoc.exists) {
      businessDoc = await db.doc(`businesses/${body.businessId}`).get();
    }

    // Si tampoco está en businesses, buscar por businessId en applications
    if (!businessDoc.exists) {
      const applicationsSnapshot = await db
        .collection('applications')
        .where('businessId', '==', body.businessId)
        .limit(1)
        .get();
      
      if (!applicationsSnapshot.empty) {
        businessDoc = applicationsSnapshot.docs[0];
      }
    }

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found', businessId: body.businessId },
        { status: 404 }
      );
    }

    // 5. Verificar que el usuario es el owner (o admin)
    const businessData = businessDoc.data();
    const isOwner = businessData?.ownerId === decoded.uid || businessData?.ownerUid === decoded.uid;
    const isAdmin = decoded.email && (
      decoded.email === process.env.ADMIN_EMAIL ||
      process.env.ADMIN_EMAILS?.split(',').includes(decoded.email)
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You are not the owner of this business' },
        { status: 403 }
      );
    }

    // 6. Preparar payload
    const payload: NotificationPayload = {
      businessId: body.businessId,
      businessName: body.businessName,
      category: body.category,
      phone: body.phone,
      ownerName: body.ownerName || businessData?.ownerName || decoded.name,
      ownerEmail: body.ownerEmail || businessData?.ownerEmail || decoded.email,
      timestamp: body.timestamp || new Date().toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };

    // 7. Enviar notificación WhatsApp con idempotencia
    const whatsappResult = await sendWizardCompleteNotification(payload);

    // 8. Si WhatsApp falla o como backup, enviar Slack
    let slackSent = false;
    if (!whatsappResult.sent || process.env.SLACK_ALWAYS_SEND === 'true') {
      slackSent = await sendSlackFallback(payload);
    }

    // 9. Respuesta
    return NextResponse.json({
      success: true,
      whatsapp: {
        sent: whatsappResult.sent,
        duplicate: whatsappResult.duplicate,
        error: whatsappResult.error,
      },
      slack: {
        sent: slackSent,
      },
      businessId: body.businessId,
      timestamp: payload.timestamp,
    });

  } catch (error) {
    console.error('[API /api/notify/wizard-complete] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Solo permitir POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
