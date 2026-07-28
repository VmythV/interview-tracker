import { fmtWhen } from '../lib/date';
import { attention, STALE_DAYS } from '../lib/derive';
import { STATUS_BY_ID, type Application } from '../types';

interface ChipProps {
  app: Application;
  when: string;
  tail: string;
  onOpen: (id: string) => void;
}

function Chip({ app, when, tail, onOpen }: ChipProps) {
  return (
    <button type="button" className="focus-chip" onClick={() => onOpen(app.id)}>
      <span className="dot" style={{ ['--tone' as string]: STATUS_BY_ID[app.status].tone }} />
      <b>{app.company || '未命名'}</b>
      <span className="sep">·</span>
      <span className="when">{when}</span>
      <span className="sep">·</span>
      <span>{tail}</span>
    </button>
  );
}

function Card({
  tone,
  icon,
  title,
  count,
  children,
}: {
  tone: string;
  icon: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="focus-card" style={{ ['--tone' as string]: tone }}>
      <div className="focus-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="focus-body">
        <div className="focus-title">
          {title} <span className="count">· {count} 家</span>
        </div>
        <div className="focus-items">{children}</div>
      </div>
    </div>
  );
}

/** 重点区：只在有内容时出现，按紧急程度从上往下排。 */
export function FocusBoard({
  applications,
  onOpen,
}: {
  applications: Application[];
  onOpen: (id: string) => void;
}) {
  const { soon, week, stale } = attention(applications);
  if (!soon.length && !week.length && !stale.length) return null;

  return (
    <section className="focus" aria-label="需要关注">
      {soon.length > 0 && (
        <Card tone="var(--critical)" icon="!" title="今明两天有面试" count={soon.length}>
          {soon.map(({ app, round }) => (
            <Chip
              key={app.id + round.id}
              app={app}
              when={fmtWhen(round.at)}
              tail={round.name}
              onOpen={onOpen}
            />
          ))}
        </Card>
      )}

      {week.length > 0 && (
        <Card tone="var(--warning)" icon="◷" title="未来 7 天的面试" count={week.length}>
          {week.map(({ app, round }) => (
            <Chip
              key={app.id + round.id}
              app={app}
              when={fmtWhen(round.at)}
              tail={round.name}
              onOpen={onOpen}
            />
          ))}
        </Card>
      )}

      {stale.length > 0 && (
        <Card
          tone="var(--st-wish)"
          icon="…"
          title={`超过 ${STALE_DAYS} 天没有进展，建议跟进`}
          count={stale.length}
        >
          {stale.slice(0, 12).map(({ app, idle }) => (
            <Chip
              key={app.id}
              app={app}
              when={`${idle} 天前`}
              tail={STATUS_BY_ID[app.status].label}
              onOpen={onOpen}
            />
          ))}
        </Card>
      )}
    </section>
  );
}
