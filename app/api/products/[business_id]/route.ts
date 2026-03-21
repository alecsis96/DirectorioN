import { NextResponse } from "next/server";

import Product from "@/lib/models/Product";
import { connectToMongo } from "@/lib/server/mongodb";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { business_id: string } | Promise<{ business_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const businessId = String(resolvedParams.business_id || "").trim();

    if (!businessId) {
      return NextResponse.json(
        { error: "business_id es obligatorio", products: [] },
        { status: 400 }
      );
    }

    await connectToMongo();

    const products = await Product.find({ business_id: businessId })
      .sort({ categoria_platillo: 1, nombre: 1 })
      .lean();

    return NextResponse.json({
      products: products.map((product: any) => ({
        id: String(product._id),
        business_id: product.business_id,
        nombre: product.nombre,
        precio: Number(product.precio || 0),
        categoria_platillo: product.categoria_platillo || "General",
        createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : undefined,
        updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
      })),
    });
  } catch (error) {
    console.error("[api/products] GET failed", error);
    const message =
      error instanceof Error && error.message.includes("MONGODB_URI")
        ? "Configura MONGODB_URI para cargar el menu del negocio."
        : "No pudimos cargar el menu del negocio.";

    return NextResponse.json({ error: message, products: [] }, { status: 500 });
  }
}
