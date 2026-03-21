// ============================================================
// app/api/ebay/route.ts — Búsqueda manual en tiempo real
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { searchEbay } from '@/lib/ebay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keywords   = searchParams.get('q');
  const minPrice   = searchParams.get('minPrice');
  const maxPrice   = searchParams.get('maxPrice');
  const condition  = searchParams.get('condition') as any;
  const marketplace = searchParams.get('marketplace') ?? undefined;

  if (!keywords) {
    return NextResponse.json({ error: 'Missing query parameter: q' }, { status: 400 });
  }

  try {
    const items = await searchEbay({
      keywords,
      minPrice:    minPrice  ? parseFloat(minPrice)  : undefined,
      maxPrice:    maxPrice  ? parseFloat(maxPrice)  : undefined,
      condition:   condition || undefined,
      marketplace: marketplace || undefined,
      limit:       20,
    });
    return NextResponse.json({ items, total: items.length });
  } catch (err: any) {
    console.error('[ebay GET]', err);
    return NextResponse.json({ error: err.message ?? 'eBay search failed' }, { status: 500 });
  }
}
