'use client';
import { useState } from 'react';
import { formatPrice, toDate } from '@/lib/utils';
import type { Product } from '@/lib/firebase';
import { PencilSimple, Trash, PauseCircle, Play, MagnifyingGlass } from '@phosphor-icons/react';

interface Props {
  product:  Product;
  onEdit:   (p: Product) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onSearch: (id: string) => Promise<void>;
}

const CONDITION_LABELS: Record<string, string> = {
  ANY:         'Cualquiera',
  NEW:         'Nuevo',
  USED:        'Usado',
  UNSPECIFIED: 'Reacondicionado',
};

function useLastCheckedStatus(product: Product) {
  const interval       = product.checkIntervalMinutes ?? 60;
  const lastCheckedMs  = product.lastCheckedAt ? toDate(product.lastCheckedAt).getTime() : 0;
  const wasChecked     = lastCheckedMs > 0;
  const nextCheckMs    = lastCheckedMs + interval * 60_000;
  const nowMs          = Date.now();
  const minutesAgo     = wasChecked ? Math.floor((nowMs - lastCheckedMs) / 60_000) : -1;
  const minutesUntil   = wasChecked ? Math.max(0, Math.ceil((nextCheckMs - nowMs) / 60_000)) : 0;
  return { wasChecked, minutesAgo, minutesUntil, interval };
}

export function ProductCard({ product, onEdit, onDelete, onToggle, onSearch }: Props) {
  const [toggling, setToggling]   = useState(false);
  const [searching, setSearching] = useState(false);
  const { wasChecked, minutesAgo, minutesUntil } = useLastCheckedStatus(product);

  async function handleToggle() {
    setToggling(true);
    try { await onToggle(product.id!, !product.active); } finally { setToggling(false); }
  }

  async function handleSearch() {
    setSearching(true);
    try { await onSearch(product.id!); } finally { setSearching(false); }
  }

  return (
    <div className="group bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 shadow-card hover:shadow-card-hover hover:-translate-y-[1px] transition-spring">

      {/* Header: nombre + botón Iniciar/Pausar */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-[var(--text-1)] leading-tight text-sm">{product.name}</h3>
        <button
          onClick={handleToggle}
          disabled={toggling}
          title={product.active ? 'Hacer clic para pausar el monitoreo' : 'Hacer clic para iniciar el monitoreo'}
          className={[
            'shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-spring active:scale-95 disabled:opacity-60',
            product.active
              ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600'
              : 'bg-zinc-100 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700',
          ].join(' ')}
        >
          {toggling ? (
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          ) : product.active ? (
            <PauseCircle size={10} weight="fill" />
          ) : (
            <Play size={10} weight="fill" />
          )}
          {toggling ? '...' : product.active ? 'Pausar' : 'Iniciar'}
        </button>
      </div>

      {/* Keywords */}
      <p className="text-xs text-[var(--text-3)] italic leading-relaxed">
        &ldquo;{product.keywords}&rdquo;
      </p>

      {/* Price range */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-[var(--text-1)] font-mono">{formatPrice(product.minPrice)}</span>
        <span className="text-[var(--text-3)]">—</span>
        <span className="font-semibold text-[var(--text-1)] font-mono">{formatPrice(product.maxPrice)}</span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <Tag>{CONDITION_LABELS[product.condition] ?? product.condition}</Tag>
        <Tag>{product.marketplace.replace('EBAY_', 'eBay ')}</Tag>
        <Tag>⏱ {product.checkIntervalMinutes ?? 60} min</Tag>
      </div>

      {/* Estado del monitoreo */}
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-3)]">
        {searching ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Buscando ahora…
          </>
        ) : product.active ? (
          wasChecked ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Ult. chequeo: hace {minutesAgo === 0 ? '<1' : minutesAgo} min
              {minutesUntil > 0 && <span className="text-[var(--text-3)] opacity-70"> · próximo en {minutesUntil} min</span>}
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Esperando primer chequeo…
            </>
          )
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
            Monitoreo pausado
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-[var(--border)]">
        <button
          onClick={handleSearch}
          disabled={searching || !product.active}
          title={product.active ? 'Buscar ahora' : 'Activa el producto para buscar'}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-spring active:scale-[0.98]"
        >
          {searching
            ? <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            : <MagnifyingGlass size={12} weight="bold" />
          }
          {searching ? 'Buscando…' : 'Buscar ahora'}
        </button>
        <button
          onClick={() => onEdit(product)}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-zinc-100 text-[var(--text-2)] hover:bg-zinc-200 transition-spring active:scale-[0.98]"
        >
          <PencilSimple size={12} weight="bold" />
          Editar
        </button>
        <button
          onClick={() => onDelete(product.id!)}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-spring active:scale-[0.98]"
        >
          <Trash size={12} weight="bold" />
        </button>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-zinc-100 text-zinc-500 text-[10px] font-medium px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}
