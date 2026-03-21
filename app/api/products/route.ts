import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import Product from "@/lib/models/Product";
import { connectToMongo } from "@/lib/server/mongodb";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await connectToMongo();

    const body = await request.json();
    const business_id = String(body?.business_id || "").trim();
    const nombre = String(body?.nombre || "").trim();
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

    const product = await Product.create({
      business_id,
      nombre,
      precio,
      categoria_platillo,
      disponibilidad,
    });

    return NextResponse.json(
      {
        product: {
          id: String(product._id),
          business_id: product.business_id,
          nombre: product.nombre,
          precio: product.precio,
          categoria_platillo: product.categoria_platillo,
          disponibilidad:
            typeof (product as any).disponibilidad === "boolean"
              ? (product as any).disponibilidad
              : disponibilidad,
          createdAt: product.createdAt?.toISOString?.(),
          updatedAt: product.updatedAt?.toISOString?.(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/products] POST failed", error);
    return NextResponse.json(
      { error: "No pudimos crear el producto." },
      { status: 500 }
    );
  }
}



