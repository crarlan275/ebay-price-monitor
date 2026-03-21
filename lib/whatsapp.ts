// ============================================================
// lib/whatsapp.ts — Integración con Callmebot API
// ============================================================

const CALLMEBOT_BASE = 'https://api.callmebot.com/whatsapp.php';

interface AlertData {
  productName: string;
  itemTitle: string;
  price: number;
  url: string;
  condition: string;
}

// ── Enviar alerta individual de oferta ────────────────────────
export async function sendWhatsAppAlert(alert: AlertData): Promise<boolean> {
  const phone  = process.env.CALLMEBOT_PHONE!;
  const apikey = process.env.CALLMEBOT_APIKEY!;

  if (!phone || !apikey) {
    console.warn('Callmebot credentials not configured');
    return false;
  }

  const message = [
    `🛍️ *OFERTA DETECTADA*`,
    ``,
    `📦 Buscando: ${alert.productName}`,
    `🏷️ ${alert.itemTitle}`,
    `💵 Precio: $${alert.price.toFixed(2)} USD`,
    `📋 Condición: ${alert.condition}`,
    `🔗 ${alert.url}`,
    ``,
    `_ebay-price-monitor_`,
  ].join('\n');

  return sendMessage(phone, apikey, message);
}

// ── Enviar resumen diario ────────────────────────────────────
export async function sendDailySummary(
  totalProducts: number,
  alertsToday: number,
  topDeals: AlertData[]
): Promise<boolean> {
  const phone  = process.env.CALLMEBOT_PHONE!;
  const apikey = process.env.CALLMEBOT_APIKEY!;

  if (!phone || !apikey) return false;

  const dealsText = topDeals.length
    ? topDeals
        .slice(0, 5)
        .map((d, i) => `${i + 1}. ${d.itemTitle} — $${d.price.toFixed(2)}`)
        .join('\n')
    : 'Sin ofertas hoy.';

  const message = [
    `📊 *RESUMEN DIARIO — eBay Monitor*`,
    ``,
    `🔍 Productos monitoreados: ${totalProducts}`,
    `🔔 Alertas enviadas hoy: ${alertsToday}`,
    ``,
    `🏆 *Top ofertas del día:*`,
    dealsText,
    ``,
    `_${new Date().toLocaleDateString('es-ES')}_`,
  ].join('\n');

  return sendMessage(phone, apikey, message);
}

// ── Función base ─────────────────────────────────────────────
async function sendMessage(phone: string, apikey: string, text: string): Promise<boolean> {
  try {
    const url = new URL(CALLMEBOT_BASE);
    url.searchParams.set('phone', phone);
    url.searchParams.set('text', text);
    url.searchParams.set('apikey', apikey);

    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) {
      console.error(`Callmebot error ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Callmebot fetch error:', err);
    return false;
  }
}
