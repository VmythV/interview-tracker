import type { Application } from '../types';
import { ChartCard } from './charts/ChartCard';
import { FunnelChart, FunnelTable } from './charts/FunnelChart';
import { SourceCard } from './charts/SourceTable';
import { StatusChart, StatusTable } from './charts/StatusChart';
import { TrendChart, TrendTable } from './charts/TrendChart';

export function StatsView({ rows }: { rows: Application[] }) {
  return (
    <div className="stats-grid">
      <ChartCard
        title="各状态的公司数"
        subtitle="一家公司此刻停在哪一步"
        chart={<StatusChart rows={rows} />}
        table={<StatusTable rows={rows} />}
      />
      <ChartCard
        title="流程漏斗"
        subtitle="曾经走到过该阶段的公司数（各层严格包含下一层）"
        chart={<FunnelChart rows={rows} />}
        table={<FunnelTable rows={rows} />}
      />
      <ChartCard
        wide
        title="每周投递量"
        subtitle="按投递日期统计，最近 12 周"
        chart={<TrendChart rows={rows} />}
        table={<TrendTable rows={rows} />}
      />
      <SourceCard rows={rows} />
    </div>
  );
}
