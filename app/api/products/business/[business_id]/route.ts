import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getProductsStoreErrorMessage,
  listProductsByBusiness,
} from "@/lib/server/productsStore";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { business_id: string } | Promise<{ business_id: string }> }
) {
  const includeUnavailable = request.nextUrl.searchParams.get("includeUnavailable") === "true";

  try {
    const resolvedParams = await params;
    const businessId = String(resolvedParams.business_id || "").trim();

    if (!businessId) {
      return NextResponse.json(
        { error: "business_id es obligatorio", products: [] },
        { status: 400 }
      );
    }

    const products = await listProductsByBusiness(businessId, includeUnavailable);
    return NextResponse.json({ products });
  } catch (error) {
    console.error("[api/products/business/:business_id] GET failed", error);

    if (!includeUnavailable) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    return NextResponse.json(
      { error: getProductsStoreErrorMessage(error), products: [] },
      { status: 503 }
    );
  }
}
