import { memo } from 'react';

import { fmtDate, fmtWhen, dayDiff, parseDT } from '../lib/date';
import { nextRound } from '../lib/derive';
import { OUTCOMES, STATUS_BY_ID, type Application } from '../types';

/** 下一场面试离得越近，卡片上的提示越“红”—— 和顶部待办区用同一套语义色 */
function urgencyTone(at: string): string {
  const d = parseDT(at);
  if (!d) return 'var(--st-interview)';
  const days = dayDiff(new Date(), d);
  if (days <= 1) return 'var(--critical)';
  if (days <= 7) return 'var(--warning)';
  return 'var(--st-interview)';
}

interface Props {
  app: Application;
  onOpen: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  dragging: boolean;
}

/** memo 生效的前提是上层传下来的回调引用稳定，见 App.tsx 里的 appsRef */
export const ApplicationCard = memo(function ApplicationCard({
  app,
  onOpen,
  onDragStart,
  onDragEnd,
  dragging,
}: Props) {
  const st = STATUS_BY_ID[app.status];
  const upcoming = nextRound(app);
  const settled = app.rounds.filter((r) => r.result !== 'pending').length;
  const outcome = OUTCOMES.find((o) => o.id === app.outcome);

  return (
    <div
      className={`card${dragging ? ' dragging' : ''}`}
      style={{ ['--tone' as string]: st.tone }}
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${app.company || '未命名'}，${st.label}`}
      onClick={() => onOpen(app.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(app.id);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', app.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(app.id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="card-top">
        <span className="card-company">{app.company || '未命名'}</span>
        {app.star && (
          <span className="card-star" title="重点关注">
            ★
          </span>
        )}
      </div>

      {app.role && <div className="card-role">{app.role}</div>}

      <div className="card-meta">
        {app.city && <span>◎ {app.city}</span>}
        {app.rounds.length > 0 && (
          <span>
            {settled}/{app.rounds.length} 轮已出结果
          </span>
        )}
        {app.appliedAt && <span>投 {fmtDate(app.appliedAt)}</span>}
      </div>

      {upcoming && (
        <div className="card-next" style={{ ['--nt' as string]: urgencyTone(upcoming.at) }}>
          <span className="g" aria-hidden="true">
            ▶
          </span>
          <span>
            {upcoming.name} · {fmtWhen(upcoming.at)}
          </span>
        </div>
      )}

      {app.status === 'closed' && outcome && (
        <div className="card-meta">
          <span>✕ {outcome.label}</span>
        </div>
      )}

      {app.tags.length > 0 && (
        <div className="card-tags">
          {app.tags.slice(0, 4).map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
