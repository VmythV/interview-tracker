import { useRef } from 'react';

import { useWheelPager } from '../../hooks/useWheelPager';
import { groupByDay, monthDays, sameDay, type CalendarEvent } from '../../lib/calendar';
import { localISO } from '../../lib/date';
import { EventChip } from './EventChip';

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_CHIPS = 3;

interface Props {
  anchor: Date;
  events: CalendarEvent[];
  onOpen: (appId: string) => void;
  /** 点日期数字跳到那一天的周视图 —— 月视图看不出几点，周视图能 */
  onPickDay: (day: Date) => void;
  /** 点格子空白：新增面试，默认 10:00 */
  onPickSlot: (at: string) => void;
  /** 滚轮上下翻月 */
  onStep: (direction: 1 | -1) => void;
}

export function MonthGrid({ anchor, events, onOpen, onPickDay, onPickSlot, onStep }: Props) {
  // 只把日期网格交给滚轮翻月；工具栏、图例那些区域仍然正常滚页面
  const grid = useRef<HTMLDivElement | null>(null);
  useWheelPager(grid, onStep);

  const days = monthDays(anchor);
  const byDay = groupByDay(events);
  const today = new Date();
  const month = anchor.getMonth();

  return (
    <div className="cal-month">
      <div className="cal-month-head">
        {WEEKDAY.map((w) => (
          <div key={w}>周{w}</div>
        ))}
      </div>

      <div className="cal-month-grid" ref={grid}>
        {days.map((d) => {
          const list = byDay.get(localISO(d)) ?? [];
          const outside = d.getMonth() !== month;
          const isToday = sameDay(d, today);
          return (
            <div
              key={d.getTime()}
              className={`cal-cell${outside ? ' is-outside' : ''}${isToday ? ' is-today' : ''}`}
              onClick={(e) => {
                const el = e.target as HTMLElement;
                if (el.closest('.cal-chip') || el.closest('.cal-daynum') || el.closest('.cal-more')) return;
                onPickSlot(`${localISO(d)}T10:00`);
              }}
            >
              <button
                type="button"
                className="cal-daynum"
                title="看这一天的周视图"
                onClick={() => onPickDay(d)}
              >
                {d.getDate() === 1 ? `${d.getMonth() + 1}月${d.getDate()}日` : d.getDate()}
              </button>

              <div className="cal-cell-items">
                {list.slice(0, MAX_CHIPS).map((ev) => (
                  <EventChip key={ev.key} ev={ev} onOpen={onOpen} />
                ))}
                {list.length > MAX_CHIPS && (
                  <button type="button" className="cal-more" onClick={() => onPickDay(d)}>
                    还有 {list.length - MAX_CHIPS} 场
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
