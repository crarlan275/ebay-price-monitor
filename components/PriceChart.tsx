'use client';
// ============================================================
// components/PriceChart.tsx — Gráfica de evolución de precios
// ============================================================
// PENDIENTE DISEÑO: colores de línea, área, tooltip y ejes
// ============================================================
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { formatPrice } from '@/lib/utils';

interface DataPoint {
  date:  string;
  price: number;
}

interface Props {
  data: DataPoint[];
}

export function PriceChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        {/* PENDIENTE DISEÑO: color de gradiente del área */}
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
          </linearGradient>
        </defs>

        {/* PENDIENTE DISEÑO: color de líneas de grilla */}
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        {/* PENDIENTE DISEÑO: tipografía y color de ejes */}
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `$${v}`}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={60}
        />

        {/* PENDIENTE DISEÑO: estilo del tooltip */}
        <Tooltip
          formatter={(value: number) => [formatPrice(value), 'Precio']}
          contentStyle={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />

        {/* PENDIENTE DISEÑO: color de línea y área */}
        <Area
          type="monotone"
          dataKey="price"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={{ r: 3, fill: '#3b82f6' }}
          activeDot={{ r: 5 }}
          name="Precio USD"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
