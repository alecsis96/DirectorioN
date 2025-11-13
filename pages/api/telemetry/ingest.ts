import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { getAdminAuth, getAdminFirestore } from "../../../lib/server/firebaseAdmin";

const ALLOWED_TYPES = new Set([
  "pv",
  "cta_call",
  "cta_wa",
  "cta_maps",
  "cta_fb",
  "open_manage",
  "review_submit",
  "app_approved",
]);

const ALLOWED_PAGES = new Set(["home", "list", "detail"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { t, p, b, r } = payload || {};

    if (!ALLOWED_TYPES.has(t)) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    if (p && !ALLOWED_PAGES.has(p)) {
      return res.status(400).json({ error: "Invalid page value" });
    }

    const saveDataHeader = String(req.headers["save-data"] || "").toLowerCase();
    const saveData = saveDataHeader === "on" || saveDataHeader === "true";

    let uid: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const decoded = await getAdminAuth().verifyIdToken(token);
        uid = decoded.uid;
      } catch {
        // ignore token errors
      }
    }

    const eventDoc: Record<string, any> = {
      t,
      ts: admin.firestore.FieldValue.serverTimestamp(),
      sd: saveData,
    };

    if (uid) eventDoc.uid = uid;
    if (p) eventDoc.p = p;
    if (b && typeof b === "string" && b.trim().length) {
      eventDoc.b = b.trim().slice(0, 60);
    }
    if (typeof r === "number" && Number.isFinite(r)) {
      eventDoc.r = Math.max(0, Math.min(5, r));
    }

    await getAdminFirestore().collection("events").add(eventDoc);

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("[telemetry:ingest]", error);
    return res.status(500).json({ error: "Internal error", details: error?.message });
  }
}
