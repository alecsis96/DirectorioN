import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';

const LAST_STEP_INDEX = 3;

type SubmitMode = 'wizard' | 'application';

type SubmitBody = {
  formData: Record<string, unknown>;
  step?: number;
  mode?: SubmitMode;
};

function resolveMode(mode: unknown): SubmitMode {
  return mode === 'application' ? 'application' : 'wizard';
}

function buildSummary(formData: Record<string, unknown>, email: string, uid: string) {
  const businessName = String(formData.businessName ?? 'Negocio sin nombre');
  const ownerName = String(formData.ownerName ?? formData.displayName ?? 'Propietario desconocido');
  const ownerEmail = String(formData.ownerEmail ?? formData.email ?? email ?? uid);
  const ownerPhone = String(
    formData.ownerPhone ?? formData.whatsappNumber ?? formData.whatsapp ?? ''
  );
  const plan = String(formData.plan ?? 'free');

  return `Nuevo registro enviado\nNegocio: ${businessName}\nPropietario: ${ownerName}\nCorreo: ${ownerEmail}\nTelefono: ${ownerPhone}\nPlan: ${plan}`;
}

// Requires SLACK_WEBHOOK_URL or NOTIFY_WEBHOOK_URL in the environment.
async function sendWebhook(summary: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL ?? process.env.NOTIFY_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: summary }),
  });

  return response.ok;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);

    const body = req.body as SubmitBody | undefined;
    const { formData, step, mode: rawMode } = body ?? {};
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ error: 'Missing form data' });
    }

    const mode = resolveMode(rawMode);
    const db = getAdminFirestore();

    if (mode === 'application') {
      const docRef = db.doc(`applications/${decoded.uid}`);
      const snapshot = await docRef.get();
      const existing = snapshot.exists ? (snapshot.data() as Record<string, unknown>) : null;
      const now = new Date();

      const statusFromRequest = typeof formData.status === 'string' ? formData.status : undefined;
      const statusFromDb = typeof existing?.status === 'string' ? String(existing.status) : undefined;
      const status = statusFromRequest ?? statusFromDb ?? 'pending';

      const applicationPayload: Record<string, unknown> = {
        uid: decoded.uid,
        email: decoded.email ?? '',
        displayName: typeof formData.displayName === 'string' ? formData.displayName : decoded.name ?? '',
        businessName: String(formData.businessName ?? ''),
        category: String(formData.category ?? ''),
        whatsapp: String(formData.whatsapp ?? formData.whatsappNumber ?? ''),
        address: String(formData.address ?? ''),
        description: String(formData.description ?? ''),
        status,
        formData,
        updatedAt: now,
      };

      if (!snapshot.exists) {
        applicationPayload.createdAt = now;
      } else if (existing?.createdAt) {
        applicationPayload.createdAt = existing.createdAt;
      }

      await docRef.set(applicationPayload, { merge: true });

      let notified = false;
      try {
        const summary = buildSummary(formData, decoded.email ?? '', decoded.uid);
        notified = await sendWebhook(summary);
      } catch (notifyError) {
        console.error('[businesses/submit] webhook error', notifyError);
      }

      return res.status(200).json({ ok: true, submitted: true, notified });
    }

    const docRef = db.doc(`business_wizard/${decoded.uid}`);
    const snapshot = await docRef.get();

    const now = new Date();
    const payload: Record<string, unknown> = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      formData,
      updatedAt: now,
    };

    const targetStep = typeof step === 'number' && step >= 0 ? step : undefined;
    if (typeof targetStep !== 'undefined') {
      payload.step = targetStep;
    }

    if (!snapshot.exists) {
      payload.createdAt = now;
    }

    await docRef.set(payload, { merge: true });

    const currentStep = typeof payload.step === 'number' ? payload.step : snapshot.get('step');
    const justSubmitted = typeof currentStep === 'number' && currentStep >= LAST_STEP_INDEX;

    let notified = false;
    if (justSubmitted) {
      const summary = buildSummary(formData, decoded.email ?? '', decoded.uid);
      try {
        notified = await sendWebhook(summary);
      } catch (notifyError) {
        console.error('[businesses/submit] webhook error', notifyError);
      }
    }

    return res.status(200).json({ ok: true, submitted: justSubmitted, notified });
  } catch (error) {
    console.error('[businesses/submit] error', error);
    res.status(500).json({ error: 'Internal error' });
  }
}
