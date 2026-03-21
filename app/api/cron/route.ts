// ============================================================
// app/api/cron/route.ts — Cron job de monitoreo (cada 30 min)
// Vercel llama a este endpoint automáticamente según vercel.json
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts, addPriceHistory, addAlert, itemAlreadySeen } from '@/lib/firebase';
import { searchEbay, filterItems } from '@/lib/ebay';
import { sendWhatsAppAlert } from '@/lib/whatsapp';
import { Timestamp } from 'firebase/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verificar CRON_SECRET para seguridad
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: { productId: string; found: number; alerts: number }[] = [];

  try {
    const products = await getActiveProducts();
    console.log(`[CRON] Checking ${products.length} active products`);

    for (const product of products) {
      let found = 0;
      let alerts = 0;

      try {
        const items = await searchEbay({
          keywords:    product.keywords,
          minPrice:    product.minPrice,
          maxPrice:    product.maxPrice,
          condition:   product.condition === 'ANY' ? undefined : product.condition,
          marketplace: product.marketplace,
          limit:       20,
        });

        const filtered = filterItems(items, product.minPrice, product.maxPrice);
        found = filtered.length;

        for (const item of filtered) {
          // Evitar duplicados — verificar si el item ya fue registrado
          const seen = await itemAlreadySeen(product.id!, item.itemId);
          if (seen) continue;

          // Guardar en historial de precios
          await addPriceHistory({
            productId: product.id!,
            itemId:    item.itemId,
            title:     item.title,
            price:     item.price,
            currency:  item.currency,
            condition: item.condition,
            url:       item.url,
            imageUrl:  item.imageUrl,
            seller:    item.seller,
            recordedAt: Timestamp.now(),
          });

          // Enviar alerta WhatsApp
          const sent = await sendWhatsAppAlert({
            productName: product.name,
            itemTitle:   item.title,
            price:       item.totalPrice,
            url:         item.url,
            condition:   item.condition,
          });

          if (sent) {
            await addAlert({
              productId:   product.id!,
              productName: product.name,
              itemId:      item.itemId,
              title:       item.title,
              price:       item.totalPrice,
              url:         item.url,
              sentAt:      Timestamp.now(),
              channel:     'whatsapp',
            });
            alerts++;
          }
        }
      } catch (productErr) {
        console.error(`[CRON] Error on product ${product.id}:`, productErr);
      }

      results.push({ productId: product.id!, found, alerts });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[CRON] Done in ${elapsed}ms. Results:`, results);

    return NextResponse.json({
      ok: true,
      productsChecked: products.length,
      elapsedMs: elapsed,
      results,
    });
  } catch (err) {
    console.error('[CRON] Fatal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
