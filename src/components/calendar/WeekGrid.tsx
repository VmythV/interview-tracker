import { useEffect, useRef } from 'react';

import {
  EVENT_MINUTES,
  fmtHM,
  groupByDay,
  hourRange,
  layoutDay,
  minutesOfDay,
  sameDay,
  weekDays,
  type CalendarEvent,
} from '../../lib/calendar';
import { localISO } from '../../lib/date';
import { EventChip, eventTitle, eventTone } from './EventChip';

const HOUR_PX = 52;
const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];

interface Props {
  anchor: Date;
  events: CalendarEvent[];
  onOpen: (appId: string) => void;
}

/** 周视图 = 时间轴网格，一眼看出某天几点有面试。 */
export function WeekGrid({ anchor, events, onOpen }: Props) {
  const days = weekDays(anchor);
  const byDay = groupByDay(events);
  const dayLists = days.map((d) => byDay.get(localISO(d)) ?? []);
  const weekEvents = dayLists.flat();
  const [fromHour, toHour] = hourRange(weekEvents);
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const gridTop = fromHour * 60;

  const today = new Date();
  const scroller = useRef<HTMLDivElement | null>(null);

  // 打开时把「现在」滚到视野里，而不是从 0 点开始看
  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const target = ((minutesOfDay(today) - gridTop) / 60) * HOUR_PX - 120;
    node.scrollTop = Math.max(0, target);
    // 只在挂载时定位一次：之后用户自己滚到哪儿就停在哪儿
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allDayLists = dayLists.map((list) => list.filter((e) => e.allDay));
  const hasAllDay = allDayLists.some((l) => l.length > 0);

  return (
    <div className="cal-week">
      <div className="cal-week-head">
        <div className="cal-gutter-cell" />
        {days.map((d) => {
          const isToday = sameDay(d, today);
          return (
            <div key={d.getTime()} className={`cal-dayhead${isToday ? ' is-today' : ''}`}>
              <span className="wd">周{WEEKDAY[(d.getDay() + 6) % 7]}</span>
              <span className="dn">
                {d.getMonth() + 1}/{d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {hasAllDay && (
        <div className="cal-allday">
          <div className="cal-gutter-cell">全天</div>
          {allDayLists.map((list, i) => (
            <div key={days[i].getTime()} className="cal-allday-cell">
              {list.map((ev) => (
                <EventChip key={ev.key} ev={ev} onOpen={onOpen} />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="cal-week-body" ref={scroller}>
        <div className="cal-gutter">
          {hours.map((h) => (
            <div key={h} className="cal-hour-label" style={{ height: HOUR_PX }}>
              <span>{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          const positioned = layoutDay(dayLists[i]);
          return (
            <div
              key={d.getTime()}
              className={`cal-daycol${isToday ? ' is-today' : ''}`}
              style={{ height: hours.length * HOUR_PX }}
            >
              {hours.map((h) => (
                <div key={h} className="cal-hour-line" style={{ height: HOUR_PX }} />
              ))}

              {isToday && (
                <div
                  className="cal-now"
                  style={{ top: ((minutesOfDay(today) - gridTop) / 60) * HOUR_PX }}
                  aria-hidden="true"
                />
              )}

              {positioned.map(({ ev, column, columns }) => {
                const res = eventTone(ev);
                const top = ((minutesOfDay(ev.start) - gridTop) / 60) * HOUR_PX;
                return (
                  <button
                    key={ev.key}
                    type="button"
                    className="cal-event"
                    title={eventTitle(ev)}
                    style={{
                      ['--tone' as string]: res.tone,
                      top,
                      height: (EVENT_MINUTES / 60) * HOUR_PX - 4,
                      left: `calc(${(column / columns) * 100}% + 2px)`,
                      width: `calc(${100 / columns}% - 4px)`,
                    }}
                    onClick={() => onOpen(ev.appId)}
                  >
                    <span className="cal-event-time">
                      <span className="g" aria-hidden="true">
                        {res.glyph}
                      </span>
                      {fmtHM(ev.start)}
                    </span>
                    <span className="cal-event-co">{ev.company}</span>
                    <span className="cal-event-rd">{ev.roundName}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
