import { NextRequest, NextResponse } from 'next/server';
import { canUpgradeToPlan } from '@/lib/scarcitySystem';
import type { Zone } from '@/lib/scarcitySystem';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const plan = searchParams.get('plan') as 'featured' | 'sponsor' | 'free';
    const zone = searchParams.get('zone') as Zone | null;
    const specialty = searchParams.get('specialty');

    if (!categoryId || !plan) {
      return NextResponse.json(
        { error: 'Missing categoryId or plan parameter' },
        { status: 400 }
      );
    }

    if (plan !== 'featured' && plan !== 'sponsor' && plan !== 'free') {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "featured", "sponsor", or "free"' },
        { status: 400 }
      );
    }

    const result = await canUpgradeToPlan(
      categoryId, 
      plan, 
      zone || undefined, 
      specialty || undefined
    );

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
