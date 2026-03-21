import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  deleteProduct,
  getProductsStoreErrorMessage,
  updateProduct,
} from "@/lib/server/productsStore";

export const runtime = "nodejs";

type RouteContext = {
  params: { product_id: string } | Promise<{ product_id: string }>;
};

const allowedFields = [
  "business_id",
  "nombre",
  "descripcion",
  "precio",
  "categoria_platillo",
  "disponibilidad",
];

async function updateProductHandler(request: NextRequest, context: RouteContext) {
  try {
    const resolvedParams = await context.params;
    const productId = String(resolvedParams.product_id || "").trim();

    if (!productId) {
      return NextResponse.json({ error: "product_id invalido." }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (!(field in body)) continue;

      if (field === "precio") {
        const precio = Number(body[field]);
        if (Number.isNaN(precio)) {
          return NextResponse.json({ error: "precio debe ser numerico." }, { status: 400 });
        }
        updates.precio = precio;
        continue;
      }

      if (field === "disponibilidad") {
        if (typeof body[field] !== "boolean") {
          return NextResponse.json(
            { error: "disponibilidad debe ser booleana." },
            { status: 400 }
          );
        }
        updates.disponibilidad = body[field];
        continue;
      }

      updates[field] = String(body[field] || "").trim();
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: "No se enviaron campos validos para actualizar." },
        { status: 400 }
      );
    }

    const product = await updateProduct(productId, updates);

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("[api/products/:product_id] UPDATE failed", error);
    return NextResponse.json(
      { error: getProductsStoreErrorMessage(error) },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return updateProductHandler(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateProductHandler(request, context);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const resolvedParams = await context.params;
    const productId = String(resolvedParams.product_id || "").trim();

    if (!productId) {
      return NextResponse.json({ error: "product_id invalido." }, { status: 400 });
    }

    const deleted = await deleteProduct(productId);

    if (!deleted) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    console.error("[api/products/:product_id] DELETE failed", error);
    return NextResponse.json(
      { error: getProductsStoreErrorMessage(error) },
      { status: 503 }
    );
  }
}
