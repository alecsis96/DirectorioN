import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getAdminFirestore();

    // Buscar applications
    const appsSnapshot = await db
      .collection('applications')
      .where('ownerEmail', '==', normalizedEmail)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const applications = appsSnapshot.docs.map(doc => ({
      id: doc.id,
      businessName: doc.data().businessName || 'Sin nombre',
      status: doc.data().status || 'pending',
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      type: 'application'
    }));

    // Buscar businesses
    const businessSnapshot = await db
      .collection('businesses')
      .where('ownerEmail', '==', normalizedEmail)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const businesses = businessSnapshot.docs.map(doc => ({
      id: doc.id,
      businessName: doc.data().businessName || 'Sin nombre',
      status: doc.data().status || 'draft',
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      type: 'business'
    }));

    // Combinar y ordenar
    const allItems = [...applications, ...businesses].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    res.status(200).json({ items: allItems });
  } catch (error: any) {
    console.error('[solicitud/[email]] Error:', error);
    res.status(500).json({ error: 'Error al buscar solicitudes' });
  }
}
