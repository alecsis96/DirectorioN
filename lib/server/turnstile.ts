import { randomUUID } from 'node:crypto';

import type { PublicApplicationTurnstileMode } from '../featureFlags';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ACTION = 'public_application';
const TURNSTILE_TOKEN_MAX_LENGTH = 2_048;

type TurnstileSiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

export type TurnstileVerificationResult = {
  ok: boolean;
  valid: boolean;
  reason?: 'disabled' | 'missing_token' | 'missing_secret' | 'request_failed' | 'invalid' | 'hostname' | 'action';
};

function allowedHostnames(value: string | undefined): Set<string> {
  return new Set(
    (value || 'www.yajagon.com,yajagon.com')
      .split(',')
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

function modeResult(
  mode: PublicApplicationTurnstileMode,
  valid: boolean,
  reason?: TurnstileVerificationResult['reason'],
): TurnstileVerificationResult {
  return { ok: valid || mode !== 'enforce', valid, reason };
}

export async function verifyPublicApplicationTurnstile(input: {
  mode: PublicApplicationTurnstileMode;
  token?: string;
  remoteIp?: string;
  secret?: string;
  allowedHostnames?: string;
  fetchImpl?: typeof fetch;
}): Promise<TurnstileVerificationResult> {
  if (input.mode === 'off') return { ok: true, valid: false, reason: 'disabled' };

  const token = input.token?.trim() || '';
  if (!token || token.length > TURNSTILE_TOKEN_MAX_LENGTH) {
    return modeResult(input.mode, false, 'missing_token');
  }

  const secret = input.secret?.trim() || '';
  if (!secret) return modeResult(input.mode, false, 'missing_secret');

  const form = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: randomUUID(),
  });
  if (input.remoteIp && input.remoteIp !== 'unknown') form.set('remoteip', input.remoteIp);

  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return modeResult(input.mode, false, 'request_failed');
  }

  let result: TurnstileSiteverifyResponse;
  try {
    result = await response.json() as TurnstileSiteverifyResponse;
  } catch {
    return modeResult(input.mode, false, 'request_failed');
  }

  if (!response.ok || result.success !== true) {
    return modeResult(input.mode, false, 'invalid');
  }

  if (!result.hostname || !allowedHostnames(input.allowedHostnames).has(result.hostname.toLowerCase())) {
    return modeResult(input.mode, false, 'hostname');
  }
  if (result.action !== TURNSTILE_ACTION) {
    return modeResult(input.mode, false, 'action');
  }

  return { ok: true, valid: true };
}
