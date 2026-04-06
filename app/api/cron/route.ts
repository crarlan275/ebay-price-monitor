// ============================================================
// app/api/cron/route.ts — Cron job de monitoreo
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveProducts, addPriceHistory, addAlert, itemAlreadySeen, getSettings,
  getBidWatch, setBidWatch, updateBidWatch, deleteBidWatch, cleanOldBidWatches,
  updateProductLastChecked,
} from '@/lib/firebase';
import { searchEbay, filterItems, resetBrowser, type EbayItem } from '@/lib/ebay';
import { sendTelegramAlert, sendNoResults, sendBidSectionHeader, sendLotSectionHeader } from '@/lib/telegram';
import { Timestamp } from 'firebase-admin/firestore';
import type { Product } from '@/lib/firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Umbrales de alerta para bids (minutos restantes)
const BID_THRESHOLDS = [120, 60, 30, 20, 10];

// ── Manejador de bids con alertas escalonadas ─────────────────
async function handleBidItem(
  item:    EbayItem,
  product: Product,
): Promise<number> {
  let alertsSent = 0;
  const currentTL = item.timeLeftMinutes ?? 0;

  const watch = await getBidWatch(item.itemId);

  if (!watch) {
    // Primera vez que vemos este bid — guardar en historial y alertar
    await addPriceHistory({
      productId:       product.id!,
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
      isBid:           true,
      bidCount:        item.bidCount,
      timeLeftMinutes: currentTL,
      ...(item.lot ? { lotQuantity: item.lot.quantity, lotPricePerUnit: item.lot.pricePerUnit } : {}),
    });

    await sendTelegramAlert({
      productName: product.name,
      itemTitle:   item.title,
      price:       item.totalPrice,
      url:         item.url,
      condition:   item.condition,
      lot:         item.lot ? { quantity: item.lot.quantity, pricePerUnit: item.lot.pricePerUnit } : undefined,
      bid:         { bidCount: item.bidCount ?? 0, timeLeftMinutes: currentTL },
    });

    await addAlert({
      productId:   product.id!,
      productName: product.name,
      itemId:      item.itemId,
      title:       item.title,
      price:       item.totalPrice,
      url:         item.url,
      sentAt:      Timestamp.now(),
      channel:     'telegram',
    });
    alertsSent++;

    // Crear bidWatch
    await setBidWatch(item.itemId, {
      productId:    product.id!,
      productName:  product.name,
      title:        item.title,
      url:          item.url,
      price:        item.totalPrice,
      condition:    item.condition,
      alertsSent:   ['initial'],
      lastTimeLeft: currentTL,
      lastSeen:     Timestamp.now(),
      lot:          item.lot ? { quantity: item.lot.quantity, pricePerUnit: item.lot.pricePerUnit } : null,
    });

  } else {
    // Ya lo hemos visto antes — comprobar umbrales nuevos
    const alreadySentLabels = watch.alertsSent ?? [];

    for (const threshold of BID_THRESHOLDS) {
      if (currentTL <= threshold && !alreadySentLabels.includes(String(threshold))) {
        await sendTelegramAlert({
          productName: product.name,
          itemTitle:   item.title,
          price:       item.totalPrice,
          url:         item.url,
          condition:   item.condition,
          lot:         item.lot ? { quantity: item.lot.quantity, pricePerUnit: item.lot.pricePerUnit } : undefined,
          bid:         { bidCount: item.bidCount ?? 0, timeLeftMinutes: currentTL, threshold },
        });

        await addAlert({
          productId:   product.id!,
          productName: product.name,
          itemId:      item.itemId,
          title:       item.title,
          price:       item.totalPrice,
          url:         item.url,
          sentAt:      Timestamp.now(),
          channel:     'telegram',
        });

        alreadySentLabels.push(String(threshold));
        alertsSent++;
      }
    }

    // Actualizar bidWatch con precio/pujas actuales y nuevos alertsSent
    if (currentTL <= 0) {
      // Subasta terminada — limpiar
      await deleteBidWatch(item.itemId);
    } else {
      await updateBidWatch(item.itemId, {
        price:        item.totalPrice,
        alertsSent:   alreadySentLabels,
        lastTimeLeft: currentTL,
        lastSeen:     Timestamp.now(),
      });
    }
  }

  return alertsSent;
}

// ── Handler principal ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { getAdminDb } = await import('@/lib/firebase-admin');
  const adb = getAdminDb();

  // ── Leer intervalo global (fallback para productos sin intervalo propio) ──
  const settings = await getSettings('default-user');
  const globalIntervalMinutes = Math.max(settings?.checkIntervalMinutes ?? 60, 5);

  // Registrar timestamp de esta llamada (para referencia/debug)
  const stateRef = adb.collection('system').doc('cronState');
  await stateRef.set({ lastRunAt: Timestamp.now() }, { merge: true });

  // ── Limpiar bidWatches obsoletos (subastas que terminaron) ────
  const cleaned = await cleanOldBidWatches();
  if (cleaned > 0) console.log(`[CRON] Cleaned ${cleaned} expired bid watches`);

  const startTime = Date.now();
  const results: { productId: string; found: number; alerts: number }[] = [];

  try {
    const products = await getActiveProducts();
    console.log(`[CRON] Checking ${products.length} products (global fallback: ${globalIntervalMinutes} min)`);

    let checkedCount = 0;
    for (let pi = 0; pi < products.length; pi++) {
      const product = products[pi];
      let found = 0, alerts = 0;

      // ── Verificar si este producto debe chequearse ahora ─────────
      // Todos los productos usan lastCheckedAt + su intervalo efectivo.
      // Si no tienen intervalo propio se usa el global como fallback.
      const effectiveInterval = product.checkIntervalMinutes
        ? Math.max(product.checkIntervalMinutes, 5)
        : globalIntervalMinutes;
      const lastChecked: number = product.lastCheckedAt
        ? (product.lastCheckedAt.seconds ?? 0) * 1000
        : 0;
      const minutesSinceLastCheck = (Date.now() - lastChecked) / 60_000;
      if (minutesSinceLastCheck < effectiveInterval) {
        const waitMin = Math.ceil(effectiveInterval - minutesSinceLastCheck);
        console.log(`[CRON] "${product.name}" omitido (${effectiveInterval} min) — próximo en ${waitMin} min`);
        results.push({ productId: product.id!, found: 0, alerts: 0 });
        continue;
      }

      if (checkedCount > 0) await new Promise(r => setTimeout(r, 5000 + Math.random() * 3000));
      checkedCount++;

      let scrapeSucceeded = false;

      try {
        const limit = product.searchLimit ?? 20;

        // ── Scraping aislado: si falla, continúa con array vacío ────
        let items: EbayItem[] = [];
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
          console.error(`[CRON] Scraping error for "${product.name}":`, scrapeErr);
          // Resetear el browser para la siguiente búsqueda
          await resetBrowser().catch(() => {});
          // items queda vacío — los mensajes de Telegram se envían igual abajo
        }

        const filtered = filterItems(
          items, product.minPrice, product.maxPrice,
          product.excludeKeywords, product.detectLots, product.detectBids,
          product.requireKeywords, product.excludeConditions,
        );
        found = filtered.length;

        // ── Debug: loguear cuántos items trajo el scraper vs cuántos pasaron los filtros ──
        console.log(
          `[CRON] "${product.name}": scraped=${items.length}, filtered=${filtered.length}` +
          (product.requireKeywords ? ` (requireKeywords="${product.requireKeywords}")` : '') +
          (product.excludeKeywords ? ` (excludeKeywords="${product.excludeKeywords}")` : '') +
          ` [precio $${product.minPrice}–$${product.maxPrice}]`
        );

        let bidHeaderSent = false;
        let lotHeaderSent = false;
        for (const item of filtered) {
          // ── Bids: sistema bidWatch con alertas escalonadas ──────
          if (item.isBid && product.detectBids) {
            if (!bidHeaderSent) {
              await sendBidSectionHeader();
              bidHeaderSent = true;
            }
            alerts += await handleBidItem(item, product);
            continue;
          }

          // ── Items normales/lotes: deduplicar por itemId ─────────
          const seen = await itemAlreadySeen(product.id!, item.itemId);
          if (seen) continue;

          if (item.lot && !lotHeaderSent) {
            await sendLotSectionHeader();
            lotHeaderSent = true;
          }

          await addPriceHistory({
            productId:       product.id!,
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
            ...(item.lot ? { lotQuantity: item.lot.quantity, lotPricePerUnit: item.lot.pricePerUnit } : {}),
          });

          const sent = await sendTelegramAlert({
            productName: product.name,
            itemTitle:   item.title,
            price:       item.totalPrice,
            url:         item.url,
            condition:   item.condition,
            lot:         item.lot ? { quantity: item.lot.quantity, pricePerUnit: item.lot.pricePerUnit } : undefined,
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
              channel:     'telegram',
            });
            alerts++;
          }
        }

        // ── Siempre notificar si no hubo alertas nuevas ───────────
        if (alerts === 0) {
          await sendNoResults(product.name);
        }

      } catch (err) {
        console.error(`[CRON] Error on product ${product.id}:`, err);
      }

      // Marcar cuándo fue chequeado — solo si el scraping funcionó
      // (si falló, se reintenta en el próximo ciclo sin esperar el intervalo)
      if (scrapeSucceeded) {
        await updateProductLastChecked(product.id!).catch(() => {});
      }

      results.push({ productId: product.id!, found, alerts });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[CRON] Done in ${elapsed}ms — checked: ${checkedCount}/${products.length}`, results);

    return NextResponse.json({ ok: true, productsTotal: products.length, productsChecked: checkedCount, elapsedMs: elapsed, results });
  } catch (err) {
    console.error('[CRON] Fatal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
