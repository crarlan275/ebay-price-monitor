'use client';
// ============================================================
// app/dashboard/page.tsx — Resumen principal
// ============================================================
// PENDIENTE DISEÑO: color de fondo de tarjetas, tipografía de métricas
// ============================================================
import { useEffect, useState } from 'react';
import { AlertBadge } from '@/components/AlertBadge';
import { formatDate, timeAgo } from '@/lib/utils';
import type { Alert, Product } from '@/lib/firebase';

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
        const products: Product[] = await productsRes.json();
        const alerts: Alert[]     = await alertsRes.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const alertsToday = alerts.filter(
          a => new Date((a.sentAt as any).seconds * 1000) >= today
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

  if (loading) {
    return (
      /* PENDIENTE DISEÑO: skeleton/spinner de carga */
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* PENDIENTE DISEÑO: tipografía y color de título de sección */}
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Métricas */}
      {/* PENDIENTE DISEÑO: color de fondo y borde de las tarjetas de métricas */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Productos activos" value={data?.activeProducts ?? 0} icon="🔍" />
        <MetricCard title="Total productos"   value={data?.totalProducts ?? 0}  icon="📦" />
        <MetricCard title="Alertas hoy"       value={data?.alertsToday ?? 0}    icon="🔔" />
        <MetricCard
          title="Última verificación"
          value={data?.lastCheck ? timeAgo(new Date(data.lastCheck)) : 'N/D'}
          icon="⏱️"
          isText
        />
      </div>

      {/* Alertas recientes */}
      <section>
        {/* PENDIENTE DISEÑO: color de encabezado de sección */}
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Últimas ofertas detectadas</h2>
        {data?.recentAlerts.length === 0 ? (
          /* PENDIENTE DISEÑO: estado vacío */
          <p className="text-gray-500 text-sm">Aún no hay alertas registradas.</p>
        ) : (
          <div className="space-y-3">
            {data?.recentAlerts.map(alert => (
              <AlertBadge key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  title, value, icon, isText = false,
}: {
  title: string; value: number | string; icon: string; isText?: boolean;
}) {
  return (
    /* PENDIENTE DISEÑO: sombra, bordes y colores de la tarjeta métrica */
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        {/* PENDIENTE DISEÑO: color del valor numérico */}
        <p className={`${isText ? 'text-base' : 'text-2xl font-bold'} text-gray-900`}>
          {value}
        </p>
        {/* PENDIENTE DISEÑO: color del label */}
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );
}
