import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  assertOwnerOrAdmin,
  AuthorizationError,
  extractBearerToken,
  verifyIdTokenOrThrow,
} from "@/lib/server/authorization";
import { getAdminFirestore } from "@/lib/server/firebaseAdmin";
import { preservesProductBusinessId } from "@/lib/productAuthorization";
import {
  deleteProduct,
  getProductById,
  getProductsStoreErrorMessage,
  updateProduct,
} from "@/lib/server/productsStore";

export const runtime = "nodejs";

type RouteContext = {
  params: { product_id: string } | Promise<{ product_id: string }>;
};

const allowedFields = [
  "nombre",
  "descripcion",
  "precio",
  "categoria_platillo",
  "disponibilidad",
];

async function updateProductHandler(request: NextRequest, context: RouteContext) {
  try {
    const decoded = await verifyIdTokenOrThrow(extractBearerToken(request.headers));
    const resolvedParams = await context.params;
    const productId = String(resolvedParams.product_id || "").trim();

    if (!productId) {
      return NextResponse.json({ error: "product_id invalido." }, { status: 400 });
    }

    const currentProduct = await getProductById(productId);
    if (!currentProduct) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const businessSnapshot = await getAdminFirestore()
      .collection("businesses")
      .doc(currentProduct.business_id)
      .get();
    if (!businessSnapshot.exists) {
      return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
    }
    assertOwnerOrAdmin(decoded, businessSnapshot.data()?.ownerId);

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }
    if (!preservesProductBusinessId(currentProduct.business_id, body.business_id)) {
      return NextResponse.json(
        { error: "No se permite reasignar un producto a otro negocio." },
        { status: 400 }
      );
    }
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
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const decoded = await verifyIdTokenOrThrow(extractBearerToken(request.headers));
    const resolvedParams = await context.params;
    const productId = String(resolvedParams.product_id || "").trim();

    if (!productId) {
      return NextResponse.json({ error: "product_id invalido." }, { status: 400 });
    }

    const currentProduct = await getProductById(productId);
    if (!currentProduct) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const businessSnapshot = await getAdminFirestore()
      .collection("businesses")
      .doc(currentProduct.business_id)
      .get();
    if (!businessSnapshot.exists) {
      return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
    }
    assertOwnerOrAdmin(decoded, businessSnapshot.data()?.ownerId);

    await deleteProduct(productId);

    return NextResponse.json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/products/:product_id] DELETE failed", error);
    return NextResponse.json(
      { error: getProductsStoreErrorMessage(error) },
      { status: 503 }
    );
  }
}
