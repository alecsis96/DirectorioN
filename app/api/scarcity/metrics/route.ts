import { NextRequest, NextResponse } from 'next/server';
import { getScarcityMetrics } from '@/lib/scarcitySystem';
import { MONETIZATION_FEATURE_ENABLED } from '@/lib/featureFlags';

export async function GET(request: NextRequest) {
  if (!MONETIZATION_FEATURE_ENABLED) {
    return NextResponse.json(
      { error: 'Monetization is temporarily disabled', code: 'MONETIZATION_DISABLED' },
      { status: 503 }
    );
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Missing categoryId parameter' },
        { status: 400 }
      );
    }

    const metrics = await getScarcityMetrics(categoryId);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching scarcity metrics:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        totalBusinesses: 0,
        byPlan: { free: 0, featured: 0, sponsor: 0 },
        saturation: { featured: 0, sponsor: 0 },
        competitionLevel: 'low' as const,
      },
      { status: 500 }
    );
  }
}
