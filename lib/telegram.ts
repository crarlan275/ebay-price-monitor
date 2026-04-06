// ============================================================
// lib/telegram.ts — Notificaciones via Telegram Bot API
// ============================================================

const TELEGRAM_API = 'https://api.telegram.org';

// Cache de credenciales para no leer Firestore en cada mensaje
let _credCache: { token: string; chatId: string } | null = null;
let _credCacheTime = 0;
const CRED_CACHE_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Lee las credenciales de Telegram con este orden de prioridad:
 * 1. Variables de entorno (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)
 * 2. Firestore → settings / default-user (lo que configura el usuario en Settings)
 */
async function getTelegramCredentials(): Promise<{ token: string; chatId: string } | null> {
  // 1) Variables de entorno tienen prioridad
  const envToken  = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  if (envToken && envChatId) return { token: envToken, chatId: envChatId };

  // 2) Cache local
  if (_credCache && Date.now() - _credCacheTime < CRED_CACHE_MS) return _credCache;

  // 3) Leer de Firestore settings
  try {
    const { getSettings } = await import('./firebase');
    const settings = await getSettings('default-user');
    if (settings?.telegramBotToken && settings?.telegramChatId) {
      _credCache    = { token: settings.telegramBotToken, chatId: settings.telegramChatId };
      _credCacheTime = Date.now();
      return _credCache;
    }
  } catch (e) {
    console.error('[Telegram] Error leyendo credenciales de Firestore:', e);
  }

  return null;
}

/** Invalida el cache de credenciales (llamar tras guardar Settings) */
export function invalidateTelegramCache(): void {
  _credCache     = null;
  _credCacheTime = 0;
}

interface AlertData {
  productName:  string;
  itemTitle:    string;
  price:        number;
  url:          string;
  condition:    string;
  lot?: {
    quantity:     number;
    pricePerUnit: number;
  };
  bid?: {
    bidCount:        number;
    timeLeftMinutes: number;
    threshold?:      number;   // 30, 20 ó 10 → es alerta de umbral, no detección inicial
  };
}

// ── Enviar alerta individual de oferta ────────────────────────
export async function sendTelegramAlert(alert: AlertData): Promise<boolean> {
  const creds = await getTelegramCredentials();
  if (!creds) {
    console.warn('[Telegram] No hay credenciales configuradas (Settings → Telegram)');
    return false;
  }

  const isLot = !!alert.lot;
  const isBid = !!alert.bid;

  const threshold = alert.bid?.threshold;

  // Elegir encabezado según tipo y umbral
  let header: string;
  if (isBid && threshold === 10) {
    header = `🔴🔔 *¡BID — ÚLTIMOS 10 MIN\\!*`;
  } else if (isBid && threshold === 20) {
    header = `🟡🔨 *BID — 20 MIN RESTANTES*`;
  } else if (isBid && threshold === 30) {
    header = `⚠️🔨 *BID — 30 MIN RESTANTES*`;
  } else if (isBid && isLot) {
    header = `🔨🎁 *BID DE LOTE DETECTADO*`;
  } else if (isBid) {
    header = `🔨 *BID DETECTADO*`;
  } else if (isLot) {
    header = `🎁 *LOTE DETECTADO*`;
  } else {
    header = `🛍️ *OFERTA DETECTADA*`;
  }

  // Formato de tiempo restante para bids
  const timeLeftStr = isBid
    ? (() => {
        const tl = alert.bid!.timeLeftMinutes;
        if (tl < 1)  return 'menos de 1 min';
        if (tl < 60) return `${tl} min`;
        const h = Math.floor(tl / 60);
        const m = tl % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
      })()
    : '';

  const message = [
    header,
    ``,
    `📦 *Buscando:* ${escMd(alert.productName)}`,
    `🏷️ ${escMd(alert.itemTitle)}`,
    isBid  ? `⏰ *Tiempo restante:* ${escMd(timeLeftStr)}` : ``,
    isBid  ? `🏷️ *Pujas activas:* ${escMd(String(alert.bid!.bidCount))}` : ``,
    isLot  ? `📦 *Cantidad:* ${escMd(String(alert.lot!.quantity))} unidades` : ``,
    isLot  ? `💵 *Precio/unidad:* \\$${escMd(alert.lot!.pricePerUnit.toFixed(2))} USD` : ``,
    `💵 *${isLot ? 'Total lote' : isBid ? 'Puja actual' : 'Precio'}:* \\$${escMd(alert.price.toFixed(2))} USD`,
    `📋 *Condición:* ${escMd(alert.condition)}`,
    ``,
    `🔗 [Ver en eBay](${escUrl(alert.url)})`,
  ].filter(l => l !== '').join('\n');

  return sendMessage(creds.token, creds.chatId, message);
}

// ── Enviar encabezado/divisor por producto ────────────────────
export async function sendProductHeader(productName: string): Promise<boolean> {
  const creds = await getTelegramCredentials();
  if (!creds) return false;

  const sep     = '━━━━━━━━━━━━━━━━━━━━';
  const message = `${sep}\n📦 *${escMd(productName)}*\n${sep}`;
  return sendMessage(creds.token, creds.chatId, message);
}

// ── Enviar separador de sección de lotes ─────────────────────
export async function sendLotSectionHeader(): Promise<boolean> {
  const creds = await getTelegramCredentials();
  if (!creds) return false;

  return sendMessage(creds.token, creds.chatId, `🎁 *LOTES DETECTADOS*`);
}

// ── Enviar separador de sección de subastas ───────────────────
export async function sendBidSectionHeader(): Promise<boolean> {
  const creds = await getTelegramCredentials();
  if (!creds) return false;

  return sendMessage(creds.token, creds.chatId, `🔨 *SUBASTAS ACTIVAS*`);
}

// ── Enviar mensaje de "sin resultados nuevos" para un producto ─
export async function sendNoResults(productName: string): Promise<boolean> {
  const creds = await getTelegramCredentials();
  if (!creds) return false;

  const message = `✅ _Sin novedades para_ *${escMd(productName)}*`;
  return sendMessage(creds.token, creds.chatId, message);
}

// ── Enviar resumen diario ─────────────────────────────────────
export async function sendDailySummary(
  totalProducts: number,
  alertsToday:   number,
  topDeals:      AlertData[],
): Promise<boolean> {
  const creds = await getTelegramCredentials();
  if (!creds) return false;

  const dealsText = topDeals.length
    ? topDeals
        .slice(0, 5)
        .map((d, i) => `${i + 1}\\. ${escMd(d.itemTitle)} — $${d.price.toFixed(2)}`)
        .join('\n')
    : '_Sin ofertas hoy\\._';

  const message = [
    `📊 *RESUMEN DIARIO — eBay Monitor*`,
    ``,
    `🔍 Productos monitoreados: ${totalProducts}`,
    `🔔 Alertas enviadas hoy: ${alertsToday}`,
    ``,
    `🏆 *Top ofertas del día:*`,
    dealsText,
    ``,
    `_${escMd(new Date().toLocaleDateString('es-ES'))}_`,
  ].join('\n');

  return sendMessage(creds.token, creds.chatId, message);
}

// ── Función base ──────────────────────────────────────────────
async function sendMessage(token: string, chatId: string, text: string): Promise<boolean> {
  try {
    const url  = `${TELEGRAM_API}/bot${token}/sendMessage`;
    const body = {
      chat_id:    chatId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
    };

    console.log('[Telegram] Enviando mensaje a chat_id:', chatId);
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const json = await res.json();
    console.log('[Telegram] Respuesta:', JSON.stringify(json));

    if (!json.ok) {
      console.error('[Telegram] Error:', json.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Telegram] fetch error:', err);
    return false;
  }
}

// ── Escapar caracteres especiales para MarkdownV2 ─────────────
function escMd(text: string): string {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

// ── Escapar URL dentro de un link Markdown ────────────────────
function escUrl(url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/\)/g, '\\)');
}
