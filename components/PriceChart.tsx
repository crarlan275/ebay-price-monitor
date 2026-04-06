'use client';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
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
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#059669" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#059669" stopOpacity={0}    />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,24,27,0.06)" vertical={false} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'var(--font-outfit)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={v => `$${v}`}
          tick={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'var(--font-jetbrains)' }}
          tickLine={false}
          axisLine={false}
          width={52}
        />

        <Tooltip
          formatter={(value: number) => [formatPrice(value), 'Precio']}
          contentStyle={{
            background: '#ffffff',
            border: '1px solid rgba(24,24,27,0.08)',
            borderRadius: '12px',
            fontSize: '12px',
            fontFamily: 'var(--font-outfit)',
            boxShadow: '0 4px 16px -4px rgba(0,0,0,0.08)',
            padding: '8px 12px',
          }}
          itemStyle={{ color: '#059669', fontWeight: 600 }}
          labelStyle={{ color: '#71717a', marginBottom: 4 }}
          cursor={{ stroke: 'rgba(5,150,105,0.2)', strokeWidth: 1 }}
        />

        <Area
          type="monotone"
          dataKey="price"
          stroke="#059669"
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#059669', stroke: '#ecfdf5', strokeWidth: 2 }}
          name="Precio USD"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
