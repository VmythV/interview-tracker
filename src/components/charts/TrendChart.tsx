import { useState } from 'react';

import { useElementWidth } from '../../hooks/useElementWidth';
import { addDays, localISO } from '../../lib/date';
import { weeklyApplied, type WeekBucket } from '../../lib/derive';
import type { Application } from '../../types';
import { useTooltip } from './TooltipContext';

const H = 210;
const PAD = { top: 14, right: 16, bottom: 26, left: 34 };
const SERIES_TONE = 'var(--st-interview)';

const rangeLabel = (b: WeekBucket) => {
  const end = addDays(b.start, 6);
  return `${b.start.getMonth() + 1}月${b.start.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`;
};

/** 单序列面积 + 折线。十字准星找 X，读者瞄的是日期而不是那条 2px 的线。 */
export function TrendChart({ rows }: { rows: Application[] }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const tip = useTooltip();

  const buckets = weeklyApplied(rows);
  const peak = Math.max(1, ...buckets.map((b) => b.n));
  const top = Math.max(1, Math.ceil(peak / 2) * 2); // y 轴刻度取整
  const W = Math.max(360, width);

  const span = W - PAD.left - PAD.right;
  const x = (i: number) => PAD.left + (buckets.length === 1 ? 0 : (i * span) / (buckets.length - 1));
  const y = (v: number) => PAD.top + (1 - v / top) * (H - PAD.top - PAD.bottom);

  const line = buckets.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(b.n).toFixed(1)}`).join(' ');
  const area = `${line} L${x(buckets.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, top / 2, top];
  const last = buckets[buckets.length - 1];

  function locate(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const step = span / Math.max(1, buckets.length - 1);
    const i = Math.max(0, Math.min(buckets.length - 1, Math.round((px - PAD.left) / step)));
    setHover(i);
    tip.show(
      {
        title: rangeLabel(buckets[i]),
        rows: [{ tone: SERIES_TONE, name: '投递', value: `${buckets[i].n} 家` }],
      },
      e,
    );
    tip.move(e);
  }

  return (
    <div ref={ref}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`每周投递量趋势，最近 ${buckets.length} 周`}
        onPointerMove={locate}
        onPointerLeave={() => {
          setHover(null);
          tip.hide();
        }}
      >
        {ticks.map((t) => (
          <line
            key={`g${t}`}
            className={t === 0 ? 'baseline' : 'gridline'}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
          />
        ))}
        {ticks.map((t) => (
          <text key={`t${t}`} className="tick" x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end">
            {t}
          </text>
        ))}

        <path d={area} fill={SERIES_TONE} fillOpacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke={SERIES_TONE}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hover != null && (
          <>
            <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} />
            {/* 2px 表面色描边，压在线上也看得清 */}
            <circle
              cx={x(hover)}
              cy={y(buckets[hover].n)}
              r={4.5}
              fill={SERIES_TONE}
              stroke="var(--surface-1)"
              strokeWidth={2}
            />
          </>
        )}

        {/* 只标末点 —— 直接标注要克制，每个点都写数字就没人看了 */}
        <circle
          cx={x(buckets.length - 1)}
          cy={y(last.n)}
          r={4.5}
          fill={SERIES_TONE}
          stroke="var(--surface-1)"
          strokeWidth={2}
        />
        <text className="dlabel" x={x(buckets.length - 1)} y={y(last.n) - 11} textAnchor="end">
          本周 {last.n}
        </text>

        {buckets.map((b, i) =>
          i % 2 === 0 || i === buckets.length - 1 ? (
            <text key={b.label} className="tick" x={x(i)} y={H - PAD.bottom + 15} textAnchor="middle">
              {b.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function TrendTable({ rows }: { rows: Application[] }) {
  return (
    <table className="mini-tbl">
      <thead>
        <tr>
          <th>周（起始）</th>
          <th className="r">投递数</th>
        </tr>
      </thead>
      <tbody>
        {weeklyApplied(rows).map((b) => (
          <tr key={b.start.getTime()}>
            <td>{localISO(b.start)}</td>
            <td className="r">{b.n}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
