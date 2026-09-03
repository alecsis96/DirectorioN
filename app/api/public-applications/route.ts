import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  PUBLIC_APPLICATION_TURNSTILE_MODE,
  PUBLIC_APPLICATION_V2_ENABLED,
} from '../../../lib/featureFlags';
import {
  PUBLIC_APPLICATION_MAX_BODY_BYTES,
  PublicApplicationIntakeError,
  PublicApplicationRequestSchema,
  submitPublicApplicationV2,
} from '../../../lib/server/publicApplicationIntake';
import { verifyPublicApplicationTurnstile } from '../../../lib/server/turnstile';

export const runtime = 'nodejs';

function getClientIdentifier(request: NextRequest): string {
  const platformForwarded = request.headers.get('x-vercel-forwarded-for');
  const forwarded = platformForwarded || request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function createPublicApplicationPostHandler(dependencies: {
  enabled: boolean;
  submit: typeof submitPublicApplicationV2;
  turnstile?: {
    mode: 'off' | 'observe' | 'enforce';
    verify: typeof verifyPublicApplicationTurnstile;
  };
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

      const requestBody = PublicApplicationRequestSchema.parse(JSON.parse(rawBody));
      const { turnstileToken, ...body } = requestBody;
      const idempotencyKey = request.headers.get('idempotency-key') || '';
      const result = await dependencies.submit(
        body,
        { idempotencyKey, clientIdentifier: getClientIdentifier(request) },
        {
          requestHeaders: request.headers,
          challengeToken: turnstileToken,
          challengeVerifier: dependencies.turnstile
            ? {
                verify: async ({ token, clientIdentifier }) => {
                  const verification = await dependencies.turnstile!.verify({
                    mode: dependencies.turnstile!.mode,
                    token,
                    remoteIp: clientIdentifier,
                    secret: process.env.TURNSTILE_SECRET_KEY,
                    allowedHostnames: process.env.TURNSTILE_ALLOWED_HOSTNAMES,
                  });
                  if (dependencies.turnstile!.mode === 'observe' && !verification.valid) {
                    console.warn('public application Turnstile observation', {
                      valid: false,
                      reason: verification.reason || 'unknown',
                    });
                  }
                  return verification;
                },
              }
            : undefined,
        },
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

export const POST = createPublicApplicationPostHandler({
  enabled: PUBLIC_APPLICATION_V2_ENABLED,
  submit: submitPublicApplicationV2,
  turnstile: {
    mode: PUBLIC_APPLICATION_TURNSTILE_MODE,
    verify: verifyPublicApplicationTurnstile,
  },
});
