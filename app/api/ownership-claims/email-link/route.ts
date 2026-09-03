import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  EMAIL_LINK_AUTH_ENABLED,
  OWNERSHIP_CLAIMS_ENABLED,
} from '../../../../lib/featureFlags';
import {
  sendOwnershipEmailSignInLink,
} from '../../../../lib/server/ownershipEmailLink';

export const runtime = 'nodejs';

const EmailLinkRequestSchema = z.object({
  token: z.string().min(1).max(128),
}).strict();

export async function POST(request: Request) {
  if (!OWNERSHIP_CLAIMS_ENABLED || !EMAIL_LINK_AUTH_ENABLED) {
    return NextResponse.json({ ok: false, code: 'INVITATION_NOT_AVAILABLE' }, { status: 404 });
  }
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 2048) {
      return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 413 });
    }
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
    const parsed = EmailLinkRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 400 });
    }
    try {
      await sendOwnershipEmailSignInLink(parsed.data.token);
    } catch {
      // Respuesta indistinguible: no revela existencia, estado, correo ni entrega.
    }
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 400 });
  }
}
