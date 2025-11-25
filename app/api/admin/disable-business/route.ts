import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../lib/adminOverrides';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!token) {
      return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    
    // Verificar que sea admin
    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { businessId, reason } = body;

    if (!businessId || !reason) {
      return NextResponse.json({ error: 'businessId y reason son requeridos' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    
    await businessRef.update({
      isActive: false,
      disabledReason: reason,
      disabledAt: new Date().toISOString(),
      disabledBy: decoded.uid,
    });

    return NextResponse.json({ ok: true, message: 'Negocio deshabilitado' });
  } catch (error: any) {
    console.error('[disable-business] error:', error);
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
