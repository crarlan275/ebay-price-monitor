'use client';
import { formatPrice, timeAgo } from '@/lib/utils';
import type { Alert } from '@/lib/firebase';
import { Bell, ArrowSquareOut } from '@phosphor-icons/react';

interface Props {
  alert: Alert;
}

export function AlertBadge({ alert }: Props) {
  const sentAt = new Date((alert.sentAt as any).seconds * 1000);

  return (
    <div className="group flex items-center justify-between gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-emerald-200 hover:shadow-card transition-spring">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <Bell size={15} weight="fill" className="text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest leading-none mb-0.5">
            {alert.productName}
          </p>
          <p className="text-sm text-[var(--text-1)] truncate">{alert.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="text-base font-bold text-emerald-600 font-mono">
          {formatPrice(alert.price)}
        </span>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text-3)] tabular-nums">{timeAgo(sentAt)}</p>
          <a
            href={alert.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold hover:text-emerald-700 transition-spring"
          >
            Ver oferta <ArrowSquareOut size={10} weight="bold" />
          </a>
        </div>
      </div>
    </div>
  );
}
