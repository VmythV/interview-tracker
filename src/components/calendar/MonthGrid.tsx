import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { groupByDay, sameDay, weeksFrom, type CalendarEvent } from '../../lib/calendar';
import { addDays, localISO, mondayOfWeek } from '../../lib/date';
import { EventChip } from './EventChip';

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_CHIPS = 3;

/** 一次性铺出来的范围：今天往前 26 周、往后 52 周。
 *  找工作的跨度撑死一年，够用；再大也只是白渲染 DOM。 */
export const WEEKS_BACK = 26;
export const WEEKS_FORWARD = 52;

export interface ScrollTarget {
  /** 要滚到的那一周（取其周一） */
  week: Date;
  smooth: boolean;
  /** 连点两次「今天」也要能再滚一次，靠它触发 */
  nonce: number;
}

interface Props {
  events: CalendarEvent[];
  onOpen: (appId: string) => void;
  /** 点日期数字跳到那一天的周视图 —— 月视图看不出几点，周视图能 */
  onPickDay: (day: Date) => void;
  /** 点格子空白：新增面试，默认 10:00 */
  onPickSlot: (at: string) => void;
  /** 滚到哪一周（受控） */
  scrollTarget: ScrollTarget;
  /** 视口正中那一周所属的月，变了就往上报，用于标题和置灰 */
  onFocusMonth: (month: Date) => void;
  /** 当前焦点月，用于把非本月的日期置灰 */
  focusMonth: Date;
}

const WEEK_MS = 7 * 86_400_000;

/**
 * 月视图 = 一个原生纵向滚动容器，里面连续铺一年多的周。
 *
 * 不再自己拦 wheel 做「一格走一周」：交给浏览器原生滚动，惯性、平滑、
 * 滚动条、触屏拖动全都免费且符合直觉，滚到头还会自然把滚动传回页面 ——
 * 顺带解决了之前「指针停在网格上页面就滚不动」的问题。
 * 再配 scroll-snap 的 proximity，停下来时会轻轻吸附到周的边界上。
 */
export function MonthGrid({
  events,
  onOpen,
  onPickDay,
  onPickSlot,
  scrollTarget,
  onFocusMonth,
  focusMonth,
}: Props) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const head = useRef<HTMLDivElement | null>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const reported = useRef('');

  const rangeStart = useMemo(() => addDays(mondayOfWeek(new Date()), -WEEKS_BACK * 7), []);
  const totalWeeks = WEEKS_BACK + WEEKS_FORWARD;
  const weeks = useMemo(() => {
    const days = weeksFrom(rangeStart, totalWeeks);
    return Array.from({ length: totalWeeks }, (_, i) => days.slice(i * 7, i * 7 + 7));
  }, [rangeStart, totalWeeks]);

  const byDay = useMemo(() => groupByDay(events), [events]);
  const today = new Date();

  const weekIndexOf = useCallback(
    (week: Date) =>
      Math.max(
        0,
        Math.min(
          totalWeeks - 1,
          Math.round((mondayOfWeek(week).getTime() - rangeStart.getTime()) / WEEK_MS),
        ),
      ),
    [rangeStart, totalWeeks],
  );

  /** 视口正中那一周决定「现在看的是哪个月」 */
  const reportFocus = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    // 表头是 sticky 的，实际可见区从它下面才开始
    const headH = head.current?.offsetHeight ?? 0;
    const center = node.scrollTop + headH + (node.clientHeight - headH) / 2;
    let index = 0;
    for (let i = 0; i < rows.current.length; i++) {
      const row = rows.current[i];
      if (!row) continue;
      if (row.offsetTop > center) break;
      index = i;
    }
    // 取该周的周四：跨月的那一周归属哪个月，用 ISO 周的老规矩，不来回摇摆
    const thursday = weeks[index]?.[3];
    if (!thursday) return;
    const key = `${thursday.getFullYear()}-${thursday.getMonth()}`;
    if (key === reported.current) return;
    reported.current = key;
    onFocusMonth(thursday);
  }, [onFocusMonth, weeks]);

  // 滚动时用 rAF 节流地更新焦点月
  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        reportFocus();
      });
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [reportFocus]);

  // 受控滚动：外面点「今天」或 ‹ › 时滚过去
  useLayoutEffect(() => {
    const node = scroller.current;
    const row = rows.current[weekIndexOf(scrollTarget.week)];
    if (!node || !row) return;
    const headH = head.current?.offsetHeight ?? 0;
    node.scrollTo({
      top: Math.max(0, row.offsetTop - headH),
      behavior: scrollTarget.smooth ? 'smooth' : 'auto',
    });
    // 平滑滚动过程中 scroll 事件会陆续到达，焦点月自然跟着更新；
    // 瞬时滚动不一定触发事件，这里补一次
    if (!scrollTarget.smooth) reportFocus();
  }, [scrollTarget, weekIndexOf, reportFocus]);

  return (
    <div className="cal-month">
      <div className="cal-month-scroll" ref={scroller}>
        <div className="cal-month-head" ref={head}>
          {WEEKDAY.map((w) => (
            <div key={w}>周{w}</div>
          ))}
        </div>

        <div className="cal-month-body">
          {weeks.map((week, wi) => (
            <div
              key={week[0].getTime()}
              className="cal-week-row"
              ref={(el) => {
                rows.current[wi] = el;
              }}
            >
              {week.map((d) => {
                const list = byDay.get(localISO(d)) ?? [];
                const outside =
                  d.getMonth() !== focusMonth.getMonth() ||
                  d.getFullYear() !== focusMonth.getFullYear();
                const isToday = sameDay(d, today);
                const firstOfMonth = d.getDate() === 1;
                return (
                  <div
                    key={d.getTime()}
                    className={
                      `cal-cell${outside ? ' is-outside' : ''}` +
                      `${isToday ? ' is-today' : ''}${firstOfMonth ? ' is-month-start' : ''}`
                    }
                    onClick={(e) => {
                      const el = e.target as HTMLElement;
                      if (el.closest('.cal-chip') || el.closest('.cal-daynum') || el.closest('.cal-more')) {
                        return;
                      }
                      onPickSlot(`${localISO(d)}T10:00`);
                    }}
                  >
                    <button
                      type="button"
                      className="cal-daynum"
                      title="看这一天的周视图"
                      onClick={() => onPickDay(d)}
                    >
                      {firstOfMonth ? `${d.getMonth() + 1}月1日` : d.getDate()}
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
          ))}
        </div>
      </div>
    </div>
  );
}
