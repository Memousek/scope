import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export interface BurndownChartRoleData {
  value: string;
  label: string;
  color: string;
}

interface ChartData {
  date: string;
  ideal: number | null;
  total: number;
  [key: string]: string | number | null;
}

interface BurndownChartProps {
  roles: BurndownChartRoleData[];
  totalData: { date: string; percentDone: number; [key: string]: number | string }[];
  slip: number;
  calculatedDeliveryDate: Date;
  deliveryDate: Date;
}

export default function BurndownChart({ roles, totalData, slip, calculatedDeliveryDate, deliveryDate }: BurndownChartProps) {
  // Najdi index, kde je datum == deliveryDate
  let deliveryIdx = -1;
  if (deliveryDate) {
    const d = new Date(deliveryDate);
    const label = `${d.getDate()}.${d.getMonth() + 1}.`;
    deliveryIdx = totalData.findIndex(t => t.date === label);
  }
  // Vygeneruj ideální průběh pouze do termínu dodání
  const idealData = totalData.map((d, idx) => {
    if (deliveryIdx !== -1 && idx > deliveryIdx) return { date: d.date, ideal: null };
    return {
      date: d.date,
      ideal: Math.round((idx / (deliveryIdx !== -1 ? deliveryIdx : totalData.length - 1)) * 100),
    };
  });
  // Pro červenou čáru po termínu dodání
  const afterDeliveryLine: { date: string; value: number }[] = [];
  if (deliveryIdx !== -1) {
    const endIdx = totalData.length - 1;
    const lastIdeal = idealData[deliveryIdx]?.ideal ?? 100;
    for (let i = deliveryIdx; i <= endIdx; i++) {
      afterDeliveryLine.push({ date: totalData[i].date, value: typeof lastIdeal === 'number' ? lastIdeal : 100 });
    }
  }
  // Sloučím data pro graf podle data
  const chartData: ChartData[] = totalData.map((d, idx) => {
    const entry: ChartData = {
      date: d.date,
      ideal: idealData[idx]?.ideal ?? 0,
      total: d.percentDone,
    };
    roles.forEach(role => {
      entry[role.value] = d[role.value] ?? 0;
    });
    // Přidej červenou čáru po termínu dodání
    if (afterDeliveryLine.length && idx >= deliveryIdx) {
      const val = afterDeliveryLine[idx - deliveryIdx]?.value;
      if (typeof val === 'number') {
        entry['afterDelivery'] = val;
      }
    }
    return entry;
  });

  // Najdi odpovídající hodnotu na ose X pro ReferenceLine pro deliveryDate
  let deliveryLineX: string | null = null;
  if (deliveryDate) {
    const d = new Date(deliveryDate);
    const label = `${d.getDate()}.${d.getMonth() + 1}.`;
    if (chartData.some(d => d.date === label)) {
      deliveryLineX = label;
    }
  }

  // Najdi odpovídající hodnotu na ose X pro ReferenceLine
  let refLineX: string | null = null;
  if (calculatedDeliveryDate) {
    const calcDate = new Date(calculatedDeliveryDate);
    const label = `${calcDate.getDate()}.${calcDate.getMonth() + 1}.`;
    if (chartData.some(d => d.date === label)) {
      refLineX = label;
    }
  }

  // Barva reference podle skluzu
  const refColor = typeof slip === 'number' ? (slip < 0 ? '#e11d48' : '#059669') : '#2563eb';
  const refLabel = typeof slip === 'number' ? (slip < 0 ? 'Skluz' : 'Rezerva') : '';

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto', padding: '8px 0' }}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 24, right: 40, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={0} interval={0} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#111"
            name="Celkem % hotovo"
            dot
            strokeWidth={2}
            isAnimationActive={false}
          />
          {roles.map(role => (
            <Line
              key={role.value}
              type="monotone"
              dataKey={role.value}
              stroke={role.color}
              name={`${role.label} % hotovo`}
              dot
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#888"
            name="Ideální průběh"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
            connectNulls={false}
          />
          {/* Červená čára po termínu dodání */}
          {afterDeliveryLine.length > 1 && (
            <Line
              type="linear"
              dataKey="afterDelivery"
              stroke="#e11d48"
              name="Skluz po termínu"
              dot={false}
              strokeWidth={3}
              isAnimationActive={false}
              connectNulls={false}
            />
          )}
          {/* Svislá čára pro plánovaný termín */}
          {deliveryLineX && (
            <ReferenceLine
              x={deliveryLineX}
              stroke="#e11d48"
              label={{ value: 'Plánovaný termín', position: 'top', fill: '#e11d48', fontWeight: 'bold', fontSize: 12 }}
              strokeDasharray="2 2"
            />
          )}
          {/* Svislá čára pro odhadovaný termín */}
          {refLineX && (
            <ReferenceLine
              x={refLineX}
              stroke={refColor}
              label={{ value: refLabel ? refLabel : 'Odhadovaný termín', position: 'top', fill: refColor, fontWeight: 'bold', fontSize: 12 }}
              strokeDasharray="3 3"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {typeof slip === 'number' && (
        <div className={slip < 0 ? 'text-red-600 font-bold mt-2' : 'text-green-600 font-bold mt-2'}>
          {slip < 0 ? `Ve skluzu (${Math.abs(slip)} dní)` : `Rezerva (+${slip} dní)`}
        </div>
      )}
    </div>
  );
} 