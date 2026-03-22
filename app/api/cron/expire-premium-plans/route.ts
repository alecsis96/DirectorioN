import { NextResponse } from 'next/server';

import { downgradeExpiredPremiumPlans } from '@/lib/server/premiumPlanExpiry';

export const runtime = 'nodejs';

function isAuthorized(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return false;

  const bearer = request.headers.get('authorization');
  const headerSecret = request.headers.get('x-cron-secret');

  return (
    bearer === `Bearer ${configuredSecret}` ||
    headerSecret === configuredSecret
  );
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await downgradeExpiredPremiumPlans({ force: true });
    return NextResponse.json({
      ok: true,
      checked: result.checked,
      downgraded: result.downgraded,
    });
  } catch (error) {
    console.error('[cron/expire-premium-plans] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
