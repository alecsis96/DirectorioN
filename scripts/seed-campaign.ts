import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT no está configurado en .env.local");
  }

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  });
}

const db = admin.firestore();

function readArg(name: string, fallback?: string) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return fallback;
  return match.slice(name.length + 3);
}

async function main() {
  const businessId = readArg("businessId");
  const title = readArg("title", "Promo especial solo por hoy");
  const subtitle = readArg("subtitle", "Haz tu pedido por WhatsApp y pregunta vigencia.");
  const placement = readArg("placement", "hero_banner");
  const ctaType = readArg("ctaType", "whatsapp");
  const ctaLabel = readArg("ctaLabel", "Pedir por WhatsApp");
  const badge = readArg("badge", "HOY");
  const promoCode = readArg("promoCode");
  const imageUrl = readArg("imageUrl");
  const audience = readArg("audience", "all");
  const priority = Number(readArg("priority", "100"));
  const createdBy = readArg("createdBy", "seed-script");

  if (!businessId) {
    throw new Error("Debes enviar --businessId=<id> para asociar la campaña a un negocio real.");
  }

  const startsAt = admin.firestore.Timestamp.now();
  const endsAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const payload = {
    businessId,
    title,
    subtitle,
    description: title,
    badge,
    promoCode,
    imageUrl,
    mobileImageUrl: imageUrl,
    ctaLabel,
    ctaType,
    ctaValue: ctaType === "internal" || ctaType === "external" ? readArg("ctaValue") : undefined,
    startsAt,
    endsAt,
    isActive: true,
    priority: Number.isFinite(priority) ? priority : 100,
    placement,
    audience,
    backgroundStyle: readArg("backgroundStyle"),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy,
  };

  const ref = await db.collection("campaigns").add(payload);
  console.log(`Campaña creada: campaigns/${ref.id}`);
}

main().catch((error) => {
  console.error("Error creando campaña:", error);
  process.exit(1);
});
