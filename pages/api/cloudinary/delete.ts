import type { NextApiRequest, NextApiResponse } from 'next';
import { rateLimit } from '../../../lib/rateLimit';
import { csrfProtection } from '../../../lib/csrfProtection';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 30 });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CSRF Protection
  if (!csrfProtection(req, res)) return;

  // Rate limiting: 30 requests per minute
  if (!limiter.check(req, res, 30)) return;

  try {
    const { publicId } = req.body;

    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid publicId' });
    }

    // Validar formato de publicId (prevenir path traversal)
    if (publicId.includes('..') || publicId.startsWith('/') || publicId.length > 200) {
      return res.status(400).json({ error: 'Invalid publicId format' });
    }

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/destroy`;

    const timestamp = Math.round(Date.now() / 1000);
    const signature = generateSignature(publicId, timestamp);

    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', process.env.CLOUDINARY_API_KEY!);
    formData.append('signature', signature);

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary delete error:', data);
      return res.status(response.status).json({ 
        error: 'Failed to delete image from Cloudinary',
        details: data 
      });
    }

    res.status(200).json({ 
      success: true, 
      result: data.result,
      message: 'Image deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// Generar firma para Cloudinary API
function generateSignature(publicId: string, timestamp: number): string {
  const crypto = require('crypto');
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  
  return crypto
    .createHash('sha1')
    .update(stringToSign)
    .digest('hex');
}
