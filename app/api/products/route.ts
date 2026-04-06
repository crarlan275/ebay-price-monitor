// ============================================================
// app/api/products/route.ts — CRUD de productos y settings
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
  getProducts, addProduct, updateProduct, updateProductLastChecked, deleteProduct,
  getPriceHistory, getSettings, saveSettings,
} from '@/lib/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Placeholder userId — en producción usar Firebase Auth session
const DEFAULT_USER = 'default-user';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id       = searchParams.get('id');
  const history  = searchParams.get('history');
  const settings = searchParams.get('settings');

  try {
    if (settings) {
      const data = await getSettings(DEFAULT_USER);
      return NextResponse.json(data);
    }
    if (history && id) {
      const data = await getPriceHistory(id, 200);
      return NextResponse.json(data);
    }
    const products = await getProducts(DEFAULT_USER);
    return NextResponse.json(products);
  } catch (err: any) {
    console.error('[products GET]', err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? 'Error fetching data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const settings = searchParams.get('settings');

  try {
    const body = await req.json();

    if (settings) {
      await saveSettings(DEFAULT_USER, body);
      return NextResponse.json({ ok: true });
    }

    const id = await addProduct({
      ...body,
      userId:    DEFAULT_USER,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[products POST]', err);
    return NextResponse.json({ error: 'Error creating product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id          = searchParams.get('id');
  const forceSearch = searchParams.get('forceSearch') === '1';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const body = await req.json();

    // Si lastCheckedAt viene null, lo eliminamos del doc para que el cron lo recoja de inmediato
    const { lastCheckedAt, ...rest } = body;
    const updateData: Record<string, any> = { ...rest, updatedAt: Timestamp.now() };
    if (lastCheckedAt === null) {
      const { FieldValue } = await import('firebase-admin/firestore');
      updateData.lastCheckedAt = FieldValue.delete();
    }

    await updateProduct(id, updateData);

    // Disparar búsqueda inmediata en background (no bloqueante)
    if (forceSearch || !('active' in body && Object.keys(body).length === 1)) {
      triggerSearchForProduct(id).catch(err =>
        console.error('[products PUT] background search error:', err)
      );
    }

    return NextResponse.json({ ok: true, searchTriggered: true });
  } catch (err) {
    console.error('[products PUT]', err);
    return NextResponse.json({ error: 'Error updating product' }, { status: 500 });
  }
}

// ── Búsqueda inmediata tras editar un producto ────────────────
async function triggerSearchForProduct(productId: string) {
  const { searchEbay, filterItems, resetBrowser } = await import('@/lib/ebay');
  const { addPriceHistory, addAlert, itemAlreadySeen } = await import('@/lib/firebase');
  const { sendTelegramAlert, sendNoResults } = await import('@/lib/telegram');
  const { getAdminDb } = await import('@/lib/firebase-admin');

  const adb = getAdminDb();

  // Obtener el producto actualizado
  const snap = await adb.collection('products').doc(productId).get();
  if (!snap.exists) return;
  const product = { id: snap.id, ...snap.data() } as any;
  if (!product.active) return;

  console.log(`[products PUT] Búsqueda inmediata para "${product.name}"...`);

  const limit = product.searchLimit ?? 20;

  // ── Scraping con manejo de error (igual que en el cron) ──────
  let items: import('@/lib/ebay').EbayItem[] = [];
  let scrapeSucceeded = false;
  try {
    items = await searchEbay({
      keywords:        product.keywords,
      minPrice:        product.minPrice,
      maxPrice:        product.maxPrice,
      condition:       product.condition === 'ANY' ? undefined : product.condition,
      marketplace:     product.marketplace,
      excludeKeywords: product.excludeKeywords,
      country:         product.country,
      detectLots:      product.detectLots,
      detectBids:      product.detectBids,
      limit,
    });
    scrapeSucceeded = true;
  } catch (scrapeErr) {
    console.error(`[products PUT] Scraping error para "${product.name}":`, scrapeErr);
    await resetBrowser().catch(() => {});
  }

  const filtered = filterItems(items, product.minPrice, product.maxPrice, product.excludeKeywords, product.detectLots, product.detectBids, product.requireKeywords, product.excludeConditions);
  console.log(`[products PUT] "${product.name}" — encontrados ${filtered.length} items (scrapeSucceeded=${scrapeSucceeded})`);

  let alerts = 0;
  for (const item of filtered) {
    const seen = await itemAlreadySeen(product.id, item.itemId);
    if (seen) continue;

    await addPriceHistory({
      productId:       product.id,
      itemId:          item.itemId,
      title:           item.title,
      price:           item.price,
      currency:        item.currency,
      condition:       item.condition,
      url:             item.url,
      imageUrl:        item.imageUrl,
      seller:          item.seller,
      recordedAt:      Timestamp.now(),
      seen:            false,
      ...(item.lot ? {
        lotQuantity:     item.lot.quantity,
        lotPricePerUnit: item.lot.pricePerUnit,
      } : {}),
      ...(item.isBid ? {
        isBid:           true,
        bidCount:        item.bidCount,
        timeLeftMinutes: item.timeLeftMinutes,
      } : {}),
    });

    const sent = await sendTelegramAlert({
      productName: product.name,
      itemTitle:   item.title,
      price:       item.totalPrice,
      url:         item.url,
      condition:   item.condition,
      lot:         item.lot ? { quantity: item.lot.quantity, pricePerUnit: item.lot.pricePerUnit } : undefined,
      bid:         item.isBid ? { bidCount: item.bidCount ?? 0, timeLeftMinutes: item.timeLeftMinutes ?? 0 } : undefined,
    });

    if (sent) {
      await addAlert({
        productId:   product.id,
        productName: product.name,
        itemId:      item.itemId,
        title:       item.title,
        price:       item.totalPrice,
        url:         item.url,
        sentAt:      Timestamp.now(),
        channel:     'telegram',
      });
      alerts++;
    }
  }

  // Siempre notificar resultado (sin novedades o con alertas)
  if (alerts === 0) {
    await sendNoResults(product.name).catch(() => {});
  }

  // Marcar lastCheckedAt solo si el scraping funcionó
  if (scrapeSucceeded) {
    await updateProductLastChecked(productId).catch(() => {});
  }

  console.log(`[products PUT] "${product.name}" — ${alerts} alertas enviadas.`);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[products DELETE]', err);
    return NextResponse.json({ error: 'Error deleting product' }, { status: 500 });
  }
}
