'use client';
// ============================================================
// components/AlertBadge.tsx — Alerta de oferta detectada
// ============================================================
// PENDIENTE DISEÑO: colores del badge de alerta y link
// ============================================================
import { formatPrice, timeAgo } from '@/lib/utils';
import type { Alert } from '@/lib/firebase';

interface Props {
  alert: Alert;
}

export function AlertBadge({ alert }: Props) {
  const sentAt = new Date((alert.sentAt as any).seconds * 1000);

  return (
    /* PENDIENTE DISEÑO: fondo y borde del badge de alerta */
    <div className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {/* PENDIENTE DISEÑO: ícono de alerta */}
        <span className="text-xl shrink-0">🔔</span>
        <div className="min-w-0">
          {/* PENDIENTE DISEÑO: tipografía del nombre del producto */}
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {alert.productName}
          </p>
          {/* PENDIENTE DISEÑO: tipografía del título del item */}
          <p className="text-sm text-gray-800 truncate">{alert.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* PENDIENTE DISEÑO: color del precio */}
        <span className="text-base font-bold text-green-600">{formatPrice(alert.price)}</span>
        <div className="text-right">
          <p className="text-xs text-gray-400">{timeAgo(sentAt)}</p>
          <a href={alert.url} target="_blank" rel="noopener noreferrer"
            /* PENDIENTE DISEÑO: color de link "Ver oferta" */
            className="text-xs text-primary-600 hover:underline font-medium">
            Ver oferta →
          </a>
        </div>
      </div>
    </div>
  );
}
