import { describe, expect, it, vi } from 'vitest';

import {
  duplicateLabelForTelegram,
  evaluateApplicationDuplicateRisk,
} from '../functions/src/applicationRiskAssessment';
import { sendApplicationV2TelegramAlert } from '../functions/src/telegramNotifications';
import { buildApprovedApplicationWhatsAppUrl } from '../lib/adminApplicationContact';
import { parsePublicApplicationTurnstileMode } from '../lib/featureFlags';
import { verifyPublicApplicationTurnstile } from '../lib/server/turnstile';

const sourceApplication = {
  ownerEmail: 'contacto@example.com',
  ownerName: 'Persona',
  ownerPhone: '+529191234567',
  business: {
    businessName: 'Café Central',
    categoryId: 'cafeteria',
    phone: '9191234567',
    whatsapp: '9191234567',
  },
};

describe('0.2R.2.1 Turnstile modes', () => {
  it('defaults unknown configuration to off', () => {
    expect(parsePublicApplicationTurnstileMode(undefined)).toBe('off');
    expect(parsePublicApplicationTurnstileMode('invalid')).toBe('off');
    expect(parsePublicApplicationTurnstileMode('observe')).toBe('observe');
    expect(parsePublicApplicationTurnstileMode('enforce')).toBe('enforce');
  });

  it('keeps off and observe non-blocking while enforce fails closed', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 }));

    await expect(verifyPublicApplicationTurnstile({ mode: 'off', fetchImpl }))
      .resolves.toMatchObject({ ok: true, valid: false, reason: 'disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(verifyPublicApplicationTurnstile({
      mode: 'observe', token: 'invalid-token', secret: 'server-secret', fetchImpl,
    })).resolves.toMatchObject({ ok: true, valid: false, reason: 'invalid' });

    await expect(verifyPublicApplicationTurnstile({
      mode: 'enforce', token: 'invalid-token', secret: 'server-secret', fetchImpl,
    })).resolves.toMatchObject({ ok: false, valid: false, reason: 'invalid' });

    await expect(verifyPublicApplicationTurnstile({ mode: 'enforce', token: 'token' }))
      .resolves.toMatchObject({ ok: false, reason: 'missing_secret' });
  });

  it('requires the expected hostname and action without logging the token', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const validFetch = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      hostname: 'www.yajagon.com',
      action: 'public_application',
    }), { status: 200 }));
    const result = await verifyPublicApplicationTurnstile({
      mode: 'enforce',
      token: 'ephemeral-sensitive-token',
      secret: 'server-secret',
      allowedHostnames: 'www.yajagon.com,yajagon.com',
      fetchImpl: validFetch,
    });
    expect(result).toEqual({ ok: true, valid: true });
    expect(consoleSpy).not.toHaveBeenCalled();

    const wrongAction = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      hostname: 'www.yajagon.com',
      action: 'another_action',
    }), { status: 200 }));
    await expect(verifyPublicApplicationTurnstile({
      mode: 'enforce', token: 'another-token', secret: 'server-secret', fetchImpl: wrongAction,
    })).resolves.toMatchObject({ ok: false, reason: 'action' });
    consoleSpy.mockRestore();
  });
});

describe('0.2R.2.1 duplicate signals', () => {
  it('treats email alone as informational and never as a blocking decision', () => {
    const assessment = evaluateApplicationDuplicateRisk('new-application', sourceApplication, [{
      type: 'application',
      id: 'another-application',
      data: {
        ownerEmail: 'contacto@example.com',
        ownerPhone: '9999999999',
        business: { businessName: 'Otro negocio', categoryId: 'otro' },
      },
    }]);
    expect(assessment).toMatchObject({ riskLevel: 'low', riskScore: 20 });
    expect(assessment).not.toHaveProperty('blocked');
    expect(assessment).not.toHaveProperty('ownerId');
    expect(duplicateLabelForTelegram(assessment)).toBe('sin coincidencias');
  });

  it('marks combined contact and name/category matches as high for human review', () => {
    const assessment = evaluateApplicationDuplicateRisk('new-application', sourceApplication, [{
      type: 'business',
      id: 'business-candidate',
      data: {
        name: 'Cafe Central',
        categoryId: 'cafeteria',
        WhatsApp: '+52 919 123 4567',
      },
    }]);
    expect(assessment).toMatchObject({ riskLevel: 'high', riskScore: 100 });
    expect(assessment.signals.map((signal) => signal.code)).toEqual([
      'contact_match',
      'name_category_match',
    ]);
    expect(duplicateLabelForTelegram(assessment)).toBe('alto');
    expect(duplicateLabelForTelegram(null)).toBe('revisar');
  });
});

describe('0.2R.2.1 operational channels', () => {
  it('sends only a privacy-minimized Telegram alert and panel link', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.text).toContain('Duplicado: revisar');
      expect(body.text).not.toMatch(/contacto@example|9191234567|claim|ownerId|UID/i);
      expect(body.reply_markup.inline_keyboard[0][0].url).toBe('https://www.yajagon.com/admin/solicitudes');
      expect(body.protect_content).toBe(true);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 321 } }), { status: 200 });
    });

    await expect(sendApplicationV2TelegramAlert({
      enabled: true,
      botToken: 'bot-secret',
      chatId: 'admin-chat',
      publicReference: 'YJG-2026-ABC2345678',
      businessName: 'Café Central contacto@example.com 9191234567',
      category: 'Cafetería https://example.com',
      duplicateLabel: 'revisar',
      fetchImpl,
    })).resolves.toEqual({ sent: true, skipped: false, messageId: 321 });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('keeps Telegram disabled without calling the network', async () => {
    const fetchImpl = vi.fn();
    await expect(sendApplicationV2TelegramAlert({
      enabled: false,
      publicReference: 'YJG-2026-ABC2345678',
      businessName: 'Café Central',
      category: 'Cafetería',
      duplicateLabel: 'sin coincidencias',
      fetchImpl,
    })).resolves.toEqual({ sent: false, skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('builds a manual wa.me link without claim or ownership material', () => {
    const url = buildApprovedApplicationWhatsAppUrl({
      publicReference: 'YJG-2026-ABC2345678',
      ownerName: 'Persona',
      ownerPhone: '9191234567',
      business: { businessName: 'Café Central https://example.com/reclamar-negocio#token=secret' },
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/529191234567\?text=/);
    const decoded = decodeURIComponent(url || '');
    expect(decoded).toContain('La solicitud fue aprobada');
    expect(decoded).not.toMatch(/claim|ownerId|ownership|reclamar-negocio|#token=/i);
  });
});
