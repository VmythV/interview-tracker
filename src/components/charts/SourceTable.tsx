import { bySource, pct } from '../../lib/derive';
import type { Application } from '../../types';
import { NoData } from './ChartCard';

/** 渠道类别多且每一类都带含义 —— 这种情况的正确答案是表格，不是更多颜色。 */
export function SourceCard({ rows }: { rows: Application[] }) {
  const list = bySource(rows);

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <h3>各渠道效果</h3>
          <p>渠道类别多且都带含义，这里用表格而不是更多颜色</p>
        </div>
      </div>
      <div className="chart-body">
        {list.length === 0 ? (
          <NoData />
        ) : (
          <table className="mini-tbl">
            <thead>
              <tr>
                <th>渠道</th>
                <th className="r">投递</th>
                <th className="r">进面试</th>
                <th className="r">Offer</th>
                <th className="r">进面率</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.source}>
                  <td>{r.source}</td>
                  <td className="r">{r.n}</td>
                  <td className="r">{r.interviewed}</td>
                  <td className="r">{r.offers}</td>
                  <td className="r">{pct(r.interviewed, r.n)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
