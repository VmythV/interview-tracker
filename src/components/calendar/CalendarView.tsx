import { useCallback, useMemo, useState } from 'react';

import { calendarEvents, rangeLabel, type CalendarEvent } from '../../lib/calendar';
import { localISO, mondayOfWeek } from '../../lib/date';
import { useStore } from '../../store/StoreContext';
import { useToast } from '../../store/ToastContext';
import type { Application } from '../../types';
import { MonthGrid, type ScrollTarget } from './MonthGrid';
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
  // 月视图是原生滚动容器：日历自己上报「现在看的是哪个月」，
  // 我们只在点按钮时告诉它滚到哪一周。
  const [monthFocus, setMonthFocus] = useState(() => new Date());
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget>(() => ({
    week: mondayOfWeek(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    smooth: false,
    nonce: 0,
  }));

  const scrollToMonth = useCallback((month: Date, smooth = true) => {
    setScrollTarget((t) => ({
      week: mondayOfWeek(new Date(month.getFullYear(), month.getMonth(), 1)),
      smooth,
      nonce: t.nonce + 1,
    }));
  }, []);
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

  /** ‹ › 按钮：周视图一次一周，月视图平滑滚到上/下一个月 */
  const stepPage = useCallback(
    (n: number) => {
      if (mode === 'week') setAnchor((d) => shiftWeek(d, n));
      else scrollToMonth(shiftMonth(monthFocus, n));
    },
    [mode, monthFocus, scrollToMonth],
  );

  const goToday = useCallback(() => {
    const now = new Date();
    setAnchor(now);
    scrollToMonth(now);
  }, [scrollToMonth]);

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
          {mode === 'week' ? rangeLabel(anchor, 'week') : rangeLabel(monthFocus, 'month')}
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
          events={events}
          onOpen={onOpen}
          onPickSlot={setQuickAt}
          scrollTarget={scrollTarget}
          focusMonth={monthFocus}
          onFocusMonth={setMonthFocus}
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
          {mode === 'month' ? '上下滚动可连续查看前后日期 · ' : ''}点空白格子可直接新增面试 · 日历只画已定时间的轮次
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
