import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../../lib/adminOverrides';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return null;
  }

  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifyIdToken(token);
    if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) {
      return decoded;
    }
  } catch (error) {
    console.error('[admin/reports/update] auth error', error);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reportId, status, reviewNotes } = body;

    if (!reportId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const reportRef = db.collection('businessReports').doc(reportId);

    const updateData: any = {
      status,
      updatedAt: new Date(),
      reviewedBy: user.email,
      reviewedAt: new Date(),
    };

    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes;
    }

    await reportRef.update(updateData);

    return NextResponse.json({ success: true, message: 'Report updated successfully' });

  } catch (error) {
    console.error('[admin/reports/update] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
