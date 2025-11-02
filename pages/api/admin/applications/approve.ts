// pages/api/admin/applications/approve.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "../../../../lib/server/firebaseAdmin";
import * as admin from "firebase-admin";

const SOURCE_COLLECTIONS = ["applications", "business_wizard"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const db = getAdminFirestore();
  const auth = getAdminAuth();

  try {
    // 1) Auth admin
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ error: "Token no proporcionado" });
    const decoded = await auth.verifyIdToken(token);
    if (!decoded.admin) return res.status(403).json({ error: "No autorizado: se requiere rol admin" });

    // 2) ID flexible
    const { applicationId, id, removeSource = true } = req.body as {
      applicationId?: string;
      id?: string;
      removeSource?: boolean;
    };
    const docId = applicationId || id;
    if (!docId) return res.status(400).json({ error: "applicationId es obligatorio" });

    // 3) Buscar source (applications o business_wizard)
    let appSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    let appRef: FirebaseFirestore.DocumentReference | null = null;
    let sourceCollection = "";
    for (const col of SOURCE_COLLECTIONS) {
      const ref = db.collection(col).doc(docId);
      const snap = await ref.get();
      if (snap.exists) {
        appSnap = snap;
        appRef = ref;
        sourceCollection = col;
        break;
      }
    }
    if (!appSnap || !appRef) return res.status(404).json({ error: "Solicitud no encontrada" });

    // 4) Aplanar formData
    const raw = appSnap.data() || {};
    const formData = (raw as any).formData || {};
    const flattened = { ...formData, ...raw };
    delete (flattened as any).formData;

    // 5) Normalizar campos clave
    const name =
      flattened.name ||
      flattened.businessName ||
      flattened["formData.businessName"] ||
      "Negocio sin nombre";

    const category = flattened.category || flattened["formData.category"] || "";
    const address =
      flattened.address || flattened.colonia || flattened["formData.address"] || "";

    const ownerId =
      flattened.ownerId ||
      flattened.uid ||
      flattened.userId ||
      flattened.ownerUid ||
      flattened["formData.uid"] ||
      "";

    const ownerEmailRaw =
      flattened.ownerEmail ||
      flattened.email ||
      flattened["formData.ownerEmail"] ||
      "";
    const ownerEmail = ownerEmailRaw ? String(ownerEmailRaw).trim().toLowerCase() : "";

    const phone =
      flattened.phone ||
      flattened.ownerPhone ||
      flattened.whatsappNumber ||
      flattened.whatsapp ||
      "";

    const hours =
      flattened.hours ||
      flattened.horario ||
      flattened["formData.hours"] ||
      "";

    const now = admin.firestore.FieldValue.serverTimestamp();

    const businessDoc = {
      ...flattened,
      // normalizados para la UI
      name,
      category,
      address,
      ownerId,
      ownerEmail,
      phone,
      hours,
      approved: true,
      status: "approved",
      published: true,
      visible: true,
      approvedAt: now,
      approvedBy: decoded.uid,
      updatedAt: now,
      createdAt: (flattened as any).createdAt || now,
    };

    // 6) Guardar en /businesses/{id}
    const bizRef = db.collection("businesses").doc(docId);
    await bizRef.set(businessDoc, { merge: true });

    // 7) Borrar/marcar source
    if (removeSource) await appRef.delete();
    else await appRef.set({ status: "approved", processedAt: now }, { merge: true });

    // 8) OK
    return res.status(200).json({
      ok: true,
      businessId: docId,
      from: sourceCollection,
      message: "Negocio aprobado y movido correctamente",
    });
  } catch (err: any) {
    console.error("approve.ts error:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
}
