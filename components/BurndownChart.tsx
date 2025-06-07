import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LegendProps, ReferenceLine } from 'recharts';
import React, { useState } from 'react';

export interface BurndownChartRoleData {
  role: string; // např. 'FE'
  color: string;
  data: { date: string; percentDone: number }[];
}

interface BurndownChartProps {
  roles: BurndownChartRoleData[];
  total: { date: string; percentDone: number }[];
  slip?: number | null;
  calculatedDeliveryDate: string; // ve formátu YYYY-MM-DD nebo Date
  deliveryDate: string; // nový prop pro termín dodání
}

type ChartDatum = {
  date: string;
  total: number;
  ideal: number;
  [role: string]: string | number;
};

export const BurndownChart: React.FC<BurndownChartProps> = ({ roles, total, slip, calculatedDeliveryDate, deliveryDate }) => {
  // Najdi index, kde je datum == deliveryDate
  let deliveryIdx = -1;
  if (deliveryDate) {
    const d = new Date(deliveryDate);
    const label = `${d.getDate()}.${d.getMonth() + 1}.`;
    deliveryIdx = total.findIndex(t => t.date === label);
  }
  // Vygeneruj ideální průběh pouze do termínu dodání
  const idealData = total.map((d, idx) => {
    if (deliveryIdx !== -1 && idx > deliveryIdx) return { date: d.date, ideal: null };
    return {
      date: d.date,
      ideal: Math.round((idx / (deliveryIdx !== -1 ? deliveryIdx : total.length - 1)) * 100),
    };
  });
  // Pro červenou čáru po termínu dodání
  let afterDeliveryLine: { date: string; value: number | null }[] = [];
  if (deliveryIdx !== -1) {
    const endIdx = total.length - 1;
    const lastIdeal = idealData[deliveryIdx]?.ideal ?? 100;
    for (let i = deliveryIdx; i <= endIdx; i++) {
      afterDeliveryLine.push({ date: total[i].date, value: lastIdeal });
    }
  }
  // Sloučím data pro graf podle data
  const chartData: ChartDatum[] = total.map((d, idx) => {
    const entry: ChartDatum = {
      date: d.date,
      total: d.percentDone,
      ideal: idealData[idx].ideal,
    };
    roles.forEach(role => {
      entry[role.role] = role.data[idx]?.percentDone ?? 0;
    });
    // Přidej červenou čáru po termínu dodání
    if (afterDeliveryLine.length && idx >= deliveryIdx) {
      entry['afterDelivery'] = afterDeliveryLine[idx - deliveryIdx]?.value ?? null;
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
  // Předpokládáme, že date v chartData je ve formátu 'D.M.'
  let refLineX: string | null = null;
  if (calculatedDeliveryDate) {
    const calcDate = new Date(calculatedDeliveryDate);
    const label = `${calcDate.getDate()}.${calcDate.getMonth() + 1}.`;
    if (chartData.some(d => d.date === label)) {
      refLineX = label;
    }
  }

  // Stav pro skrytí/zobrazení čar
  const [hidden, setHidden] = useState<{ [role: string]: boolean }>({});
  // Stav pro zvýraznění čáry při najetí na legendu
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // Typuj správně podle LegendProps
  const handleLegendClick: LegendProps['onClick'] = (e) => {
    if (!e || typeof e.dataKey !== 'string') return;
    setHidden(h => ({ ...h, [e.dataKey]: !h[e.dataKey] }));
  };
  const handleLegendMouseEnter: LegendProps['onMouseEnter'] = (e) => {
    if (!e || typeof e.dataKey !== 'string') return;
    setHighlighted(e.dataKey);
  };
  const handleLegendMouseLeave: LegendProps['onMouseLeave'] = () => {
    setHighlighted(null);
  };

  // Custom Tooltip pro lepší přehlednost
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white border rounded shadow p-2 text-xs">
        <div className="font-semibold mb-1">{label}</div>
        {payload.map((item: any) => (
          <div key={item.dataKey} style={{ color: item.color, fontWeight: item.dataKey === 'total' ? 'bold' : undefined }}>
            {item.name}: {item.value}%
          </div>
        ))}
      </div>
    );
  };

  // Barva reference podle skluzu
  const refColor = typeof slip === 'number' ? (slip < 0 ? '#e11d48' : '#059669') : '#2563eb';

  // Custom label komponenta pro ReferenceLine
  const RefLineLabel = (props: any) => {
    const { x, y, viewBox } = props;
    if (x == null || y == null || !viewBox) return null;
    const width = viewBox.width;
    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    let xPos = x;
    // Pokud je čára blízko levému okraji
    if (x < 60) {
      textAnchor = 'start';
      xPos = x + 4;
    } else if (x > width - 60) {
      textAnchor = 'end';
      xPos = x - 4;
    }
    const mainText = slip !== undefined && slip !== null
      ? (slip < 0 ? 'Ve skluzu' : 'Na čas')
      : '';
    const mainColor = slip !== undefined && slip !== null
      ? (slip < 0 ? '#e11d48' : '#059669')
      : refColor;
    return (
      <g>
        <text x={xPos} y={y - 20} textAnchor={textAnchor} fontWeight="bold" fontSize="16" fill={mainColor}>{mainText}</text>
        <text x={xPos} y={y - 2} textAnchor={textAnchor} fontSize="12" fill={mainColor} opacity="0.7">Spočítaný termín</text>
      </g>
    );
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto', padding: '8px 0' }}>
      <ResponsiveContainer width="100%" height={320} minWidth={600}>
        <LineChart data={chartData} margin={{ top: 24, right: 40, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={0} interval={0} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            onClick={handleLegendClick}
            onMouseEnter={handleLegendMouseEnter}
            onMouseLeave={handleLegendMouseLeave}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#111"
            name="Celkem % hotovo"
            dot
            hide={!!hidden['total']}
            strokeWidth={highlighted === 'total' ? 4 : 2}
            isAnimationActive={false}
          />
          {roles.map(role => (
            <Line
              key={role.role}
              type="monotone"
              dataKey={role.role}
              stroke={role.color}
              name={`${role.role} % hotovo`}
              dot
              hide={!!hidden[role.role]}
              strokeWidth={highlighted === role.role ? 4 : 2}
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
            hide={!!hidden['ideal']}
            strokeWidth={highlighted === 'ideal' ? 4 : 2}
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
          {/* Svislá čára pro termín dodání */}
          {deliveryLineX && (
            <ReferenceLine
              x={deliveryLineX}
              stroke="#e11d48"
              label={{ value: 'Termín dodání', position: 'top', fill: '#e11d48', fontWeight: 'bold', fontSize: 12 }}
              strokeDasharray="2 2"
            />
          )}
          {/* Svislá čára pro spočítaný termín (původní) */}
          {refLineX && (
            <ReferenceLine
              x={refLineX}
              stroke={refColor}
              label={<RefLineLabel />}
              strokeDasharray="3 3"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {typeof slip === 'number' && (
        <div className={slip < 0 ? 'text-red-600 font-bold mt-2' : 'text-green-600 font-bold mt-2'}>
          {slip < 0 ? `Ve skluzu (${Math.abs(slip)} dní)` : `Na čas (+${slip} dní rezerva)`}
        </div>
      )}
    </div>
  );
};

export default BurndownChart; 