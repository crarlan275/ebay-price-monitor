'use client';
// ============================================================
// components/ProductCard.tsx — Tarjeta de producto monitoreado
// ============================================================
// PENDIENTE DISEÑO: colores de tarjeta, badge de estado y botones
// ============================================================
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/firebase';

interface Props {
  product: Product;
  onEdit:   (p: Product) => void;
  onDelete: (id: string) => void;
}

const CONDITION_LABELS: Record<string, string> = {
  ANY:         'Cualquiera',
  NEW:         'Nuevo',
  USED:        'Usado',
  UNSPECIFIED: 'Reacondicionado',
};

export function ProductCard({ product, onEdit, onDelete }: Props) {
  return (
    /* PENDIENTE DISEÑO: sombra, borde y fondo de tarjeta */
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 leading-tight">{product.name}</h3>
        {/* PENDIENTE DISEÑO: badge activo/inactivo */}
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
          product.active
            ? 'bg-green-100 text-green-700'   // PENDIENTE DISEÑO: color activo
            : 'bg-gray-100 text-gray-500'     // PENDIENTE DISEÑO: color inactivo
        }`}>
          {product.active ? 'Activo' : 'Pausado'}
        </span>
      </div>

      {/* Keywords */}
      <p className="text-sm text-gray-500 italic">"{product.keywords}"</p>

      {/* Rango de precio */}
      {/* PENDIENTE DISEÑO: color del rango de precio */}
      <div className="flex items-center gap-1 text-sm text-gray-700">
        <span className="font-medium">{formatPrice(product.minPrice)}</span>
        <span className="text-gray-400">—</span>
        <span className="font-medium">{formatPrice(product.maxPrice)}</span>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 text-xs">
        {/* PENDIENTE DISEÑO: colores de los chips/badges */}
        <Chip>{CONDITION_LABELS[product.condition] ?? product.condition}</Chip>
        <Chip>{product.marketplace.replace('EBAY_', '')}</Chip>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        {/* PENDIENTE DISEÑO: botones editar y eliminar */}
        <button onClick={() => onEdit(product)}
          className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
          Editar
        </button>
        <button onClick={() => onDelete(product.id!)}
          className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
          Eliminar
        </button>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    /* PENDIENTE DISEÑO: color de chip/tag */
    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{children}</span>
  );
}
