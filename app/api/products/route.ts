import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  assertOwnerOrAdmin,
  AuthorizationError,
  extractBearerToken,
  verifyIdTokenOrThrow,
} from "@/lib/server/authorization";
import { getAdminFirestore } from "@/lib/server/firebaseAdmin";
import { createProduct, getProductsStoreErrorMessage } from "@/lib/server/productsStore";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyIdTokenOrThrow(extractBearerToken(request.headers));
    const body = await request.json();
    const business_id = String(body?.business_id || "").trim();
    const nombre = String(body?.nombre || "").trim();
    const descripcion = String(body?.descripcion || "").trim();
    const categoria_platillo = String(body?.categoria_platillo || "General").trim() || "General";
    const precio = Number(body?.precio);
    const disponibilidad =
      typeof body?.disponibilidad === "boolean" ? body.disponibilidad : true;

    if (!business_id || !nombre || Number.isNaN(precio)) {
      return NextResponse.json(
        { error: "business_id, nombre y precio son obligatorios." },
        { status: 400 }
      );
    }

    const businessSnapshot = await getAdminFirestore().collection("businesses").doc(business_id).get();
    if (!businessSnapshot.exists) {
      return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
    }
    assertOwnerOrAdmin(decoded, businessSnapshot.data()?.ownerId);

    const product = await createProduct({
      business_id,
      nombre,
      descripcion,
      precio,
      categoria_platillo,
      disponibilidad,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/products] POST failed", error);
    return NextResponse.json(
      { error: getProductsStoreErrorMessage(error) },
      { status: 503 }
    );
  }
}
