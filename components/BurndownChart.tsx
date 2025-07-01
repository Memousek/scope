/**
 * BurndownChart
 * - Zobrazuje burndown graf s možností exportu do PNG
 * - Klikací legenda umožňuje skrývat/zobrazovat jednotlivé čáry
 * - Zobrazí šedé pozadí pro období čekání na začátek dle priority
 */
import React, { useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useTranslation } from '@/lib/translation';

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
  /**
   * Začátek dle priority (vypočtený start podle priority projektů)
   */
  priorityStartDate: Date;
  /**
   * Skutečný start projektu (created_at)
   */
  createdAt: Date;
  /**
   * Název projektu, na který se čeká (blokuje start)
   */
  blockingProjectName?: string;
  /**
   * Zobrazit šedý background (jen pokud je blokován)
   */
  showBlockingBg: boolean;
}

export default function BurndownChart({ roles, totalData, slip, calculatedDeliveryDate, deliveryDate, priorityStartDate, createdAt, blockingProjectName, showBlockingBg }: BurndownChartProps) {
  const { t } = useTranslation();

  // --- Export ---
  const chartRef = useRef<HTMLDivElement>(null);
  const handleExport = async () => {
    if (!chartRef.current) return;
    const htmlToImage = await import('html-to-image');
    const dataUrl = await htmlToImage.toPng(chartRef.current, { backgroundColor: 'transparent' });
    const link = document.createElement('a');
    link.download = 'burndown-chart.png';
    link.href = dataUrl;
    link.click();
  };

  // --- Export CSV ---
  const handleExportCSV = () => {
    if (!totalData.length) return;
    // Sestav hlavičku CSV
    const allKeys = [
      'date',
      'total',
      ...roles.map(r => r.value),
      'ideal',
      'afterDelivery',
    ];
    const header = allKeys.map(k => {
      if (k === 'date') return t('date');
      if (k === 'total') return t('totalPercentDone');
      if (k === 'ideal') return t('idealProgress');
      if (k === 'afterDelivery') return t('slipAfterDelivery');
      const role = roles.find(r => r.value === k);
      return role ? `${role.label} % ${t('done')}` : k;
    });
    // Sestav řádky
    const rows = totalData.map(row =>
      allKeys.map(k => row[k] ?? '').join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'burndown-data.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // --- Toggling čar ---
  const [hiddenLines, setHiddenLines] = useState<string[]>([]);
  const toggleLine = (key: string) => {
    setHiddenLines(lines => lines.includes(key) ? lines.filter(l => l !== key) : [...lines, key]);
  };

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
  const refLabel = typeof slip === 'number' ? (slip < 0 ? t('slip') : t('reserve')) : '';

  // --- Vlastní legenda ---
  const legendItems = [
    { key: 'total', label: t('totalPercentDone'), color: '#111' },
    ...roles.map(r => ({ key: r.value, label: `${r.label} % ${t('done')}`, color: r.color })),
    { key: 'ideal', label: t('idealProgress'), color: '#888', dash: true },
    afterDeliveryLine.length > 1 ? { key: 'afterDelivery', label: t('slipAfterDelivery'), color: '#e11d48', dash: false } : null,
  ].filter(Boolean) as { key: string; label: string; color: string; dash?: boolean }[];

  // Najdi labely pro createdAt a priorityStartDate
  const createdAtLabel = `${createdAt.getDate()}.${createdAt.getMonth() + 1}.`;
  const priorityStartLabel = `${priorityStartDate.getDate()}.${priorityStartDate.getMonth() + 1}.`;

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={handleExport}
          className="px-3 py-1 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition text-sm"
          aria-label={t('exportPng')}
        >
          {t('exportPng')}
        </button>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1 rounded bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition text-sm"
          aria-label={t('exportCsv')}
        >
          {t('exportCsv')}
        </button>
        <div className="flex flex-wrap gap-2 text-sm select-none">
          {legendItems.map(item => (
            <span
              key={item.key}
              onClick={() => toggleLine(item.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer border ${hiddenLines.includes(item.key) ? 'opacity-40' : ''} transition`}
              style={{ borderColor: item.color }}
              aria-pressed={!hiddenLines.includes(item.key)}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleLine(item.key); }}
            >
              <span style={{ width: 16, height: 3, background: item.color, display: 'inline-block', borderRadius: 2, marginRight: 4, opacity: hiddenLines.includes(item.key) ? 0.3 : 1, borderBottom: item.dash ? '2px dashed #888' : undefined }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div ref={chartRef} style={{ maxWidth: '100%', overflowX: 'auto', padding: '8px 0' }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 24, right: 40, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={0} interval={0} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip />
            {/* Šedé pozadí pro období čekání na začátek dle priority */}
            {showBlockingBg && createdAtLabel !== priorityStartLabel && (
              <ReferenceArea
                x1={createdAtLabel}
                x2={priorityStartLabel}
                y1={0}
                y2={100}
                fill="#e5e7eb"
                fillOpacity={0.6}
                ifOverflow="extendDomain"
                label={{ value: blockingProjectName ? t('waitingForCompletion').replace('{name}', blockingProjectName) : t('waitingForStart'), position: 'insideTopLeft', fill: '#888', fontSize: 12 }}
              />
            )}
            {/* Čáry podle hiddenLines */}
            {!hiddenLines.includes('total') && (
              <Line
                type="monotone"
                dataKey="total"
                stroke="#111"
                name={t('totalPercentDone')}
                dot
                strokeWidth={2}
                isAnimationActive={false}
              />
            )}
            {roles.map(role => !hiddenLines.includes(role.value) && (
              <Line
                key={role.value}
                type="monotone"
                dataKey={role.value}
                stroke={role.color}
                name={`${role.label} % ${t('done')}`}
                dot
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
            {!hiddenLines.includes('ideal') && (
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="#888"
                name={t('idealProgress')}
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            {/* Červená čára po termínu dodání */}
            {afterDeliveryLine.length > 1 && !hiddenLines.includes('afterDelivery') && (
              <Line
                type="linear"
                dataKey="afterDelivery"
                stroke="#e11d48"
                name={t('slipAfterDelivery')}
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
                label={{ value: t('plannedDelivery'), position: 'top', fill: '#e11d48', fontWeight: 'bold', fontSize: 12 }}
                strokeDasharray="2 2"
              />
            )}
            {/* Svislá čára pro odhadovaný termín */}
            {refLineX && (
              <ReferenceLine
                x={refLineX}
                stroke={refColor}
                label={{ value: refLabel ? refLabel : t('estimatedDelivery'), position: 'top', fill: refColor, fontWeight: 'bold', fontSize: 12 }}
                strokeDasharray="3 3"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {typeof slip === 'number' && (
        <div className={slip < 0 ? 'text-red-600 font-bold mt-2' : 'text-green-600 font-bold mt-2'}>
          {slip < 0 ? t('slipLabel').replace('{days}', String(Math.abs(slip))) : t('reserveLabel').replace('{days}', String(slip))}
        </div>
      )}
    </div>
  );
} 