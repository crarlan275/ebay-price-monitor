// ============================================================
// lib/ebay.ts — eBay Browse API + OAuth 2.0
// ============================================================

const EBAY_AUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// ── OAuth 2.0 Client Credentials ─────────────────────────────
export async function getEbayToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const clientId     = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(EBAY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      Authorization:   `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay OAuth error: ${err}`);
  }

  const data = await res.json();
  cachedToken = data.access_token as string;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

// ── Tipos ─────────────────────────────────────────────────────
export interface EbayItem {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  conditionId: string;
  url: string;
  imageUrl: string;
  seller: string;
  shippingCost: number | null;
  totalPrice: number;
  location: string;
}

export interface SearchParams {
  keywords: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'NEW' | 'USED' | 'UNSPECIFIED' | 'ANY';
  marketplace?: string;
  limit?: number;
}

// ── Búsqueda de productos ─────────────────────────────────────
export async function searchEbay(params: SearchParams): Promise<EbayItem[]> {
  const token       = await getEbayToken();
  const marketplace = params.marketplace || process.env.EBAY_MARKETPLACE || 'EBAY_US';
  const pageLimit   = Math.min(params.limit || 20, 50);

  const url = new URL(EBAY_SEARCH_URL);
  url.searchParams.set('q', params.keywords);
  url.searchParams.set('limit', String(pageLimit));
  url.searchParams.set('sort', 'price');

  // Filtro de precio
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const min = params.minPrice ?? 0;
    const max = params.maxPrice ?? 999999;
    url.searchParams.set('filter', `price:[${min}..${max}],priceCurrency:USD`);
  }

  // Filtro de condición
  if (params.condition && params.condition !== 'ANY') {
    const conditionMap: Record<string, string> = {
      NEW:        'conditionIds:{1000}',
      USED:       'conditionIds:{3000|4000|5000|6000}',
      UNSPECIFIED: 'conditionIds:{7000}',
    };
    const condFilter = conditionMap[params.condition];
    if (condFilter) {
      const existing = url.searchParams.get('filter');
      url.searchParams.set('filter', existing ? `${existing},${condFilter}` : condFilter);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization:   `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplace,
      'Content-Type':  'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay search error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const items = data.itemSummaries ?? [];

  return items.map((item: any): EbayItem => {
    const price      = parseFloat(item.price?.value ?? '0');
    const shipping   = item.shippingOptions?.[0]?.shippingCost?.value
                       ? parseFloat(item.shippingOptions[0].shippingCost.value)
                       : null;
    return {
      itemId:      item.itemId,
      title:       item.title,
      price,
      currency:    item.price?.currency ?? 'USD',
      condition:   item.condition ?? 'Unknown',
      conditionId: item.conditionId ?? '',
      url:         item.itemWebUrl,
      imageUrl:    item.image?.imageUrl ?? '',
      seller:      item.seller?.username ?? '',
      shippingCost: shipping,
      totalPrice:  price + (shipping ?? 0),
      location:    item.itemLocation?.country ?? '',
    };
  });
}

// ── Filtrar por precio y condición ───────────────────────────
export function filterItems(
  items: EbayItem[],
  minPrice: number,
  maxPrice: number
): EbayItem[] {
  return items.filter(
    item => item.totalPrice >= minPrice && item.totalPrice <= maxPrice
  );
}
