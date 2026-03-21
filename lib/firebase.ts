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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  recordedAt: Timestamp;
}

export interface Alert {
  id?: string;
  productId: string;
  productName: string;
  itemId: string;
  title: string;
  price: number;
  url: string;
  sentAt: Timestamp;
  channel: 'whatsapp' | 'email';
}

export interface Settings {
  id?: string;
  userId: string;
  ebayClientId: string;
  ebayClientSecret: string;
  ebayMarketplace: string;
  callmebotPhone: string;
  callmebotApikey: string;
  checkIntervalMinutes: number;
  dailySummaryEnabled: boolean;
  dailySummaryHour: number;
  updatedAt: Timestamp;
}

// ── CRUD Products ─────────────────────────────────────────────
export async function getProducts(userId: string): Promise<Product[]> {
  const q = query(
    collection(db, 'products'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

export async function getActiveProducts(): Promise<Product[]> {
  const q = query(collection(db, 'products'), where('active', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

export async function addProduct(data: Omit<Product, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'products'), data);
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await updateDoc(doc(db, 'products', id), { ...data, updatedAt: Timestamp.now() });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, 'products', id));
}

// ── CRUD PriceHistory ─────────────────────────────────────────
export async function addPriceHistory(data: Omit<PriceHistory, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'priceHistory'), data);
  return ref.id;
}

export async function getPriceHistory(productId: string, limitCount = 100): Promise<PriceHistory[]> {
  const q = query(
    collection(db, 'priceHistory'),
    where('productId', '==', productId),
    orderBy('recordedAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceHistory));
}

export async function itemAlreadySeen(productId: string, itemId: string): Promise<boolean> {
  const q = query(
    collection(db, 'priceHistory'),
    where('productId', '==', productId),
    where('itemId', '==', itemId),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── CRUD Alerts ───────────────────────────────────────────────
export async function addAlert(data: Omit<Alert, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'alerts'), data);
  return ref.id;
}

export async function getAlerts(limitCount = 50): Promise<Alert[]> {
  const q = query(
    collection(db, 'alerts'),
    orderBy('sentAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert));
}

export async function getAlertsToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, 'alerts'),
    where('sentAt', '>=', Timestamp.fromDate(startOfDay))
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function clearAlerts(): Promise<void> {
  const snap = await getDocs(collection(db, 'alerts'));
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
}

// ── CRUD Settings ─────────────────────────────────────────────
export async function getSettings(userId: string): Promise<Settings | null> {
  const ref = doc(db, 'settings', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Settings;
}

export async function saveSettings(userId: string, data: Partial<Settings>): Promise<void> {
  const ref = doc(db, 'settings', userId);
  await setDoc(ref, { ...data, userId, updatedAt: Timestamp.now() }, { merge: true });
}
