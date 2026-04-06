'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { PriceChart } from '@/components/PriceChart';
import { formatPrice, formatDate, toDate } from '@/lib/utils';
import type { Product, PriceHistory } from '@/lib/firebase';
import { ChartLine, ArrowSquareOut, Package, Stack, Gavel, Tag, CheckCircle, Circle,
         SortAscending, SortDescending, Clock } from '@phosphor-icons/react';

type Tab  = 'all' | 'units' | 'lots' | 'bids' | 'bids-lot';
type Sort = 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc';

function formatTimeLeft(minutes?: number): string {
  if (minutes === undefined || minutes === null) return '—';
  if (minutes < 1)  return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function HistoryPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [history, setHistory]       = useState<PriceHistory[]>([]);
  const [selectedId, setSelected]   = useState<string>('');
  const [loading, setLoading]       = useState(false);
  const [tab, setTab]               = useState<Tab>('all');
  const [sort, setSort]             = useState<Sort>('date-desc');
  // Optimistic seen state: map historyId → seen
  const [seenMap, setSeenMap]       = useState<Record<string, boolean>>({});
  const [toggling, setToggling]     = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []));
  }, []);

  const loadHistory = useCallback(async (productId: string) => {
    setSelected(productId);
    setTab('all');
    setSort('date-desc');
    setSeenMap({});
    if (!productId) { setHistory([]); return; }
    setLoading(true);
    const res  = await fetch(`/api/products?history=1&id=${productId}`);
    const data = await res.json();
    const items: PriceHistory[] = Array.isArray(data) ? data : [];
    setHistory(items);
    // Inicializar seenMap con el valor de Firestore
    const initial: Record<string, boolean> = {};
    items.forEach(h => { if (h.id) initial[h.id] = !!h.seen; });
    setSeenMap(initial);
    setLoading(false);
  }, []);

  async function toggleSeen(item: PriceHistory) {
    if (!item.id || toggling[item.id]) return;
    const newVal = !seenMap[item.id];
    // Actualización optimista
    setSeenMap(m => ({ ...m, [item.id!]: newVal }));
    setToggling(t => ({ ...t, [item.id!]: true }));
    try {
      await fetch(`/api/history?id=${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seen: newVal }),
      });
    } catch {
      // Revertir si falla
      setSeenMap(m => ({ ...m, [item.id!]: !newVal }));
    } finally {
      setToggling(t => ({ ...t, [item.id!]: false }));
    }
  }

  // Clasificar items usando seenMap para el conteo de no vistos
  const withSeen = history.map(h => ({ ...h, _seen: h.id ? (seenMap[h.id] ?? !!h.seen) : !!h.seen }));

  const units   = withSeen.filter(h => !h.lotQuantity && !h.isBid);
  const lots    = withSeen.filter(h => !!h.lotQuantity && !h.isBid);
  const bids    = withSeen.filter(h => !!h.isBid && !h.lotQuantity);
  const bidsLot = withSeen.filter(h => !!h.isBid && !!h.lotQuantity);

  const unreadCount = (arr: typeof withSeen) => arr.filter(h => !h._seen).length;

  const rawShown = tab === 'units'    ? units
                 : tab === 'lots'     ? lots
                 : tab === 'bids'     ? bids
                 : tab === 'bids-lot' ? bidsLot
                 : withSeen;

  const shown = useMemo(() => {
    const arr = [...rawShown];
    const getPrice = (h: typeof arr[0]) =>
      (h.lotQuantity && h.lotPricePerUnit) ? h.lotPricePerUnit : h.price;
    switch (sort) {
      case 'date-desc':  return arr.sort((a, b) => toDate(b.recordedAt).getTime() - toDate(a.recordedAt).getTime());
      case 'date-asc':   return arr.sort((a, b) => toDate(a.recordedAt).getTime() - toDate(b.recordedAt).getTime());
      case 'price-desc': return arr.sort((a, b) => getPrice(b) - getPrice(a));
      case 'price-asc':  return arr.sort((a, b) => getPrice(a) - getPrice(b));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawShown, sort]);

  const chartData = (
    tab === 'lots'     ? lots.map(h    => ({ date: toDate(h.recordedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), price: h.lotPricePerUnit ?? h.price })) :
    tab === 'bids'     ? bids.map(h    => ({ date: toDate(h.recordedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), price: h.price })) :
    tab === 'bids-lot' ? bidsLot.map(h => ({ date: toDate(h.recordedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), price: h.lotPricePerUnit ?? h.price })) :
    units.map(h => ({ date: toDate(h.recordedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), price: h.price }))
  ).reverse();

  const selectedProduct = products.find(p => p.id === selectedId);

  type TabDef = { id: Tab; label: string; total: number; unread: number; icon: React.ElementType; activeCls: string };
  const tabs: TabDef[] = [
    { id: 'all',      label: 'Todos',     total: withSeen.length, unread: unreadCount(withSeen), icon: ChartLine, activeCls: 'bg-emerald-600 text-white' },
    { id: 'units',    label: 'Unidades',  total: units.length,    unread: unreadCount(units),    icon: Package,   activeCls: 'bg-emerald-600 text-white' },
    { id: 'lots',     label: 'Lotes',     total: lots.length,     unread: unreadCount(lots),     icon: Stack,     activeCls: 'bg-amber-500 text-white'   },
    { id: 'bids',     label: 'Bids',      total: bids.length,     unread: unreadCount(bids),     icon: Gavel,     activeCls: 'bg-blue-600 text-white'    },
    { id: 'bids-lot', label: 'Bids Lote', total: bidsLot.length,  unread: unreadCount(bidsLot),  icon: Tag,       activeCls: 'bg-violet-600 text-white'  },
  ];

  const chartBg = tab === 'lots' ? 'bg-amber-50' : tab === 'bids' ? 'bg-blue-50' : tab === 'bids-lot' ? 'bg-violet-50' : 'bg-emerald-50';
  const chartColor = tab === 'lots' ? 'text-amber-600' : tab === 'bids' ? 'text-blue-600' : tab === 'bids-lot' ? 'text-violet-600' : 'text-emerald-600';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-1)]">Historial</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Evolución de precios por producto</p>
        </div>
        <select
          value={selectedId}
          onChange={e => loadHistory(e.target.value)}
          className="px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-spring"
        >
          <option value="">Selecciona un producto</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      {selectedId && !loading && history.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-spring',
                tab === t.id
                  ? t.activeCls + ' shadow-sm'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:bg-zinc-100',
              ].join(' ')}
            >
              <t.icon size={14} weight="duotone" />
              {t.label}
              <span className={[
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.id ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500',
              ].join(' ')}>
                {t.total}
              </span>
              {/* Badge de no vistos */}
              {t.unread > 0 && (
                <span className={[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  tab === t.id ? 'bg-white text-emerald-700' : 'bg-red-500 text-white',
                ].join(' ')}>
                  {t.unread} nuevo{t.unread > 1 ? 's' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      {selectedId && (
        <div className="animate-in bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <div className={['w-8 h-8 rounded-xl flex items-center justify-center', chartBg].join(' ')}>
              <ChartLine size={16} weight="duotone" className={chartColor} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">
                {selectedProduct?.name ?? 'Producto'}
                {tab === 'lots'     && <span className="ml-2 text-xs font-normal text-amber-600">precio/unidad</span>}
                {tab === 'bids'     && <span className="ml-2 text-xs font-normal text-blue-600">puja actual</span>}
                {tab === 'bids-lot' && <span className="ml-2 text-xs font-normal text-violet-600">precio/unidad · bid</span>}
              </p>
              <p className="text-xs text-[var(--text-3)]">Evolución de precios</p>
            </div>
          </div>
          {loading ? (
            <div className="h-[280px] skeleton rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center">
              <ChartLine size={28} weight="duotone" className="text-zinc-300 mb-3" />
              <p className="text-sm text-[var(--text-3)]">Sin datos para esta categoría</p>
            </div>
          ) : (
            <PriceChart data={chartData} />
          )}
        </div>
      )}

      {/* Table */}
      {shown.length > 0 && (
        <div className="animate-in bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-card">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {tab === 'lots'     && <span className="text-lg">🎁</span>}
              {tab === 'bids'     && <span className="text-lg">🔨</span>}
              {tab === 'bids-lot' && <span className="text-lg">🔨🎁</span>}
              <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-widest">
                {tab === 'all'      ? 'Todos los registros'        :
                 tab === 'units'    ? 'Unidades individuales'      :
                 tab === 'lots'     ? 'Ventas por lote'            :
                 tab === 'bids'     ? 'Subastas por unidad'        :
                                      'Subastas por lote'} — {shown.length} entradas
              </p>
            </div>
            {/* Sort controls */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--text-3)] font-medium uppercase tracking-widest mr-1">Ordenar:</span>
              {([
                { id: 'date-desc',  label: 'Reciente',    Icon: Clock },
                { id: 'date-asc',   label: 'Antiguo',     Icon: Clock },
                { id: 'price-asc',  label: 'Precio ↑',    Icon: SortAscending },
                { id: 'price-desc', label: 'Precio ↓',    Icon: SortDescending },
              ] as { id: Sort; label: string; Icon: React.ElementType }[]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setSort(id)}
                  className={[
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-spring',
                    sort === id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[var(--surface-2,#f4f4f5)] text-[var(--text-2)] hover:bg-zinc-200 border border-[var(--border)]',
                  ].join(' ')}
                >
                  <Icon size={11} weight="bold" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {/* Columna visto */}
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => setSort(sort === 'date-desc' ? 'date-asc' : 'date-desc')}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest hover:text-emerald-600 transition-spring group"
                    >
                      Fecha
                      <span className="opacity-60 group-hover:opacity-100">
                        {sort === 'date-desc' ? <SortDescending size={10} weight="bold" /> : sort === 'date-asc' ? <SortAscending size={10} weight="bold" /> : <SortDescending size={10} weight="bold" />}
                      </span>
                      {(sort === 'date-desc' || sort === 'date-asc') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest">Título</th>
                  {tab === 'all' && (
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest">Tipo</th>
                  )}
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => setSort(sort === 'price-asc' ? 'price-desc' : 'price-asc')}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest hover:text-emerald-600 transition-spring group"
                    >
                      {tab === 'lots' || tab === 'bids-lot' ? 'Precio/unidad' : tab === 'bids' ? 'Puja actual' : 'Precio'}
                      <span className="opacity-60 group-hover:opacity-100">
                        {sort === 'price-asc' ? <SortAscending size={10} weight="bold" /> : sort === 'price-desc' ? <SortDescending size={10} weight="bold" /> : <SortDescending size={10} weight="bold" />}
                      </span>
                      {(sort === 'price-asc' || sort === 'price-desc') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
                      )}
                    </button>
                  </th>
                  {(tab === 'lots' || tab === 'bids-lot') && (
                    <>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest">Uds.</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest">Total lote</th>
                    </>
                  )}
                  {(tab === 'bids' || tab === 'bids-lot') && (
                    <>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest">Pujas</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest">T. restante</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest">Condición</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {shown.map((item, i) => {
                  const isLot   = !!item.lotQuantity;
                  const isBid   = !!item.isBid;
                  const isSeen  = item._seen;

                  const rowBg = isBid && isLot ? 'bg-violet-50/30'
                              : isBid          ? 'bg-blue-50/30'
                              : isLot          ? 'bg-amber-50/30'
                              : '';

                  const priceColor = isBid && isLot ? 'text-violet-600'
                                   : isBid          ? 'text-blue-600'
                                   : isLot          ? 'text-amber-600'
                                   : 'text-emerald-600';

                  return (
                    <tr
                      key={item.id}
                      className={[
                        'hover:bg-zinc-50/70 transition-spring animate-in',
                        rowBg,
                        isSeen ? 'opacity-60' : '',
                      ].join(' ')}
                      style={{ animationDelay: `${i * 20}ms` }}
                    >
                      {/* Botón visto */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleSeen(item)}
                          disabled={toggling[item.id ?? ''] ?? false}
                          title={isSeen ? 'Marcar como no visto' : 'Marcar como visto'}
                          className="transition-spring hover:scale-110 active:scale-95 disabled:opacity-40"
                        >
                          {isSeen
                            ? <CheckCircle size={18} weight="fill" className="text-emerald-500" />
                            : <Circle size={18} weight="regular" className="text-zinc-300 hover:text-emerald-400" />
                          }
                        </button>
                      </td>

                      <td className="px-4 py-3 text-xs text-[var(--text-3)] whitespace-nowrap font-mono tabular-nums">
                        {formatDate(toDate(item.recordedAt))}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-1)] max-w-xs truncate">{item.title}</td>

                      {/* Tipo (solo en tab Todos) */}
                      {tab === 'all' && (
                        <td className="px-4 py-3">
                          {isBid && isLot ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">🔨🎁 Bid lote</span>
                          ) : isBid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🔨 Bid</span>
                          ) : isLot ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🎁 Lote</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">📦 Unidad</span>
                          )}
                        </td>
                      )}

                      {/* Precio principal */}
                      <td className="px-4 py-3 font-semibold font-mono tabular-nums">
                        <span className={priceColor}>
                          {isLot && item.lotPricePerUnit ? formatPrice(item.lotPricePerUnit) : formatPrice(item.price)}
                        </span>
                      </td>

                      {/* Columnas lote */}
                      {(tab === 'lots' || tab === 'bids-lot') && (
                        <>
                          <td className="px-4 py-3 text-sm font-mono tabular-nums text-[var(--text-2)]">{item.lotQuantity ?? '—'}</td>
                          <td className={`px-4 py-3 text-sm font-semibold font-mono tabular-nums ${priceColor}`}>{formatPrice(item.price)}</td>
                        </>
                      )}

                      {/* Columnas bid */}
                      {(tab === 'bids' || tab === 'bids-lot') && (
                        <>
                          <td className="px-4 py-3 text-sm font-mono tabular-nums text-[var(--text-2)]">{item.bidCount ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              ⏰ {formatTimeLeft(item.timeLeftMinutes)}
                            </span>
                          </td>
                        </>
                      )}

                      <td className="px-4 py-3">
                        <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{item.condition}</span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={item.url} target="_blank" rel="noopener noreferrer"
                          onClick={() => { if (!item._seen) toggleSeen(item); }}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-spring"
                        >
                          Ver <ArrowSquareOut size={11} weight="bold" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedId && products.length > 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ChartLine size={32} weight="duotone" className="text-zinc-300 mb-3" />
          <p className="text-sm text-[var(--text-3)]">Selecciona un producto para ver su historial</p>
        </div>
      )}
    </div>
  );
}
