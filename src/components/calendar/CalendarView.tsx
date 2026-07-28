import { useCallback, useMemo, useState } from 'react';

import {
  calendarEvents,
  focusMonthOf,
  monthWindowStart,
  rangeLabel,
  type CalendarEvent,
} from '../../lib/calendar';
import { addDays, localISO } from '../../lib/date';
import { useStore } from '../../store/StoreContext';
import { useToast } from '../../store/ToastContext';
import type { Application } from '../../types';
import { MonthGrid } from './MonthGrid';
import { QuickAddRound } from './QuickAddRound';
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
  const { dispatch } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  // 月视图单独记窗口起点（某个周一）：滚轮按周挪动它，与周视图的 anchor 互不干扰
  const [monthStart, setMonthStart] = useState(() => monthWindowStart(new Date()));
  /** 非 null 时弹出「新增一场面试」，值是预填的时间 */
  const [quickAt, setQuickAt] = useState<string | null>(null);

  // 从工具栏点「＋ 新增面试」时，默认约到下一个整点
  const nextHourSlot = () => {
    const d = new Date(Date.now() + 3600_000);
    return `${localISO(d)}T${String(d.getHours()).padStart(2, '0')}:00`;
  };

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

  /** ‹ › 按钮：粗粒度翻页，周视图一次一周、月视图一次一月 */
  const stepPage = useCallback(
    (n: number) => {
      if (mode === 'week') setAnchor((d) => shiftWeek(d, n));
      else setMonthStart((s) => monthWindowStart(shiftMonth(focusMonthOf(s), n)));
    },
    [mode],
  );

  /** 滚轮：细粒度，一步一周 */
  const stepWeek = useCallback((n: number) => setMonthStart((s) => addDays(s, n * 7)), []);

  const goToday = useCallback(() => {
    const now = new Date();
    setAnchor(now);
    setMonthStart(monthWindowStart(now));
  }, []);

  return (
    <div className="cal">
      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" className="btn btn-sm btn-icon" aria-label="上一个" onClick={() => stepPage(-1)}>
            ‹
          </button>
          <button type="button" className="btn btn-sm" onClick={goToday}>
            今天
          </button>
          <button type="button" className="btn btn-sm btn-icon" aria-label="下一个" onClick={() => stepPage(1)}>
            ›
          </button>
        </div>

        <h3 className="cal-title">
          {mode === 'week' ? rangeLabel(anchor, 'week') : rangeLabel(focusMonthOf(monthStart), 'month')}
        </h3>

        <span className="filters-spacer" />

        <button type="button" className="btn btn-sm" onClick={() => setQuickAt(nextHourSlot())}>
          ＋ 新增面试
        </button>

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
        <WeekGrid anchor={anchor} events={events} onOpen={onOpen} onPickSlot={setQuickAt} />
      ) : (
        <MonthGrid
          windowStart={monthStart}
          events={events}
          onOpen={onOpen}
          onPickSlot={setQuickAt}
          onStep={stepWeek}
          onPickDay={(d) => {
            setAnchor(d);
            setMode('week');
          }}
        />
      )}

      {quickAt && (
        <QuickAddRound
          at={quickAt}
          applications={rows}
          onClose={() => setQuickAt(null)}
          onSave={(next) => {
            dispatch({ type: 'upsert', app: next });
            setQuickAt(null);
            toast.push(`已给「${next.company || '未命名'}」加上一轮面试`);
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
        <span className="cal-legend-note">
          {mode === 'month' ? '滚轮上下滚动，一次一周 · ' : ''}点空白格子可直接新增面试 · 日历只画已定时间的轮次
        </span>
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
