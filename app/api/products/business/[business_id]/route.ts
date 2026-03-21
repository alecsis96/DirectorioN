import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Product from "@/lib/models/Product";
import { connectToMongo } from "@/lib/server/mongodb";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { business_id: string } | Promise<{ business_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const businessId = String(resolvedParams.business_id || "").trim();
    const includeUnavailable = request.nextUrl.searchParams.get("includeUnavailable") === "true";

    if (!businessId) {
      return NextResponse.json(
        { error: "business_id es obligatorio", products: [] },
        { status: 400 }
      );
    }

    await connectToMongo();

    const query = includeUnavailable
      ? { business_id: businessId }
      : { business_id: businessId, disponibilidad: { $ne: false } };

    const products = await Product.find(query)
      .sort({ categoria_platillo: 1, nombre: 1 })
      .lean();

    return NextResponse.json({
      products: products.map((product: any) => ({
        id: String(product._id),
        business_id: product.business_id,
        nombre: product.nombre,
        precio: Number(product.precio || 0),
        categoria_platillo: product.categoria_platillo || "General",
        disponibilidad:
          typeof product.disponibilidad === "boolean" ? product.disponibilidad : true,
        createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : undefined,
        updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
      })),
    });
  } catch (error) {
    console.error("[api/products/business/:business_id] GET failed", error);
    const message =
      error instanceof Error && error.message.includes("MONGODB_URI")
        ? "Configura MONGODB_URI para cargar el menu del negocio."
        : "No pudimos cargar el menu del negocio.";

    return NextResponse.json({ error: message, products: [] }, { status: 500 });
  }
}

