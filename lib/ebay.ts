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

// ── Parser de HTML de búsqueda de eBay (nuevo formato s-card) ─
function parseEbayHtml(html: string, limit: number): EbayItem[] {
  const items: EbayItem[] = [];

  // Detectar bloqueo / CAPTCHA
  const lower = html.slice(0, 3000).toLowerCase();
  if (
    lower.includes('robot') || lower.includes('captcha') ||
    lower.includes('unusual traffic') || lower.includes('access denied') ||
    lower.includes('security check') || lower.includes('verify you') ||
    lower.includes('pardon our interruption') || lower.includes('bot check')
  ) {
    throw new Error('eBay bloqueó la búsqueda (bot-block)');
  }

  // eBay nuevo formato (2024+): <li class="s-card s-card--horizontal">
  const chunks = html.split(/(?=<li[^>]+class="[^"]*s-card[^"]*")/);

  for (const chunk of chunks) {
    if (items.length >= limit) break;
    if (!chunk.includes('/itm/')) continue;

    // ── URL e itemId (con o sin comillas alrededor del href) ──
    const urlMatch = chunk.match(/href=["']?(https:\/\/www\.ebay\.[^/]+\/itm\/(\d{8,})[^\s"'>]*)/);
    if (!urlMatch) continue;
    const url    = `https://www.ebay.com/itm/${urlMatch[2]}`;
    const itemId = urlMatch[2];
    if (itemId === '123456') continue; // placeholder

    // ── Título ────────────────────────────────────────────────
    // Nuevo: <span class="su-styled-text primary default">Título real</span>
    // (dentro de s-card__title, DESPUÉS del opcional <span class=s-card__new-listing>)
    let title = '';
    // Intenta con o sin comillas alrededor del class
    const titleM = chunk.match(/class=["']?su-styled-text[^"'>]*primary[^"'>]*default["']?>([^<]{5,})<\/span>/);
    if (titleM) title = titleM[1].trim();
    if (!title) {
      // Fallback: alt de imagen del producto
      const altM = chunk.match(/class=s-card__image[^>]+alt="([^"]{5,})"/);
      if (altM) title = altM[1];
    }
    title = title.replace(/Opens in a new window or tab\.?/gi, '').trim();
    if (!title || title.toLowerCase() === 'shop on ebay') continue;

    // ── Precio ────────────────────────────────────────────────
    // Nuevo: <span class="...s-card__price">$326.01</span>
    const priceMatches = Array.from(chunk.matchAll(/class=["']?[^"'>]*s-card__price[^"'>]*["']?[^>]*>\s*\$?([\d,]+\.?\d{0,2})\s*<\/span>/g));
    if (!priceMatches.length) continue;
    const price = parseFloat(priceMatches[0][1].replace(/,/g, ''));
    if (!price || price === 0) continue;

    // ── Condición ─────────────────────────────────────────────
    // Nuevo: primera <span class="su-styled-text secondary default"> en subtitle
    const condM = chunk.match(/class=s-card__subtitle[\s\S]{0,300}?<span[^>]*>([^<]{2,40})<\/span>/);
    const condition = condM ? condM[1].replace(/[^\x20-\x7E]/g, '').trim() : 'Unknown';

    // ── Imagen ────────────────────────────────────────────────
    const imgM = chunk.match(/class=s-card__image[^>]+src=(https:\/\/i\.ebayimg\.com\/[^\s>]+)/);
    const imageUrl = imgM ? imgM[1] : '';

    // ── Subastas (bid) ────────────────────────────────────────
    let isBid = false;
    let bidCount = 0;
    let timeLeftMinutes: number | undefined;

    const bidM = chunk.match(/([\d,]+)\s*bid/i);
    if (bidM) { isBid = true; bidCount = parseInt(bidM[1].replace(/,/g, '')); }

    // Tiempo restante en s-card__time-left
    const tlM = chunk.match(/s-card__time-left[^>]*>([^<]+)</);
    if (tlM && isBid) {
      const t = tlM[1];
      const d = parseInt((t.match(/(\d+)d/) || ['','0'])[1]);
      const h = parseInt((t.match(/(\d+)h/) || ['','0'])[1]);
      const m = parseInt((t.match(/(\d+)m/) || ['','0'])[1]);
      timeLeftMinutes = d * 1440 + h * 60 + m;
    }

    items.push({
      itemId,
      title,
      price,
      currency:    'USD',
      condition,
      conditionId: '',
      url,
      imageUrl,
      seller:      '',
      shippingCost: null,
      totalPrice:  price,
      location:    'US',
      ...(isBid ? { isBid: true, bidCount, timeLeftMinutes } : {}),
    });
  }

  return items;
}

// ── Scraper real de una URL de eBay (sin browser) ─────────────
async function _doScrape(ebayUrl: string, limit: number): Promise<EbayItem[]> {
  const scraperKey = process.env.SCRAPER_API_KEY;
  const fetchUrl = scraperKey
    ? `http://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(ebayUrl)}`
    : ebayUrl;
  const via = scraperKey ? 'scraperapi' : 'direct';

  const res = await fetch(fetchUrl, {
    headers: scraperKey ? {} : BROWSER_HEADERS,
    signal:  AbortSignal.timeout(55_000),
  });
  if (!res.ok) throw new Error(`eBay HTTP ${res.status} (via ${via})`);
  const html = await res.text();
  const items = parseEbayHtml(html, limit);
  // Debug: mostrar estructura HTML para diagnóstico
  const itm268 = (html.match(/ebay\.com\/itm\/\d{10,}/g) || []).length;
  const firstItmIdx = html.search(/ebay\.com\/itm\/\d{10,}/);
  const snippet = firstItmIdx > -1 ? html.slice(Math.max(0, firstItmIdx - 300), firstItmIdx + 200).replace(/\s+/g, ' ') : 'NO_ITM_URLS';
  // Detectar si el HTML usa hrefs con comillas o sin comillas (para debug)
  const hrefStyle = html.includes('href="https://www.ebay') ? 'quoted' : html.includes("href='https://www.ebay") ? 'single-quoted' : 'unquoted';
  const sCardCount = (html.match(/class=["']?s-card/g) || []).length;
  console.log(`[ebay] ${items.length} items via ${via}: html=${html.length}b itm_urls=${itm268} s-cards=${sCardCount} href-style=${hrefStyle} snippet="${snippet}"`);
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
