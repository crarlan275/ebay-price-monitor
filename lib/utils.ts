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

/** Formatea fecha completa */
export function formatDate(date: Date | number): string {
  return format(new Date(date), "d 'de' MMMM yyyy, HH:mm", { locale: es });
}

/** Tiempo relativo (hace 5 minutos) */
export function timeAgo(date: Date | number): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
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
