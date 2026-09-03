import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  EMAIL_LINK_AUTH_ENABLED,
  OWNERSHIP_CLAIMS_ENABLED,
} from '../../../../lib/featureFlags';
import {
  extractBearerToken,
  verifyRevocationCheckedIdTokenOrThrow,
} from '../../../../lib/server/authorization';
import {
  RedeemOwnershipClaimError,
  redeemOwnershipClaim,
} from '../../../../lib/server/ownershipClaimRedeem';

export const runtime = 'nodejs';

const RedeemRequestSchema = z
  .object({ token: z.string().min(1).max(128) })
  .strict();

const statusByCode = {
  OWNERSHIP_CLAIMS_DISABLED: 404,
  CLAIM_TOKEN_INVALID: 400,
  CLAIM_INVALID: 400,
  CLAIM_EMAIL_NOT_VERIFIED: 403,
  CLAIM_EMAIL_MISMATCH: 403,
  CLAIM_EXPIRED: 410,
  CLAIM_REVOKED: 410,
  CLAIM_ALREADY_USED: 409,
  BUSINESS_ALREADY_CLAIMED: 409,
  CLAIM_INTEGRITY_ERROR: 409,
} as const;

export async function POST(request: Request) {
  if (!OWNERSHIP_CLAIMS_ENABLED || !EMAIL_LINK_AUTH_ENABLED) {
    return NextResponse.json({ ok: false, code: 'OWNERSHIP_CLAIMS_DISABLED' }, { status: 404 });
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 2048) {
      return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 413 });
    }
    const decoded = await verifyRevocationCheckedIdTokenOrThrow(extractBearerToken(request.headers));
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 2048) {
      return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 400 });
    }
    const parsed = RedeemRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 400 });
    }

    const result = await redeemOwnershipClaim(parsed.data.token, {
      uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email : '',
      emailVerified: decoded.email_verified === true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof RedeemOwnershipClaimError) {
      return NextResponse.json(
        { ok: false, code: error.code },
        { status: statusByCode[error.code] },
      );
    }
    if (error && typeof error === 'object' && 'status' in error) {
      const status = Number((error as { status: unknown }).status);
      if (status === 401 || status === 403) {
        return NextResponse.json({ ok: false, code: 'AUTHENTICATION_REQUIRED' }, { status });
      }
    }
    return NextResponse.json({ ok: false, code: 'REDEEM_FAILED' }, { status: 500 });
  }
}
