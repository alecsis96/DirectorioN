import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    
    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId' });
    }

    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessData = businessDoc.data();
    const ownerId = businessData?.ownerId;

    // Eliminar el negocio
    await businessRef.delete();

    // Eliminar reseñas asociadas
    const reviewsSnapshot = await db.collection('reviews')
      .where('businessId', '==', businessId)
      .get();
    
    const reviewDeletePromises = reviewsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(reviewDeletePromises);

    // Eliminar el usuario dueño si existe
    if (ownerId) {
      try {
        await auth.deleteUser(ownerId);
        console.log(`Deleted user: ${ownerId}`);
      } catch (userError) {
        console.error('Error deleting user:', userError);
        // Continuar aunque falle la eliminación del usuario
      }
    }

    console.log(`✅ Business ${businessId} and owner ${ownerId} deleted by ${decoded.email}`);
    
    return res.status(200).json({ 
      success: true,
      deletedBusiness: businessId,
      deletedReviews: reviewDeletePromises.length,
      deletedOwner: ownerId || null,
    });
  } catch (error: any) {
    console.error('[delete-business] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
