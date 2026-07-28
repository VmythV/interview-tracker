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
}

export function MonthGrid({ anchor, events, onOpen, onPickDay }: Props) {
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

      <div className="cal-month-grid">
        {days.map((d) => {
          const list = byDay.get(localISO(d)) ?? [];
          const outside = d.getMonth() !== month;
          const isToday = sameDay(d, today);
          return (
            <div
              key={d.getTime()}
              className={`cal-cell${outside ? ' is-outside' : ''}${isToday ? ' is-today' : ''}`}
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
