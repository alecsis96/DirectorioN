import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createProduct, getProductsStoreErrorMessage } from "@/lib/server/productsStore";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
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
    console.error("[api/products] POST failed", error);
    return NextResponse.json(
      { error: getProductsStoreErrorMessage(error) },
      { status: 503 }
    );
  }
}
