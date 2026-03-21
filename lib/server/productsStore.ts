import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "./firebaseAdmin";
import { serializeTimestamps } from "./serializeFirestore";

type ProductRecord = {
  business_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria_platillo: string;
  disponibilidad: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type ProductPayload = {
  business_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria_platillo: string;
  disponibilidad?: boolean;
};

type ProductUpdatePayload = Partial<ProductPayload>;

const PRODUCTS_COLLECTION = "products";

function toProductResponse(id: string, data: ProductRecord) {
  return serializeTimestamps({
    id,
    business_id: data.business_id,
    nombre: data.nombre,
    descripcion: data.descripcion || "",
    precio: Number(data.precio || 0),
    categoria_platillo: data.categoria_platillo || "General",
    disponibilidad: typeof data.disponibilidad === "boolean" ? data.disponibilidad : true,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

function sortProducts(items: ReturnType<typeof toProductResponse>[]) {
  return [...items].sort((left, right) => {
    const byCategory = String(left.categoria_platillo || "").localeCompare(
      String(right.categoria_platillo || ""),
      "es"
    );

    if (byCategory !== 0) {
      return byCategory;
    }

    return String(left.nombre || "").localeCompare(String(right.nombre || ""), "es");
  });
}

export function getProductsStoreErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("FIREBASE_SERVICE_ACCOUNT")) {
    return "Configura FIREBASE_SERVICE_ACCOUNT en produccion para habilitar el catalogo de productos.";
  }

  if (
    message.includes("Could not load the default credentials") ||
    message.includes("credential") ||
    message.includes("Permission denied") ||
    message.includes("permission_denied")
  ) {
    return "No se pudo conectar a Firestore. Revisa FIREBASE_SERVICE_ACCOUNT y los permisos del proyecto.";
  }

  return "No pudimos conectar con el catalogo de productos.";
}

export async function listProductsByBusiness(businessId: string, includeUnavailable = false) {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(PRODUCTS_COLLECTION)
    .where("business_id", "==", businessId)
    .get();

  const items = snapshot.docs
    .map((doc) => toProductResponse(doc.id, doc.data() as ProductRecord))
    .filter((product) => includeUnavailable || product.disponibilidad !== false);

  return sortProducts(items);
}

export async function createProduct(payload: ProductPayload) {
  const db = getAdminFirestore();
  const now = Timestamp.now();
  const docRef = db.collection(PRODUCTS_COLLECTION).doc();

  const record: ProductRecord = {
    business_id: payload.business_id,
    nombre: payload.nombre,
    descripcion: payload.descripcion || "",
    precio: payload.precio,
    categoria_platillo: payload.categoria_platillo || "General",
    disponibilidad: typeof payload.disponibilidad === "boolean" ? payload.disponibilidad : true,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(record);
  return toProductResponse(docRef.id, record);
}

export async function updateProduct(productId: string, updates: ProductUpdatePayload) {
  const db = getAdminFirestore();
  const docRef = db.collection(PRODUCTS_COLLECTION).doc(productId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const current = snapshot.data() as ProductRecord;
  const nextRecord: ProductRecord = {
    ...current,
    ...updates,
    descripcion:
      typeof updates.descripcion === "string" ? updates.descripcion : current.descripcion || "",
    categoria_platillo:
      typeof updates.categoria_platillo === "string" && updates.categoria_platillo.trim()
        ? updates.categoria_platillo
        : current.categoria_platillo || "General",
    disponibilidad:
      typeof updates.disponibilidad === "boolean"
        ? updates.disponibilidad
        : typeof current.disponibilidad === "boolean"
          ? current.disponibilidad
          : true,
    updatedAt: Timestamp.now(),
  };

  await docRef.set(nextRecord, { merge: true });
  return toProductResponse(productId, nextRecord);
}

export async function deleteProduct(productId: string) {
  const db = getAdminFirestore();
  const docRef = db.collection(PRODUCTS_COLLECTION).doc(productId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return false;
  }

  await docRef.delete();
  return true;
}
