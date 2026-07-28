import { useMemo, useState } from 'react';

import { calendarEvents, rangeLabel, type CalendarEvent } from '../../lib/calendar';
import type { Application } from '../../types';
import { MonthGrid } from './MonthGrid';
import { WeekGrid } from './WeekGrid';

type Mode = 'week' | 'month';

const shiftWeek = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7);
const shiftMonth = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export function CalendarView({
  rows,
  onOpen,
}: {
  rows: Application[];
  onOpen: (appId: string) => void;
}) {
  const [mode, setMode] = useState<Mode>('week');
  const [anchor, setAnchor] = useState(() => new Date());

  const events: CalendarEvent[] = useMemo(() => calendarEvents(rows), [rows]);
  const undated = useMemo(
    () =>
      rows.flatMap((a) =>
        a.rounds
          .filter((r) => !r.at && r.result === 'pending')
          .map((r) => ({ appId: a.id, company: a.company || '未命名', name: r.name })),
      ),
    [rows],
  );

  const step = (n: number) =>
    setAnchor((d) => (mode === 'week' ? shiftWeek(d, n) : shiftMonth(d, n)));

  return (
    <div className="cal">
      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" className="btn btn-sm btn-icon" aria-label="上一个" onClick={() => step(-1)}>
            ‹
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setAnchor(new Date())}>
            今天
          </button>
          <button type="button" className="btn btn-sm btn-icon" aria-label="下一个" onClick={() => step(1)}>
            ›
          </button>
        </div>

        <h3 className="cal-title">{rangeLabel(anchor, mode)}</h3>

        <span className="filters-spacer" />

        <div className="seg">
          <button
            type="button"
            className="seg-btn"
            aria-selected={mode === 'week'}
            onClick={() => setMode('week')}
          >
            周
          </button>
          <button
            type="button"
            className="seg-btn"
            aria-selected={mode === 'month'}
            onClick={() => setMode('month')}
          >
            月
          </button>
        </div>
      </div>

      {mode === 'week' ? (
        <WeekGrid anchor={anchor} events={events} onOpen={onOpen} />
      ) : (
        <MonthGrid
          anchor={anchor}
          events={events}
          onOpen={onOpen}
          onPickDay={(d) => {
            setAnchor(d);
            setMode('week');
          }}
        />
      )}

      <div className="cal-legend">
        <span className="legend-item" style={{ ['--tone' as string]: 'var(--st-interview)' }}>
          <span className="legend-key" />◐ 待定
        </span>
        <span className="legend-item" style={{ ['--tone' as string]: 'var(--st-offer)' }}>
          <span className="legend-key" />✓ 通过
        </span>
        <span className="legend-item" style={{ ['--tone' as string]: 'var(--st-closed)' }}>
          <span className="legend-key" />✕ 未通过
        </span>
        <span className="cal-legend-note">日历只画已经定了时间的轮次</span>
      </div>

      {undated.length > 0 && (
        <div className="cal-undated">
          <div className="sec-title">还没定时间的轮次（{undated.length}）</div>
          <div className="focus-items">
            {undated.map((u, i) => (
              <button
                key={`${u.appId}-${i}`}
                type="button"
                className="focus-chip"
                onClick={() => onOpen(u.appId)}
              >
                <b>{u.company}</b>
                <span className="sep">·</span>
                <span>{u.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
