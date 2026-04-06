// ============================================================
// lib/ebay.ts — eBay Scraper via fetch() nativo
// Sin browser, sin Playwright — funciona en Vercel y local
// ============================================================

// Exportado para compatibilidad — ya no hay browser que resetear
export async function resetBrowser(): Promise<void> {}

// ── Headers que simulan un browser real ───────────────────────
const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control':   'no-cache',
};

// ── Extraer texto entre dos delimitadores ─────────────────────
function between(src: string, open: string, close: string): string {
  const s = src.indexOf(open);
  if (s === -1) return '';
  const e = src.indexOf(close, s + open.length);
  if (e === -1) return '';
  return src.slice(s + open.length, e).trim();
}

// ── Parser de HTML de búsqueda de eBay ───────────────────────
function parseEbayHtml(html: string, limit: number): EbayItem[] {
  const items: EbayItem[] = [];

  // Detectar bloqueo / CAPTCHA
  const lower = html.slice(0, 3000).toLowerCase();
  if (
    lower.includes('robot') || lower.includes('captcha') ||
    lower.includes('unusual traffic') || lower.includes('access denied') ||
    lower.includes('security check') || lower.includes('verify you')
  ) {
    throw new Error('eBay bloqueó la búsqueda (CAPTCHA/verificación)');
  }

  // Dividir por items — eBay usa <li class="s-item" o <div class="s-item"
  const chunks = html.split(/(?=<li[^>]+class="[^"]*s-item[^"]*")/);

  for (const chunk of chunks) {
    if (items.length >= limit) break;
    if (!chunk.includes('/itm/')) continue;

    // ── URL e itemId ──────────────────────────────────────────
    const urlMatch = chunk.match(/href="(https?:\/\/www\.ebay\.[^/]+\/itm\/(\d{8,})[^"]*)"/);
    if (!urlMatch) continue;
    const url    = urlMatch[1].split('?')[0]; // quitar query params
    const itemId = urlMatch[2];

    // ── Título ────────────────────────────────────────────────
    // eBay pone el título en varios formatos — probar ambos
    let title = '';
    const titlePatterns = [
      /class="[^"]*s-item__title[^"]*"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i,
      /class="[^"]*s-item__title[^"]*"[^>]*>([^<]{5,})</i,
      /role="heading"[^>]*>([^<]{5,})</i,
    ];
    for (const p of titlePatterns) {
      const m = chunk.match(p);
      if (m) { title = m[1].trim(); break; }
    }
    title = title.replace(/Opens in a new window or tab\.?/gi, '').trim();
    if (!title || title.toLowerCase() === 'shop on ebay') continue;

    // ── Precio ────────────────────────────────────────────────
    const priceMatch = chunk.match(/class="[^"]*s-item__price[^"]*"[^>]*>[\s\S]*?\$([\d,]+\.?\d{0,2})/);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (!price || price === 0) continue;

    // ── Condición ─────────────────────────────────────────────
    const condMatch = chunk.match(/class="[^"]*(?:s-item__subtitle|SECONDARY_INFO)[^"]*"[^>]*>([^<]{2,50})</i);
    const condition = condMatch ? condMatch[1].trim() : 'Unknown';

    // ── Envío ─────────────────────────────────────────────────
    let shippingCost: number | null = null;
    if (/free shipping/i.test(chunk)) {
      shippingCost = 0;
    } else {
      const shipMatch = chunk.match(/\+\s*\$?([\d.]+)\s*shipping/i);
      if (shipMatch) shippingCost = parseFloat(shipMatch[1]);
    }

    // ── Subastas (bid) ────────────────────────────────────────
    let isBid = false;
    let bidCount = 0;
    let timeLeftMinutes: number | undefined;

    const bidMatch = chunk.match(/(\d+)\s*bids?\b/i);
    if (bidMatch) { isBid = true; bidCount = parseInt(bidMatch[1]); }

    const tlDays  = chunk.match(/(\d+)d\s*(?:(\d+)h)?\s*left/i);
    const tlHours = chunk.match(/(\d+)h\s*(?:(\d+)m)?\s*left/i);
    const tlMins  = chunk.match(/\b(\d+)m\s*left/i);
    if (tlDays) {
      isBid = true;
      timeLeftMinutes = parseInt(tlDays[1]) * 1440 + (tlDays[2] ? parseInt(tlDays[2]) * 60 : 0);
    } else if (tlHours) {
      isBid = true;
      timeLeftMinutes = parseInt(tlHours[1]) * 60 + (tlHours[2] ? parseInt(tlHours[2]) : 0);
    } else if (tlMins) {
      isBid = true;
      timeLeftMinutes = parseInt(tlMins[1]);
    }

    items.push({
      itemId,
      title,
      price,
      currency:     'USD',
      condition,
      conditionId:  '',
      url,
      imageUrl:     '',
      seller:       '',
      shippingCost,
      totalPrice:   shippingCost !== null ? price + shippingCost : price,
      location:     '',
      ...(isBid ? { isBid: true, bidCount, timeLeftMinutes } : {}),
    });
  }

  return items;
}

// ── Scraper real de una URL de eBay (sin browser) ─────────────
async function _doScrape(ebayUrl: string, limit: number): Promise<EbayItem[]> {
  const res = await fetch(ebayUrl, {
    headers: BROWSER_HEADERS,
    signal:  AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`eBay HTTP ${res.status}`);
  const html = await res.text();
  const items = parseEbayHtml(html, limit);
  console.log(`[ebay] ${items.length} items via fetch: ${ebayUrl.split('?')[0]}`);
  return items;
}

// ── Mapeo de marketplaces a dominios ──────────────────────────
const MARKETPLACE_URLS: Record<string, string> = {
  EBAY_US: 'https://www.ebay.com',
  EBAY_ES: 'https://www.ebay.es',
  EBAY_DE: 'https://www.ebay.de',
  EBAY_UK: 'https://www.ebay.co.uk',
  EBAY_FR: 'https://www.ebay.fr',
};

// LH_ItemCondition IDs de eBay
const CONDITION_IDS: Record<string, string> = {
  NEW:         '1000',
  USED:        '3000',
  UNSPECIFIED: '2000',
};

// ── Tipos ────────────────────────────────────────────────────
export interface LotInfo {
  isLot:        true;
  quantity:     number;
  pricePerUnit: number;
}

export interface EbayItem {
  itemId:          string;
  title:           string;
  price:           number;
  currency:        string;
  condition:       string;
  conditionId:     string;
  url:             string;
  imageUrl:        string;
  seller:          string;
  shippingCost:    number | null;
  totalPrice:      number;
  location:        string;
  lot?:            LotInfo;  // presente solo si es una venta por lote
  // Campos de subasta (bid)
  isBid?:          boolean;
  bidCount?:       number;
  timeLeftMinutes?: number;  // minutos restantes para que termine la subasta
}

// ── Detectar si un título es una venta por lote ───────────────
export function detectLot(title: string, totalPrice: number): LotInfo | null {
  const t = title.toLowerCase();

  // Patrones para detectar cantidad en lotes
  const patterns: RegExp[] = [
    /\blot\s+of\s+(\d+)\b/i,           // "lot of 10"
    /\b(\d+)\s*[-]?\s*lot\b/i,         // "10-lot", "10 lot"
    /\bpack\s+of\s+(\d+)\b/i,          // "pack of 10"
    /\b(\d+)\s*[-]?\s*pack\b/i,        // "10-pack", "10 pack"
    /\bbundle\s+of\s+(\d+)\b/i,        // "bundle of 5"
    /\bset\s+of\s+(\d+)\b/i,           // "set of 5"
    /\b(\d+)\s*x\s+(?!\d)/i,           // "10x " (seguido de no-número)
    /\bx\s*(\d+)\b/i,                  // "x10"
    /\b(\d+)\s*pcs?\b/i,               // "10 pcs", "10 pc"
    /\b(\d+)\s*pieces?\b/i,            // "10 pieces"
    /\b(\d+)\s*units?\b/i,             // "10 units"
    /\b(\d+)\s*count\b/i,              // "10 count"
    /\bqty\s*[:\-]?\s*(\d+)\b/i,       // "qty 10", "qty: 10"
    /\bquantity\s*[:\-]?\s*(\d+)\b/i,  // "quantity 10"
    /\b(\d+)\s*item\b/i,               // "10 item"
  ];

  let quantity = 0;
  for (const pattern of patterns) {
    const m = t.match(pattern);
    if (m) {
      const q = parseInt(m[1] ?? m[2], 10);
      if (q >= 2 && q <= 1000) { quantity = q; break; }
    }
  }

  if (!quantity) return null;

  const pricePerUnit = totalPrice / quantity;
  return { isLot: true, quantity, pricePerUnit };
}

export interface SearchParams {
  keywords:        string;
  minPrice?:       number;
  maxPrice?:       number;
  condition?:      'NEW' | 'USED' | 'UNSPECIFIED' | 'ANY';
  marketplace?:    string;
  limit?:          number;
  excludeKeywords?:  string;
  // Palabras que DEBEN aparecer en el título — separadas por comas
  requireKeywords?:  string;
  country?:          string;
  // Si true, no se envía precio máximo a eBay para capturar lotes grandes
  detectLots?:     boolean;
  // Si true, incluir subastas (bids) con < 180 min (3 horas) restantes
  detectBids?:     boolean;
}

// Mapeo de código de país a parámetro LH_PrefLoc de eBay
const COUNTRY_FILTER: Record<string, string> = {
  US:        '1', // Items in USA
  GB:        '3', // Items in UK
  WORLDWIDE: '2', // Worldwide
};

// ── Búsqueda base (una sola URL) ─────────────────────────────
async function scrapeEbay(baseUrl: string, keywords: string, limit: number, opts: {
  minPrice?: number; maxPrice?: number; condId?: string; country?: string;
}): Promise<EbayItem[]> {
  const url = new URL(`${baseUrl}/sch/i.html`);
  url.searchParams.set('_nkw',  keywords);
  url.searchParams.set('_sop',  '15');
  url.searchParams.set('_ipg',  String(limit));
  if (opts.minPrice !== undefined) url.searchParams.set('_udlo', String(opts.minPrice));
  if (opts.maxPrice !== undefined) url.searchParams.set('_udhi', String(opts.maxPrice));
  if (opts.condId)  url.searchParams.set('LH_ItemCondition', opts.condId);
  if (opts.country) url.searchParams.set('LH_PrefLoc',       opts.country);
  return _scrapeUrl(url.toString(), limit);
}

// ── Búsqueda via scraping ─────────────────────────────────────
export async function searchEbay(params: SearchParams): Promise<EbayItem[]> {
  const baseUrl = MARKETPLACE_URLS[params.marketplace ?? 'EBAY_US'] ?? MARKETPLACE_URLS.EBAY_US;
  const limit   = params.limit === 0 ? 200 : Math.min(params.limit ?? 20, 200);

  const condId  = params.condition && params.condition !== 'ANY' ? CONDITION_IDS[params.condition] : undefined;
  const country = params.country && COUNTRY_FILTER[params.country] ? COUNTRY_FILTER[params.country] : undefined;

  // Búsqueda normal (con precio máximo)
  const normal = await scrapeEbay(baseUrl, params.keywords, limit, {
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    condId, country,
  });

  if (!params.detectLots) return normal;

  // Búsqueda adicional de lotes: keywords + "lot" sin precio máximo
  // Así eBay trae lotes de $50, $100, $200 que tendrán buen precio por unidad
  const lotItems = await scrapeEbay(baseUrl, `${params.keywords} lot`, limit, {
    minPrice: params.minPrice,
    condId, country,
  });

  // Combinar y deduplicar por itemId
  const seen = new Set(normal.map(i => i.itemId));
  const merged = [...normal];
  for (const item of lotItems) {
    if (!seen.has(item.itemId)) {
      merged.push(item);
      seen.add(item.itemId);
    }
  }
  return merged;
}

async function _scrapeUrl(ebayUrl: string, limit: number): Promise<EbayItem[]> {
  // Delay corto para no parecer un bot agresivo
  await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
  return _doScrape(ebayUrl, limit);
}

// ── Filtrar por rango de precio + keywords excluidas + lotes + bids ──
export function filterItems(
  items:               EbayItem[],
  minPrice:            number,
  maxPrice:            number,
  excludeKeywords?:    string,
  detectLots?:         boolean,
  detectBids?:         boolean,
  requireKeywords?:    string,
  excludeConditions?:  string[],
): EbayItem[] {
  const exclusions = (excludeKeywords ?? '')
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  const requirements = (requireKeywords ?? '')
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  const result: EbayItem[] = [];

  for (const item of items) {
    const titleLower = item.title.toLowerCase();

    // Filtrar: título DEBE contener todas las palabras requeridas (substring, case-insensitive)
    // Usamos includes() y no word boundary para que "unlocked," o "16Pro" también hagan match
    if (requirements.length > 0) {
      if (!requirements.every(kw => titleLower.includes(kw))) continue;
    }

    // Filtrar palabras excluidas (word boundary — coincidencia de palabra completa)
    if (exclusions.length > 0) {
      const escaped = exclusions.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (escaped.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(titleLower))) continue;
    }

    // Filtrar condiciones excluidas (substring case-insensitive)
    if (excludeConditions && excludeConditions.length > 0) {
      const condLower = item.condition.toLowerCase();
      if (excludeConditions.some(ec => condLower.includes(ec.toLowerCase()))) continue;
    }

    // ── Lógica de bids ──────────────────────────────────────
    if (item.isBid) {
      if (!detectBids) continue;  // Bids desactivados: ignorar subastas
      // Solo incluir subastas con < 180 min (3 horas) restantes
      const tl = item.timeLeftMinutes ?? 9999;
      if (tl >= 180) continue;
    }

    // Precio unitario dentro del rango → incluir normalmente
    if (item.totalPrice >= minPrice && item.totalPrice <= maxPrice) {
      result.push(item);
      continue;
    }

    // Detección de lotes: precio total fuera del rango pero precio/unidad dentro
    if (detectLots) {
      const lot = detectLot(item.title, item.totalPrice);
      if (lot && lot.pricePerUnit >= minPrice && lot.pricePerUnit <= maxPrice) {
        result.push({ ...item, lot });
        continue;
      }
    }
  }

  return result;
}
