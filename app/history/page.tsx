'use client';
// ============================================================
// app/history/page.tsx — Historial de precios con gráfica
// ============================================================
// PENDIENTE DISEÑO: colores de la gráfica, filtros y tabla
// ============================================================
import { useEffect, useState } from 'react';
import { PriceChart } from '@/components/PriceChart';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Product, PriceHistory } from '@/lib/firebase';

export default function HistoryPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [history, setHistory]     = useState<PriceHistory[]>([]);
  const [selectedId, setSelected] = useState<string>('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  async function loadHistory(productId: string) {
    setSelected(productId);
    if (!productId) { setHistory([]); return; }
    setLoading(true);
    const res = await fetch(`/api/products?history=1&id=${productId}`);
    setHistory(await res.json());
    setLoading(false);
  }

  const chartData = history.map(h => ({
    date:  new Date((h.recordedAt as any).seconds * 1000).toLocaleDateString('es-ES'),
    price: h.price,
  })).reverse();

  return (
    <div className="space-y-8">
      {/* PENDIENTE DISEÑO: tipografía de título */}
      <h1 className="text-2xl font-bold text-gray-900">Historial de precios</h1>

      {/* Filtro de producto */}
      {/* PENDIENTE DISEÑO: color de selector */}
      <select
        value={selectedId}
        onChange={e => loadHistory(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">— Selecciona un producto —</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* Gráfica */}
      {selectedId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* PENDIENTE DISEÑO: título de sección gráfica */}
          <h2 className="text-base font-semibold text-gray-700 mb-4">Evolución de precios</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Cargando…</p>
          ) : chartData.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin datos de precio aún.</p>
          ) : (
            <PriceChart data={chartData} />
          )}
        </div>
      )}

      {/* Tabla de historial */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* PENDIENTE DISEÑO: estilos de encabezado de tabla */}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha', 'Título', 'Precio', 'Envío', 'Condición', 'Link'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(new Date((item.recordedAt as any).seconds * 1000))}
                  </td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{item.title}</td>
                  {/* PENDIENTE DISEÑO: color del precio en tabla */}
                  <td className="px-4 py-3 font-semibold text-green-600">{formatPrice(item.price)}</td>
                  <td className="px-4 py-3 text-gray-500">—</td>
                  <td className="px-4 py-3 text-gray-600">{item.condition}</td>
                  <td className="px-4 py-3">
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      /* PENDIENTE DISEÑO: color de link */
                      className="text-primary-600 hover:underline">Ver</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
