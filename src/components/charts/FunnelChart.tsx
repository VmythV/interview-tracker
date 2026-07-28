import { funnel, pct, type FunnelStage } from '../../lib/derive';
import type { Application } from '../../types';
import { NoData } from './ChartCard';
import { useTipHandlers } from './TooltipContext';

function Stage({ stage, base }: { stage: FunnelStage; base: number }) {
  const tip = useTipHandlers({
    title: stage.name,
    rows: [
      { tone: stage.tone, name: '公司数', value: `${stage.n} 家` },
      { tone: stage.tone, name: '占已投递', value: `${pct(stage.n, base)}%` },
    ],
  });

  return (
    <div className="funnel-stage" style={{ ['--tone' as string]: stage.tone }} tabIndex={0} {...tip}>
      <div className="funnel-top">
        <span className="funnel-name">{stage.name}</span>
        <span className="funnel-n">
          {stage.n}
          <span className="of">
            {' '}
            / {base} · {pct(stage.n, base)}%
          </span>
        </span>
      </div>
      {stage.n > 0 && (
        <div
          className="funnel-bar"
          style={{ width: `${Math.max(0.6, (stage.n / base) * 100)}%` }}
        />
      )}
    </div>
  );
}

export function FunnelChart({ rows }: { rows: Application[] }) {
  const stages = funnel(rows);
  if (rows.length === 0) return <NoData />;
  const base = Math.max(1, stages[0].n);

  return (
    <div className="funnel">
      {stages.map((stage, i) => (
        <div key={stage.name}>
          <Stage stage={stage} base={base} />
          {i < stages.length - 1 && (
            <div className="funnel-drop">
              <span className="arrow" aria-hidden="true">
                ↓
              </span>
              <span>
                转化 {pct(stages[i + 1].n, stage.n)}%　流失 {stage.n - stages[i + 1].n} 家
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FunnelTable({ rows }: { rows: Application[] }) {
  const stages = funnel(rows);
  const base = Math.max(1, stages[0].n);

  return (
    <table className="mini-tbl">
      <thead>
        <tr>
          <th>阶段</th>
          <th className="r">公司数</th>
          <th className="r">占已投递</th>
          <th className="r">上一步转化</th>
        </tr>
      </thead>
      <tbody>
        {stages.map((s, i) => (
          <tr key={s.name}>
            <td>
              <span className="name" style={{ ['--tone' as string]: s.tone }}>
                <span className="dot" />
                <span>{s.name}</span>
              </span>
            </td>
            <td className="r">{s.n}</td>
            <td className="r">{pct(s.n, base)}%</td>
            <td className="r">
              {i === 0 || stages[i - 1].n === 0 ? '—' : `${pct(s.n, stages[i - 1].n)}%`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
