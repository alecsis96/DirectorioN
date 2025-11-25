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
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId es requerido' }, { status: 400 });
    }

    const db = getAdminFirestore();
    
    // 1. Obtener datos del negocio antes de eliminar
    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }
    
    const businessData = businessSnap.data();
    const ownerId = businessData?.ownerId;

    // 2. Eliminar todas las reseñas del negocio
    const reviewsSnapshot = await db.collection('reviews')
      .where('businessId', '==', businessId)
      .get();
    
    const reviewDeletePromises = reviewsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(reviewDeletePromises);

    // 3. Eliminar el negocio
    await businessRef.delete();

    // 4. Si tiene ownerId, eliminar el usuario de Firebase Auth
    if (ownerId) {
      try {
        await auth.deleteUser(ownerId);
      } catch (error) {
        console.warn('[delete-business] No se pudo eliminar el usuario:', error);
        // Continuar aunque falle la eliminación del usuario
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Negocio eliminado permanentemente',
      deletedReviews: reviewsSnapshot.size 
    });
  } catch (error: any) {
    console.error('[delete-business] error:', error);
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
