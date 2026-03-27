'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

import { hasAdminOverride } from '../../lib/adminOverrides';
import {
  createCampaign,
  duplicateCampaign,
  toggleCampaignActive,
  updateCampaign,
} from '../../lib/server/campaignsData';
import { getAdminAuth } from '../../lib/server/firebaseAdmin';
import type { CampaignInput, CampaignRecord } from '../../types/campaign';

type DecodedAdmin = admin.auth.DecodedIdToken & { admin?: boolean };

type CampaignActionResult =
  | { ok: true; campaign: CampaignRecord }
  | { ok: false; error: string };

function decodedIsAdmin(decoded: DecodedAdmin | null | undefined) {
  if (!decoded) return false;
  return decoded.admin === true || hasAdminOverride(decoded.email);
}

async function readAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization') || '';

  return (
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    cookieStore.get('token')?.value ||
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) ||
    ''
  );
}

async function verifyAdmin() {
  const token = await readAuthToken();
  if (!token) throw new Error('Autenticacion requerida.');

  const auth = getAdminAuth();
  let decoded: DecodedAdmin;

  try {
    decoded = (await auth.verifySessionCookie(token, true)) as DecodedAdmin;
  } catch {
    decoded = (await auth.verifyIdToken(token)) as DecodedAdmin;
  }

  if (!decodedIsAdmin(decoded)) {
    throw new Error('Permisos de administrador requeridos.');
  }

  return decoded;
}

function revalidateCampaignSurfaces() {
  revalidatePath('/admin/campaigns');
  revalidatePath('/negocios');
  revalidatePath('/');
}

function toActionError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'No se pudo completar la accion.';
}

export async function createCampaignAction(input: CampaignInput): Promise<CampaignActionResult> {
  try {
    const adminUser = await verifyAdmin();
    const campaign = await createCampaign(input, adminUser.email || adminUser.uid);
    revalidateCampaignSurfaces();
    return { ok: true, campaign };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateCampaignAction(campaignId: string, input: CampaignInput): Promise<CampaignActionResult> {
  try {
    await verifyAdmin();
    const campaign = await updateCampaign(campaignId, input);
    revalidateCampaignSurfaces();
    return { ok: true, campaign };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function toggleCampaignActiveAction(
  campaignId: string,
  isActive: boolean
): Promise<CampaignActionResult> {
  try {
    await verifyAdmin();
    const campaign = await toggleCampaignActive(campaignId, isActive);
    revalidateCampaignSurfaces();
    return { ok: true, campaign };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function duplicateCampaignAction(campaignId: string): Promise<CampaignActionResult> {
  try {
    const adminUser = await verifyAdmin();
    const campaign = await duplicateCampaign(campaignId, adminUser.email || adminUser.uid);
    revalidateCampaignSurfaces();
    return { ok: true, campaign };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
