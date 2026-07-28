import { fmtWhen, localISO } from '../lib/date';
import { nextRound } from '../lib/derive';
import { OUTCOMES, type Application } from '../types';
import { StatusPill } from './StatusPill';

const HEAD = ['公司', '岗位', '城市', '状态', '轮次', '下一场', '投递日', '更新'];

export function ListView({
  rows,
  onOpen,
}: {
  rows: Application[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {HEAD.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((app) => {
            const upcoming = nextRound(app);
            const settled = app.rounds.filter((r) => r.result !== 'pending').length;
            const outcome = OUTCOMES.find((o) => o.id === app.outcome);
            return (
              <tr
                key={app.id}
                tabIndex={0}
                onClick={() => onOpen(app.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(app.id);
                }}
              >
                <td>
                  <span className="co">{app.company || '未命名'}</span>
                  {app.star && ' ★'}
                </td>
                <td>{app.role || <span className="sub">—</span>}</td>
                <td>{app.city || <span className="sub">—</span>}</td>
                <td>
                  <StatusPill status={app.status} />
                  {app.status === 'closed' && outcome && (
                    <div className="sub">{outcome.label}</div>
                  )}
                </td>
                <td className="num">
                  {app.rounds.length ? `${settled}/${app.rounds.length}` : '—'}
                </td>
                <td className="num">
                  {upcoming ? `${upcoming.name} ${fmtWhen(upcoming.at)}` : '—'}
                </td>
                <td className="num">{app.appliedAt || '—'}</td>
                <td className="num">{fmtWhen(localISO(app.updatedAt))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
