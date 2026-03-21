import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import Product from "@/lib/models/Product";
import { connectToMongo } from "@/lib/server/mongodb";

export const runtime = "nodejs";

type RouteContext = {
  params: { product_id: string } | Promise<{ product_id: string }>;
};

const allowedFields = ["business_id", "nombre", "precio", "categoria_platillo", "disponibilidad"];

function serializeProduct(product: any) {
  return {
    id: String(product._id),
    business_id: product.business_id,
    nombre: product.nombre,
    precio: product.precio,
    categoria_platillo: product.categoria_platillo,
    disponibilidad:
      typeof product.disponibilidad === "boolean" ? product.disponibilidad : undefined,
    createdAt: product.createdAt?.toISOString?.(),
    updatedAt: product.updatedAt?.toISOString?.(),
  };
}

async function updateProduct(request: NextRequest, context: RouteContext) {
  try {
    await connectToMongo();

    const resolvedParams = await context.params;
    const productId = String(resolvedParams.product_id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(productId)) {
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

    const product = await Product.findByIdAndUpdate(productId, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/:product_id] UPDATE failed", error);
    return NextResponse.json(
      { error: "No pudimos actualizar el producto." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return updateProduct(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateProduct(request, context);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectToMongo();

    const resolvedParams = await context.params;
    const productId = String(resolvedParams.product_id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "product_id invalido." }, { status: 400 });
    }

    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    console.error("[api/products/:product_id] DELETE failed", error);
    return NextResponse.json(
      { error: "No pudimos eliminar el producto." },
      { status: 500 }
    );
  }
}



