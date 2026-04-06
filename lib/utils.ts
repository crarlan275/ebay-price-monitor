// ============================================================
// lib/utils.ts — Utilidades generales
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/** Genera un UUID v4 aleatorio */
export function generateUUID(): string {
  return uuidv4();
}

/** Formatea precio en USD */
export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convierte un Timestamp de Firestore a Date.
 * Soporta: Client SDK { seconds }, Admin SDK { _seconds }, Date, number, string.
 */
export function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts instanceof Date) return isNaN(ts.getTime()) ? new Date(0) : ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'string') { const d = new Date(ts); return isNaN(d.getTime()) ? new Date(0) : d; }
  // Admin SDK serializado: { _seconds, _nanoseconds }
  if (typeof ts._seconds === 'number') return new Date(ts._seconds * 1000);
  // Client SDK: { seconds, nanoseconds }
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  // toDate() method (Firestore Timestamp)
  if (typeof ts.toDate === 'function') return ts.toDate();
  const fallback = new Date(ts);
  return isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

/** Formatea fecha completa */
export function formatDate(date: any): string {
  const d = toDate(date);
  if (d.getTime() === 0) return '—';
  return format(d, "d 'de' MMMM yyyy, HH:mm", { locale: es });
}

/** Tiempo relativo (hace 5 minutos) */
export function timeAgo(date: any): string {
  const d = toDate(date);
  if (d.getTime() === 0) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/** Trunca texto a N caracteres */
export function truncate(text: string, max = 60): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Clase CSS condicional (tiny cn helper) */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Valida que un string no esté vacío */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/** Genera un CRON_SECRET seguro */
export function generateCronSecret(): string {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}
