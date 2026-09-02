import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { PUBLIC_APPLICATION_V2_ENABLED } from '../../../lib/featureFlags';
import {
  PUBLIC_APPLICATION_MAX_BODY_BYTES,
  PublicApplicationIntakeError,
  PublicApplicationSubmissionSchema,
  submitPublicApplicationV2,
} from '../../../lib/server/publicApplicationIntake';

export const runtime = 'nodejs';

function getClientIdentifier(request: NextRequest): string {
  const platformForwarded = request.headers.get('x-vercel-forwarded-for');
  const forwarded = platformForwarded || request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function createPublicApplicationPostHandler(dependencies: {
  enabled: boolean;
  submit: typeof submitPublicApplicationV2;
}) {
  return async function publicApplicationPost(request: NextRequest) {
    if (!dependencies.enabled) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    }

    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return NextResponse.json({ ok: false, code: 'UNSUPPORTED_MEDIA_TYPE' }, { status: 415 });
    }

    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > PUBLIC_APPLICATION_MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, code: 'BODY_TOO_LARGE' }, { status: 413 });
    }

    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > PUBLIC_APPLICATION_MAX_BODY_BYTES) {
        return NextResponse.json({ ok: false, code: 'BODY_TOO_LARGE' }, { status: 413 });
      }

      const body = PublicApplicationSubmissionSchema.parse(JSON.parse(rawBody));
      const idempotencyKey = request.headers.get('idempotency-key') || '';
      const result = await dependencies.submit(
        body,
        { idempotencyKey, clientIdentifier: getClientIdentifier(request) },
        { requestHeaders: request.headers },
      );

      if (!result.accepted) {
        // Respuesta deliberadamente indistinguible para bots; no se persistió nada.
        return NextResponse.json({ ok: true, received: true }, { status: 202 });
      }

      return NextResponse.json({
        ok: true,
        received: true,
        folio: result.publicReference,
      });
    } catch (error) {
      if (error instanceof PublicApplicationIntakeError) {
        if (error.code === 'RATE_LIMITED') {
          return NextResponse.json({ ok: false, code: error.code }, { status: 429 });
        }
        if (error.code === 'IDEMPOTENCY_KEY_REUSED') {
          return NextResponse.json({ ok: false, code: error.code }, { status: 409 });
        }
        return NextResponse.json({ ok: false, code: error.code }, { status: 400 });
      }
      if (error instanceof ZodError || error instanceof SyntaxError) {
        return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 400 });
      }
      console.error('public application intake failed', error);
      return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
    }
  };
}

// No CAPTCHA/App Check dependency is available in this repository yet. The
// verifier interface lives in the server service so 0.2R.3 can add one without
// trusting a client boolean. Persistent throttling + honeypot are active now.
export const POST = createPublicApplicationPostHandler({
  enabled: PUBLIC_APPLICATION_V2_ENABLED,
  submit: submitPublicApplicationV2,
});
