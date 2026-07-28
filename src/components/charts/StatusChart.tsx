import { pct } from '../../lib/derive';
import { STATUS, type Application } from '../../types';
import { NoData } from './ChartCard';
import { useTipHandlers } from './TooltipContext';

function useCounts(rows: Application[]) {
  return STATUS.map((st) => ({ st, n: rows.filter((a) => a.status === st.id).length }));
}

function Row({
  glyph,
  label,
  tone,
  n,
  max,
  total,
}: {
  glyph: string;
  label: string;
  tone: string;
  n: number;
  max: number;
  total: number;
}) {
  // 整行都是命中区，不用去瞄那根 20px 的条
  const tip = useTipHandlers({
    title: label,
    rows: [
      { tone, name: '公司数', value: `${n} 家` },
      { tone, name: '占比', value: `${pct(n, total)}%` },
    ],
  });

  return (
    <div className="bar-row" style={{ ['--tone' as string]: tone }} tabIndex={0} {...tip}>
      <span className="bar-label">
        <span className="glyph" aria-hidden="true">
          {glyph}
        </span>
        <span>{label}</span>
      </span>
      <div className="bar-track">
        {/* 4px 圆角数据端、基线端方角；0 不画条，免得留一截误导人的残根 */}
        {n > 0 && <div className="bar-fill" style={{ width: `${(n / max) * 100}%` }} />}
      </div>
      <span className="bar-val">{n}</span>
    </div>
  );
}

export function StatusChart({ rows }: { rows: Application[] }) {
  const counts = useCounts(rows);
  if (rows.length === 0) return <NoData />;
  const max = Math.max(1, ...counts.map((c) => c.n));

  return (
    <div className="bars">
      {counts.map(({ st, n }) => (
        <Row
          key={st.id}
          glyph={st.glyph}
          label={st.label}
          tone={st.tone}
          n={n}
          max={max}
          total={rows.length}
        />
      ))}
    </div>
  );
}

export function StatusTable({ rows }: { rows: Application[] }) {
  const counts = useCounts(rows);
  const total = rows.length || 1;

  return (
    <table className="mini-tbl">
      <thead>
        <tr>
          <th>状态</th>
          <th className="r">公司数</th>
          <th className="r">占比</th>
        </tr>
      </thead>
      <tbody>
        {counts.map(({ st, n }) => (
          <tr key={st.id}>
            <td>
              <span className="name" style={{ ['--tone' as string]: st.tone }}>
                <span className="dot" />
                <span>
                  {st.glyph} {st.label}
                </span>
              </span>
            </td>
            <td className="r">{n}</td>
            <td className="r">{pct(n, total)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
