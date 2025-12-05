import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../lib/adminOverrides';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const businessData = await req.json();

    // Validaciones básicas
    if (!businessData.name || !businessData.ownerEmail || !businessData.category) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: name, ownerEmail, category' },
        { status: 400 }
      );
    }

    // Preparar datos del negocio
    const newBusiness = {
      // Nombres
      name: businessData.name,
      businessName: businessData.name,
      
      // Propietario
      ownerName: businessData.ownerName || '',
      ownerEmail: businessData.ownerEmail,
      ownerPhone: businessData.ownerPhone || '',
      
      // Información del negocio
      category: businessData.category,
      description: businessData.description || '',
      
      // Ubicación
      address: businessData.address || '',
      colonia: businessData.colonia || '',
      municipio: businessData.municipio || 'Culiacán',
      lat: businessData.lat || null,
      lng: businessData.lng || null,
      
      // Contacto
      phone: businessData.phone || '',
      whatsapp: businessData.whatsapp || '',
      emailContact: businessData.ownerEmail,
      
      // Estado y plan
      status: 'published',
      plan: businessData.plan || 'free',
      featured: businessData.plan === 'featured' || businessData.plan === 'sponsor',
      published: true,
      isActive: true,
      
      // Metadata
      createdAt: new Date(),
      createdBy: 'admin',
      adminCreator: decoded.email,
      approvedAt: new Date(),
      
      // Estadísticas
      viewCount: 0,
      reviewCount: 0,
      avgRating: 0,
      
      // Campos opcionales
      tags: [],
      socialMedia: {},
      horarios: {},
      paymentMethods: [],
      services: [],
      images: [],
      logo: '',
      coverImage: ''
    };

    // Crear el negocio en Firestore
    const docRef = await db.collection('businesses').add(newBusiness);

    console.log(`[admin/create-business] Negocio creado: ${docRef.id} por ${decoded.email}`);

    return NextResponse.json({
      success: true,
      businessId: docRef.id,
      message: 'Negocio creado exitosamente'
    });

  } catch (error: any) {
    console.error('[admin/create-business] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear el negocio: ' + error.message },
      { status: 500 }
    );
  }
}
