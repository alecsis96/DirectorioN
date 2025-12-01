import { NextResponse } from 'next/server';
import { fetchBusinesses } from '../../../lib/server/businessData';
import { COLONIAS_MAP, normalizeColonia } from '../../../lib/helpers/colonias';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { businesses: allBusinesses } = await fetchBusinesses();

    // Obtener colonias únicas
    const labelByNorm = new Map<string, string>();
    for (const { label, normalized } of COLONIAS_MAP) {
      if (normalized && !labelByNorm.has(normalized)) {
        labelByNorm.set(normalized, label);
      }
    }
    for (const biz of allBusinesses) {
      const raw = biz.colonia || (biz as any).neighborhood || '';
      const norm = normalizeColonia(raw);
      if (norm && !labelByNorm.has(norm)) {
        labelByNorm.set(norm, raw);
      }
    }
    const colonias = Array.from(labelByNorm.values()).sort((a, b) => a.localeCompare(b, 'es'));

    // Obtener categorías únicas
    const categorySet = new Set<string>();
    for (const biz of allBusinesses) {
      if (typeof biz.category === 'string' && biz.category.trim()) {
        categorySet.add(biz.category.trim());
      }
    }
    const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'es'));

    return NextResponse.json({
      categories,
      colonias,
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}
