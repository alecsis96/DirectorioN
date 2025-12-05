import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../../../lib/adminOverrides';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { businessId: string; reviewId: string } | Promise<{ businessId: string; reviewId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { businessId, reviewId } = resolvedParams;

    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const auth = getAdminAuth();
    
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar que sea admin
    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Eliminar la reseña
    const db = getAdminFirestore();
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('reviews')
      .doc(reviewId)
      .delete();

    return NextResponse.json({ 
      success: true, 
      message: 'Reseña eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error eliminando reseña:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la reseña' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { businessId: string; reviewId: string } | Promise<{ businessId: string; reviewId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { businessId, reviewId } = resolvedParams;
    const body = await request.json();
    const { approved } = body;

    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const auth = getAdminAuth();
    
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar que sea admin
    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Actualizar la reseña
    const db = getAdminFirestore();
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('reviews')
      .doc(reviewId)
      .update({ approved });

    return NextResponse.json({ 
      success: true, 
      message: 'Reseña actualizada exitosamente' 
    });
  } catch (error) {
    console.error('Error actualizando reseña:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la reseña' },
      { status: 500 }
    );
  }
}
