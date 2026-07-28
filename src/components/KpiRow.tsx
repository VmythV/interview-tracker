import { kpis, pct } from '../lib/derive';
import type { Application } from '../types';

function Kpi({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: number;
  unit: string;
  sub: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      {/* 大号数字用比例字形，tabular-nums 只留给需要竖向对齐的列 */}
      <div className="kpi-value">
        {value}
        <span className="unit">{unit}</span>
      </div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

export function KpiRow({ rows, total }: { rows: Application[]; total: number }) {
  const k = kpis(rows, total);

  return (
    <section className="kpi-row" aria-label="关键指标">
      <Kpi
        label="在投进行中"
        value={k.live}
        unit="家"
        sub={`${k.total} 家里 ${Math.max(0, k.total - k.live)} 家已结束`}
      />
      <Kpi
        label="进入面试率"
        value={pct(k.interviewed, k.applied)}
        unit="%"
        sub={`${k.applied} 家投递中 ${k.interviewed} 家进了面试`}
      />
      <Kpi
        label="单轮通过率"
        value={pct(k.roundsPassed, k.roundsDone)}
        unit="%"
        sub={
          k.roundsDone
            ? `已出结果 ${k.roundsDone} 轮，过 ${k.roundsPassed} 轮`
            : '还没有出结果的轮次'
        }
      />
      <Kpi
        label="拿到 Offer"
        value={k.offers}
        unit="个"
        sub={k.thisWeek ? `本周新投 ${k.thisWeek} 家` : '本周还没有新投递'}
      />
    </section>
  );
}
