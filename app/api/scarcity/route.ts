import { NextRequest, NextResponse } from 'next/server';
import { canUpgradeToPlan } from '@/lib/scarcitySystem';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const plan = searchParams.get('plan') as 'featured' | 'sponsor';

    if (!categoryId || !plan) {
      return NextResponse.json(
        { error: 'Missing categoryId or plan parameter' },
        { status: 400 }
      );
    }

    if (plan !== 'featured' && plan !== 'sponsor') {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "featured" or "sponsor"' },
        { status: 400 }
      );
    }

    const result = await canUpgradeToPlan(categoryId, plan);

    return NextResponse.json({
      canUpgrade: result.allowed,
      slotsLeft: result.slotsLeft,
      totalSlots: result.totalSlots,
      message: result.message,
      urgencyLevel: result.urgencyLevel,
    });
  } catch (error) {
    console.error('Error checking scarcity:', error);
    return NextResponse.json(
      { error: 'Internal server error', canUpgrade: true, slotsLeft: 999 },
      { status: 500 }
    );
  }
}
