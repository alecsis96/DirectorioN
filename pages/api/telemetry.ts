import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore } from "../../lib/server/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { event, payload } = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (typeof event !== "string" || !event.trim()) {
      return res.status(400).json({ ok: false, error: "Invalid event" });
    }

    const doc = {
      event: event.trim(),
      payload: payload ?? null,
      ua: String(req.headers["user-agent"] || ""),
      ip: String((req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || ""),
      at: new Date(),
    };

    try {
      await getAdminFirestore().collection("telemetry").add(doc);
    } catch (firestoreError) {
      console.info("[telemetry] admin unavailable, fallback logging", {
        event: doc.event,
        reason: (firestoreError as Error)?.message,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[telemetry] unexpected error", error);
    return res.status(200).json({ ok: true });
  }
}
