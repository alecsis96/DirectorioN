import { NextRequest, NextResponse } from 'next/server';
import { getScarcityMetrics } from '@/lib/scarcitySystem';

export async function GET(request: NextRequest) {
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
