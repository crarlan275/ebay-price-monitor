'use client';
import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/lib/firebase';
import { Plus, X, Package, MapPin, XCircle, MagnifyingGlass, CheckSquare, Timer, Warning } from '@phosphor-icons/react';
import { timeAgo } from '@/lib/utils';

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

const COUNTRY_OPTIONS = [
  { value: '',          label: 'Todos los países' },
  { value: 'US',        label: '🇺🇸 Estados Unidos' },
  { value: 'GB',        label: '🇬🇧 Reino Unido' },
  { value: 'WORLDWIDE', label: '🌍 Internacional' },
];

const EXCLUDE_CONDITION_OPTIONS = [
  { value: 'for parts',            label: 'For Parts / Not Working' },
  { value: 'parts only',           label: 'Parts Only' },
  { value: 'open box',             label: 'Open Box' },
  { value: 'seller refurbished',   label: 'Seller Refurbished' },
  { value: 'certified refurbished',label: 'Certified Refurbished' },
  { value: 'pre-owned',            label: 'Pre-Owned' },
];

const emptyForm = {
  name: '', keywords: '', minPrice: '', maxPrice: '',
  condition: 'ANY', marketplace: 'EBAY_US',
  excludeKeywords: '', requireKeywords: '', country: '', active: true,
  searchLimit: '0', detectLots: false, detectBids: false,
  checkIntervalMinutes: '60',
  excludeConditions: [] as string[],
};

export default function ProductsPage() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [form, setForm]               = useState(emptyForm);
  const [editId, setEditId]           = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [lastCronRun, setLastCronRun] = useState<Date | null>(null);

  async function loadProducts() {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadCronState() {
    try {
      const res = await fetch('/api/cron-state');
      if (!res.ok) return;
      const data = await res.json();
      if (data.lastRunAt) setLastCronRun(new Date(data.lastRunAt * 1000));
    } catch {}
  }

  useEffect(() => {
    loadProducts();
    loadCronState();
    const interval = setInterval(loadCronState, 60_000);
    return () => clearInterval(interval);
  }, []);

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
        minPrice:             parseFloat(form.minPrice),
        maxPrice:             parseFloat(form.maxPrice),
        searchLimit:          parseInt(form.searchLimit) || 0,
        checkIntervalMinutes: Math.max(parseInt(form.checkIntervalMinutes) || 60, 5),
      };
      const method = editId ? 'PUT' : 'POST';
      const url    = editId ? `/api/products?id=${editId}` : '/api/products';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
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

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/products?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    await loadProducts();
  }

  async function handleSearch(id: string) {
    await fetch(`/api/products?id=${id}&forceSearch=1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastCheckedAt: null }),
    });
  }

  function handleEdit(product: Product) {
    setEditId(product.id!);
    setForm({
      name:            product.name,
      keywords:        product.keywords,
      minPrice:        String(product.minPrice),
      maxPrice:        String(product.maxPrice),
      condition:       product.condition,
      marketplace:     product.marketplace,
      excludeKeywords: product.excludeKeywords ?? '',
      requireKeywords: product.requireKeywords ?? '',
      country:         product.country ?? '',
      active:          product.active,
      searchLimit:          String(product.searchLimit ?? 0),
      detectLots:           product.detectLots ?? false,
      detectBids:           product.detectBids ?? false,
      checkIntervalMinutes: String(product.checkIntervalMinutes ?? 60),
      excludeConditions:    product.excludeConditions ?? [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancel() {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-1)]">Productos</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Gestiona los ítems que monitorizas</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-spring active:scale-[0.98] shadow-sm"
          >
            <Plus size={15} weight="bold" />
            Nuevo producto
          </button>
        )}
      </div>

      {/* Banner estado del cron */}
      {(() => {
        const minutesAgo = lastCronRun ? Math.floor((Date.now() - lastCronRun.getTime()) / 60_000) : null;
        // GitHub Actions corre cada 30 min — "activo" si fue hace ≤35 min, "detenido" si hace >45 min
        const isAlive    = minutesAgo !== null && minutesAgo <= 35;
        const isDead     = minutesAgo === null || minutesAgo > 45;
        return (
          <div className={[
            'flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-medium',
            isAlive ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : isDead ? 'bg-red-50 border-red-200 text-red-700'
                             : 'bg-amber-50 border-amber-200 text-amber-700',
          ].join(' ')}>
            {isDead
              ? <Warning size={14} weight="fill" className="shrink-0" />
              : <span className={['w-2 h-2 rounded-full shrink-0', isAlive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'].join(' ')} />
            }
            {minutesAgo === null
              ? 'El cron no ha corrido nunca — verifica GitHub Actions'
              : isDead
              ? `Cron tardío — última ejecución hace ${minutesAgo} min. Verifica GitHub Actions`
              : isAlive
              ? `Cron activo — última ejecución ${timeAgo(lastCronRun)}`
              : `Cron pendiente — última ejecución hace ${minutesAgo} min (corre cada 30 min)`
            }
          </div>
        );
      })()}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="animate-in bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-card"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-[var(--text-1)]">
              {editId ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:bg-zinc-100 transition-spring"
            >
              <X size={14} weight="bold" />
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Fila 1: Nombre + Keywords */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre del producto *" htmlFor="name">
              <input
                id="name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: iPhone 15 Pro Max" className={inputCls} required
              />
            </Field>
            <Field label="Palabras clave de búsqueda *" htmlFor="keywords">
              <input
                id="keywords" value={form.keywords}
                onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                placeholder="Ej: iPhone 15 Pro Max 512GB unlocked" className={inputCls} required
              />
            </Field>
          </div>

          {/* Fila 2: Precios */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio mínimo (USD) *" htmlFor="minPrice">
              <input
                id="minPrice" type="number" min="0" step="0.01" value={form.minPrice}
                onChange={e => setForm(f => ({ ...f, minPrice: e.target.value }))}
                placeholder="0.00" className={inputCls} required
              />
            </Field>
            <Field label="Precio máximo (USD) *" htmlFor="maxPrice">
              <input
                id="maxPrice" type="number" min="0" step="0.01" value={form.maxPrice}
                onChange={e => setForm(f => ({ ...f, maxPrice: e.target.value }))}
                placeholder="999.99" className={inputCls} required
              />
            </Field>
          </div>

          {/* Fila 3: Condición + Marketplace + País */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Condición" htmlFor="condition">
              <select
                id="condition" value={form.condition}
                onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                className={inputCls}
              >
                {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Marketplace" htmlFor="marketplace">
              <select
                id="marketplace" value={form.marketplace}
                onChange={e => setForm(f => ({ ...f, marketplace: e.target.value }))}
                className={inputCls}
              >
                {MARKETPLACE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="País del vendedor" htmlFor="country">
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
                <select
                  id="country" value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className={inputCls + ' pl-8'}
                >
                  {COUNTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </Field>
          </div>

          {/* Fila 4: Palabras excluidas — ancho completo */}
          <Field label="Excluir palabras del título (separadas por comas)" htmlFor="excludeKeywords">
            <div className="relative">
              <XCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
              <input
                id="excludeKeywords" value={form.excludeKeywords}
                onChange={e => setForm(f => ({ ...f, excludeKeywords: e.target.value }))}
                placeholder="Ej: broken, cracked, parts only, for parts, damaged, repair"
                className={inputCls + ' pl-8'}
              />
            </div>
            <p className="text-xs text-[var(--text-3)] mt-1">
              Los resultados que contengan estas palabras serán ignorados automáticamente
            </p>
          </Field>

          {/* Condiciones a excluir */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--text-2)] flex items-center gap-1.5">
              <XCircle size={13} className="text-red-400" weight="fill" />
              Excluir condiciones de eBay
            </label>
            <div className="flex flex-wrap gap-2">
              {EXCLUDE_CONDITION_OPTIONS.map(opt => {
                const active = form.excludeConditions.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      excludeConditions: active
                        ? f.excludeConditions.filter(c => c !== opt.value)
                        : [...f.excludeConditions, opt.value],
                    }))}
                    className={[
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-spring',
                      active
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-zinc-50 border-[var(--border)] text-[var(--text-3)] hover:bg-zinc-100',
                    ].join(' ')}
                  >
                    {active ? '✕ ' : ''}{opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-3)]">
              Los resultados con estas condiciones serán ignorados automáticamente
            </p>
          </div>

          {/* Palabras requeridas en título */}
          <Field label="Palabras que DEBEN aparecer en el título (separadas por comas)" htmlFor="requireKeywords">
            <div className="relative">
              <CheckSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
              <input
                id="requireKeywords" value={form.requireKeywords}
                onChange={e => setForm(f => ({ ...f, requireKeywords: e.target.value }))}
                placeholder='Ej: 16, pro max (para filtrar solo iPhone 16 Pro Max)'
                className={inputCls + ' pl-8'}
              />
            </div>
            <p className="text-xs text-[var(--text-3)] mt-1">
              Solo se guardarán resultados donde el título contenga <strong>todas</strong> estas palabras. Útil para excluir modelos similares (ej: poner <code className="bg-zinc-100 px-1 rounded">16</code> evita que aparezcan iPhone 14/15).
            </p>
          </Field>

          {/* Fila 5: Cantidad de resultados + Intervalo de chequeo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cantidad de resultados a buscar" htmlFor="searchLimit">
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
                <input
                  id="searchLimit" type="number" min="0" max="200" value={form.searchLimit}
                  onChange={e => setForm(f => ({ ...f, searchLimit: e.target.value }))}
                  placeholder="20" className={inputCls + ' pl-8'}
                />
              </div>
              <p className="text-xs text-[var(--text-3)] mt-1">
                0 = ilimitado (hasta 200 resultados) · Recomendado: 20–50
              </p>
            </Field>
            <Field label="Intervalo de chequeo (minutos)" htmlFor="checkIntervalMinutes">
              <div className="relative">
                <Timer size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
                <input
                  id="checkIntervalMinutes" type="number" min="5" max="1440" value={form.checkIntervalMinutes}
                  onChange={e => setForm(f => ({ ...f, checkIntervalMinutes: e.target.value }))}
                  placeholder="60" className={inputCls + ' pl-8'}
                />
              </div>
              <p className="text-xs text-[var(--text-3)] mt-1">
                Mínimo 5 min · Cada cuánto se revisa este producto individualmente
              </p>
            </Field>
          </div>

          {/* Toggle detectar lotes */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, detectLots: !f.detectLots }))}
                className={[
                  'relative w-9 h-5 rounded-full transition-spring cursor-pointer',
                  form.detectLots ? 'bg-emerald-500' : 'bg-zinc-300',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-spring',
                  form.detectLots ? 'left-4' : 'left-0.5',
                ].join(' ')} />
              </div>
              <span className="text-sm text-[var(--text-2)]">🎁 Detectar ventas por lote</span>
            </label>
            {form.detectLots && (
              <p className="text-xs text-[var(--text-3)] ml-11">
                Si alguien vende en lote (ej: 10 unidades × $12/u = $120 total) y el precio por unidad cae en tu rango, recibirás una alerta especial.
              </p>
            )}
          </div>

          {/* Toggle detectar bids */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, detectBids: !f.detectBids }))}
                className={[
                  'relative w-9 h-5 rounded-full transition-spring cursor-pointer',
                  form.detectBids ? 'bg-blue-500' : 'bg-zinc-300',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-spring',
                  form.detectBids ? 'left-4' : 'left-0.5',
                ].join(' ')} />
              </div>
              <span className="text-sm text-[var(--text-2)]">🔨 Detectar subastas (bids)</span>
            </label>
            {form.detectBids && (
              <p className="text-xs text-[var(--text-3)] ml-11">
                Se alertan subastas con menos de 3 horas restantes. Recibirás alertas escalonadas a las 2h, 1h, 30min, 20min y 10min para tener tiempo de reacción.
              </p>
            )}
          </div>

          {/* Toggle activo */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className={[
                'relative w-9 h-5 rounded-full transition-spring cursor-pointer',
                form.active ? 'bg-emerald-500' : 'bg-zinc-300',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-spring',
                form.active ? 'left-4' : 'left-0.5',
              ].join(' ')} />
            </div>
            <span className="text-sm text-[var(--text-2)]">Monitoreo activo</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={saving}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-spring active:scale-[0.98]"
            >
              {saving ? 'Guardando…' : editId ? 'Actualizar' : 'Agregar producto'}
            </button>
            <button
              type="button" onClick={handleCancel}
              className="px-4 py-2.5 text-sm font-medium text-[var(--text-2)] bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-spring active:scale-[0.98]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyProducts onAdd={() => setShowForm(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <div key={p.id} className="animate-in" style={{ animationDelay: `${i * 50}ms` }}>
              <ProductCard product={p} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} onSearch={handleSearch} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls = [
  'w-full px-3.5 py-2.5 bg-zinc-50 border border-[var(--border)] rounded-xl text-sm',
  'text-[var(--text-1)] placeholder:text-[var(--text-3)]',
  'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
  'transition-spring',
].join(' ');

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-[var(--text-2)]">{label}</label>
      {children}
    </div>
  );
}

function EmptyProducts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl border-dashed">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
        <Package size={22} weight="duotone" className="text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-[var(--text-2)]">Sin productos todavía</p>
      <p className="text-xs text-[var(--text-3)] mt-1 max-w-[220px]">
        Agrega un producto para comenzar el monitoreo de precios
      </p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-spring active:scale-[0.98]"
      >
        <Plus size={13} weight="bold" />
        Agregar producto
      </button>
    </div>
  );
}
