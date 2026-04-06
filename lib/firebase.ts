// ============================================================
// lib/firebase.ts — Firebase Client + Admin SDK
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ── Client SDK ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

// ── Tipos ────────────────────────────────────────────────────
export interface Product {
  id?: string;
  userId: string;
  name: string;
  keywords: string;
  minPrice: number;
  maxPrice: number;
  condition: 'NEW' | 'USED' | 'UNSPECIFIED' | 'ANY';
  marketplace: string;
  active: boolean;
  // Palabras clave a EXCLUIR (ej: "roto,partes,daño") — separadas por comas
  excludeKeywords?: string;
  // Palabras que DEBEN aparecer en el título (ej: "16,pro") — separadas por comas
  requireKeywords?: string;
  // País del vendedor: "US" | "GB" | "DE" | "ES" | "FR" | "WORLDWIDE"
  country?: string;
  // Cantidad máxima de resultados a traer de eBay (0 = ilimitado)
  searchLimit?: number;
  // Detectar ventas por lote y calcular precio por unidad
  detectLots?: boolean;
  // Detectar subastas (bids) con < 180 min (3 horas) restantes
  detectBids?: boolean;
  // Condiciones de eBay a EXCLUIR (ej: ["for parts", "open box"])
  excludeConditions?: string[];
  // Intervalo de chequeo en minutos para este producto (sobreescribe el global)
  checkIntervalMinutes?: number;
  // Última vez que el cron verificó este producto
  lastCheckedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface PriceHistory {
  id?: string;
  productId: string;
  itemId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  url: string;
  imageUrl: string;
  seller: string;
  recordedAt: any;
  // Info de lote (solo si fue detectado como venta por lote)
  lotQuantity?:     number;
  lotPricePerUnit?: number;
  // Info de subasta (solo si fue detectado como bid)
  isBid?:           boolean;
  bidCount?:        number;
  timeLeftMinutes?: number;
  // Marcado como visto por el usuario
  seen?: boolean;
}

// ── BidWatch: rastreo de subastas activas para alertas escaladas ─
export interface BidWatch {
  productId:   string;
  productName: string;
  title:       string;
  url:         string;
  price:       number;
  condition:   string;
  alertsSent:  string[];      // 'initial' | '30' | '20' | '10'
  lastTimeLeft?: number;
  lastSeen:    any;           // Timestamp
  lot?: { quantity: number; pricePerUnit: number } | null;
}

export interface Alert {
  id?: string;
  productId: string;
  productName: string;
  itemId: string;
  title: string;
  price: number;
  url: string;
  sentAt: any;
  channel: 'telegram' | 'email';
}

export interface Settings {
  id?: string;
  userId: string;
  ebayClientId?: string;
  ebayClientSecret?: string;
  ebayMarketplace?: string;
  callmebotPhone?: string;
  callmebotApikey?: string;
  checkIntervalMinutes: number;
  dailySummaryEnabled: boolean;
  dailySummaryHour: number;
  telegramBotToken?: string;
  telegramChatId?: string;
  monitoringActive?: boolean;
  updatedAt: any;
}

// ── CRUD Products ─────────────────────────────────────────────
export async function getProducts(userId: string): Promise<Product[]> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const snap = await adb.collection('products')
    .where('userId', '==', userId)
    .get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Product));
  return docs.sort((a, b) => {
    const aTime = (a.createdAt as any)?.seconds ?? 0;
    const bTime = (b.createdAt as any)?.seconds ?? 0;
    return bTime - aTime;
  });
}

export async function getActiveProducts(): Promise<Product[]> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const snap = await adb.collection('products').where('active', '==', true).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Product));
}

export async function addProduct(data: Omit<Product, 'id'>): Promise<string> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const ref = await adb.collection('products').add(data);
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const { FieldValue } = await import('firebase-admin/firestore');
  const adb = getAdminDb();
  await adb.collection('products').doc(id).update({ ...data, updatedAt: FieldValue.serverTimestamp() });
}

export async function updateProductLastChecked(id: string): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const { FieldValue } = await import('firebase-admin/firestore');
  const adb = getAdminDb();
  await adb.collection('products').doc(id).update({ lastCheckedAt: FieldValue.serverTimestamp() });
}

export async function deleteProduct(id: string): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  await adb.collection('products').doc(id).delete();
}

// ── CRUD PriceHistory ─────────────────────────────────────────
export async function addPriceHistory(data: Omit<PriceHistory, 'id'>): Promise<string> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const ref = await adb.collection('priceHistory').add(data);
  return ref.id;
}

export async function getPriceHistory(productId: string, limitCount = 100): Promise<PriceHistory[]> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const snap = await adb.collection('priceHistory')
    .where('productId', '==', productId)
    .get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as PriceHistory));
  return docs
    .sort((a, b) => ((b.recordedAt as any)?.seconds ?? 0) - ((a.recordedAt as any)?.seconds ?? 0))
    .slice(0, limitCount);
}

export async function markHistorySeen(historyId: string, seen: boolean): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  await adb.collection('priceHistory').doc(historyId).update({ seen });
}

export async function itemAlreadySeen(productId: string, itemId: string): Promise<boolean> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const snap = await adb.collection('priceHistory')
    .where('productId', '==', productId)
    .where('itemId', '==', itemId)
    .limit(1)
    .get();
  return !snap.empty;
}

// ── BidWatch CRUD ─────────────────────────────────────────────
export async function getBidWatch(itemId: string): Promise<BidWatch | null> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const snap = await adb.collection('bidWatches').doc(itemId).get();
  if (!snap.exists) return null;
  return snap.data() as BidWatch;
}

export async function setBidWatch(itemId: string, data: BidWatch): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  await adb.collection('bidWatches').doc(itemId).set(data);
}

export async function updateBidWatch(itemId: string, data: Partial<BidWatch>): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  await adb.collection('bidWatches').doc(itemId).update(data);
}

export async function deleteBidWatch(itemId: string): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  await adb.collection('bidWatches').doc(itemId).delete();
}

export async function cleanOldBidWatches(): Promise<number> {
  const { getAdminDb } = await import('./firebase-admin');
  const { Timestamp: AdminTimestamp } = await import('firebase-admin/firestore');
  const adb = getAdminDb();
  // Eliminar bidWatches no actualizados en más de 2 horas (subasta terminada)
  const twoHoursAgo = AdminTimestamp.fromMillis(Date.now() - 2 * 60 * 60 * 1000);
  const snap = await adb.collection('bidWatches').where('lastSeen', '<', twoHoursAgo).get();
  if (snap.empty) return 0;
  const batch = adb.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

// ── CRUD Alerts ───────────────────────────────────────────────
export async function addAlert(data: Omit<Alert, 'id'>): Promise<string> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const ref = await adb.collection('alerts').add(data);
  return ref.id;
}

export async function getAlerts(limitCount = 50): Promise<Alert[]> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const snap = await adb.collection('alerts').get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Alert));
  return docs
    .sort((a, b) => ((b.sentAt as any)?.seconds ?? 0) - ((a.sentAt as any)?.seconds ?? 0))
    .slice(0, limitCount);
}

export async function getAlertsToday(): Promise<number> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();
  const snap = await adb.collection('alerts').get();
  return snap.docs.filter(d => {
    const sentAt = d.data().sentAt;
    const ms = sentAt?.seconds ? sentAt.seconds * 1000 : 0;
    return ms >= startMs;
  }).length;
}

export async function clearAlerts(): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const snap = await adb.collection('alerts').get();
  const batch = adb.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ── CRUD Settings ─────────────────────────────────────────────
export async function getSettings(userId: string): Promise<Settings | null> {
  const { getAdminDb } = await import('./firebase-admin');
  const adb = getAdminDb();
  const snap = await adb.collection('settings').doc(userId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as unknown as Settings;
}

export async function saveSettings(userId: string, data: Partial<Settings>): Promise<void> {
  const { getAdminDb } = await import('./firebase-admin');
  const { FieldValue } = await import('firebase-admin/firestore');
  const adb = getAdminDb();
  await adb.collection('settings').doc(userId).set(
    { ...data, userId, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}
