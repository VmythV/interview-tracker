import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  subtitle: string;
  wide?: boolean;
  chart: ReactNode;
  /** 表格孪生视图：图上的每个数字都必须能不靠悬停读到 */
  table: ReactNode;
}

export function ChartCard({ title, subtitle, wide, chart, table }: Props) {
  const [mode, setMode] = useState<'chart' | 'table'>('chart');

  return (
    <div className={`chart-card${wide ? ' wide' : ''}`}>
      <div className="chart-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="seg">
          <button
            type="button"
            className="seg-btn"
            aria-selected={mode === 'chart'}
            onClick={() => setMode('chart')}
          >
            图表
          </button>
          <button
            type="button"
            className="seg-btn"
            aria-selected={mode === 'table'}
            onClick={() => setMode('table')}
          >
            表格
          </button>
        </div>
      </div>
      <div className="chart-body">{mode === 'chart' ? chart : table}</div>
    </div>
  );
}

export function NoData() {
  return <p className="empty-note">当前筛选下没有数据</p>;
}
