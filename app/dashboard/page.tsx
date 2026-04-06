'use client';
import { useEffect, useState } from 'react';
import { AlertBadge } from '@/components/AlertBadge';
import { timeAgo, toDate } from '@/lib/utils';
import type { Alert, Product } from '@/lib/firebase';
import { MagnifyingGlass, Package, Bell, Timer, ArrowRight } from '@phosphor-icons/react';

interface DashboardData {
  activeProducts: number;
  totalProducts: number;
  alertsToday: number;
  lastCheck: string | null;
  recentAlerts: Alert[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [productsRes, alertsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/alerts'),
        ]);
        const productsData = await productsRes.json();
        const alertsData   = await alertsRes.json();
        const products: Product[] = Array.isArray(productsData) ? productsData : [];
        const alerts: Alert[]     = Array.isArray(alertsData)   ? alertsData   : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const alertsToday = alerts.filter(
          a => toDate(a.sentAt) >= today
        ).length;

        setData({
          activeProducts: products.filter(p => p.active).length,
          totalProducts:  products.length,
          alertsToday,
          lastCheck:      null,
          recentAlerts:   alerts.slice(0, 10),
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-1)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Resumen del monitoreo de precios</p>
      </div>

      {/* Metrics — asymmetric 2+2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
          ))
        ) : (
          <>
            <MetricCard
              label="Productos activos"
              value={data?.activeProducts ?? 0}
              Icon={MagnifyingGlass}
              accent
              delay={0}
            />
            <MetricCard
              label="Total productos"
              value={data?.totalProducts ?? 0}
              Icon={Package}
              delay={80}
            />
            <MetricCard
              label="Alertas hoy"
              value={data?.alertsToday ?? 0}
              Icon={Bell}
              delay={160}
            />
            <MetricCard
              label="Última verificación"
              value={data?.lastCheck ? timeAgo(new Date(data.lastCheck)) : 'N/D'}
              Icon={Timer}
              isText
              delay={240}
            />
          </>
        )}
      </div>

      {/* Recent alerts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-1)] tracking-tight">Últimas ofertas detectadas</h2>
          {(data?.recentAlerts.length ?? 0) > 0 && (
            <a href="/history" className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-spring">
              Ver todo <ArrowRight size={12} />
            </a>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : data?.recentAlerts.length === 0 ? (
          <EmptyAlerts />
        ) : (
          <div className="space-y-2">
            {data?.recentAlerts.map((alert, i) => (
              <div
                key={alert.id}
                className="animate-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <AlertBadge alert={alert} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label, value, Icon, accent = false, isText = false, delay = 0,
}: {
  label: string;
  value: number | string;
  Icon: React.ElementType;
  accent?: boolean;
  isText?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="animate-in bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4 shadow-card hover:shadow-card-hover transition-spring hover:-translate-y-[1px]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={[
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        accent ? 'bg-emerald-50' : 'bg-zinc-100',
      ].join(' ')}>
        <Icon size={20} weight="duotone" className={accent ? 'text-emerald-600' : 'text-zinc-500'} />
      </div>
      <div className="min-w-0">
        <p className={[
          'font-semibold text-[var(--text-1)] tracking-tight',
          isText ? 'text-base' : 'text-2xl',
        ].join(' ')}>
          {value}
        </p>
        <p className="text-xs text-[var(--text-3)] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function EmptyAlerts() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl border-dashed">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
        <Bell size={22} weight="duotone" className="text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-[var(--text-2)]">Sin alertas todavía</p>
      <p className="text-xs text-[var(--text-3)] mt-1 max-w-[240px]">
        Agrega productos y el monitor detectará ofertas automáticamente
      </p>
      <a
        href="/products"
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-spring active:scale-[0.98]"
      >
        <Package size={13} weight="fill" />
        Agregar producto
      </a>
    </div>
  );
}
