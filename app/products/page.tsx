'use client';
// ============================================================
// app/products/page.tsx — Gestión de productos monitoreados
// ============================================================
// PENDIENTE DISEÑO: colores de formulario, botones y lista de productos
// ============================================================
import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/lib/firebase';

const CONDITION_OPTIONS = [
  { value: 'ANY',         label: 'Cualquiera' },
  { value: 'NEW',         label: 'Nuevo' },
  { value: 'USED',        label: 'Usado' },
  { value: 'UNSPECIFIED', label: 'Reacondicionado' },
];

const MARKETPLACE_OPTIONS = [
  { value: 'EBAY_US', label: 'eBay US' },
  { value: 'EBAY_ES', label: 'eBay ES' },
  { value: 'EBAY_DE', label: 'eBay DE' },
  { value: 'EBAY_UK', label: 'eBay UK' },
  { value: 'EBAY_FR', label: 'eBay FR' },
];

const emptyForm = {
  name: '', keywords: '', minPrice: '', maxPrice: '',
  condition: 'ANY', marketplace: 'EBAY_US', active: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function loadProducts() {
    const res = await fetch('/api/products');
    setProducts(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadProducts(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.keywords || !form.minPrice || !form.maxPrice) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        minPrice: parseFloat(form.minPrice),
        maxPrice: parseFloat(form.maxPrice),
      };
      const method = editId ? 'PUT' : 'POST';
      const url    = editId ? `/api/products?id=${editId}` : '/api/products';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setForm(emptyForm);
      setEditId(null);
      await loadProducts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    await loadProducts();
  }

  function handleEdit(product: Product) {
    setEditId(product.id!);
    setForm({
      name:        product.name,
      keywords:    product.keywords,
      minPrice:    String(product.minPrice),
      maxPrice:    String(product.maxPrice),
      condition:   product.condition,
      marketplace: product.marketplace,
      active:      product.active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-8">
      {/* PENDIENTE DISEÑO: tipografía de título */}
      <h1 className="text-2xl font-bold text-gray-900">Productos monitoreados</h1>

      {/* Formulario */}
      {/* PENDIENTE DISEÑO: fondo, bordes y sombra del formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">
          {editId ? 'Editar producto' : 'Agregar producto'}
        </h2>

        {error && (
          /* PENDIENTE DISEÑO: color de alerta de error */
          <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre del producto *" htmlFor="name">
            <input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: iPhone 13 Pro" className={inputCls} required />
          </Field>
          <Field label="Palabras clave de búsqueda *" htmlFor="keywords">
            <input id="keywords" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
              placeholder="Ej: iphone 13 pro 256gb" className={inputCls} required />
          </Field>
          <Field label="Precio mínimo (USD) *" htmlFor="minPrice">
            <input id="minPrice" type="number" min="0" step="0.01" value={form.minPrice}
              onChange={e => setForm(f => ({ ...f, minPrice: e.target.value }))}
              placeholder="0.00" className={inputCls} required />
          </Field>
          <Field label="Precio máximo (USD) *" htmlFor="maxPrice">
            <input id="maxPrice" type="number" min="0" step="0.01" value={form.maxPrice}
              onChange={e => setForm(f => ({ ...f, maxPrice: e.target.value }))}
              placeholder="999.99" className={inputCls} required />
          </Field>
          <Field label="Condición" htmlFor="condition">
            <select id="condition" value={form.condition}
              onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className={inputCls}>
              {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Marketplace" htmlFor="marketplace">
            <select id="marketplace" value={form.marketplace}
              onChange={e => setForm(f => ({ ...f, marketplace: e.target.value }))} className={inputCls}>
              {MARKETPLACE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <input id="active" type="checkbox" checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            className="h-4 w-4 text-primary-600 rounded" />
          <label htmlFor="active" className="text-sm text-gray-700">Monitoreo activo</label>
        </div>

        <div className="flex gap-3">
          {/* PENDIENTE DISEÑO: color de botón primario */}
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando…' : editId ? 'Actualizar' : 'Agregar producto'}
          </button>
          {editId && (
            /* PENDIENTE DISEÑO: color de botón secundario/cancelar */
            <button type="button" onClick={() => { setEditId(null); setForm(emptyForm); }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      {loading ? (
        <p className="text-gray-500 text-sm">Cargando productos…</p>
      ) : products.length === 0 ? (
        /* PENDIENTE DISEÑO: estado vacío */
        <p className="text-gray-500 text-sm">No hay productos aún. Agrega el primero arriba.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      {/* PENDIENTE DISEÑO: color de label del formulario */}
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
