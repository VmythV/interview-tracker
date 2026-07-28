import { describe, expect, it } from 'vitest';

import {
  calendarEvents,
  groupByDay,
  hourRange,
  layoutDay,
  minutesOfDay,
  monthDays,
  rangeLabel,
  sameDay,
  weekDays,
  type CalendarEvent,
} from './calendar';
import { localISO } from './date';
import { makeApp, makeRound } from './testFactory';

describe('calendarEvents', () => {
  it('把每条投递的轮次摊平成事件', () => {
    const rows = [
      makeApp({
        company: '星野科技',
        rounds: [makeRound({ name: '一面', at: '2026-07-28T10:00' }), makeRound({ name: '二面', at: '2026-07-30T14:00' })],
      }),
    ];
    const events = calendarEvents(rows);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ company: '星野科技', roundName: '一面' });
  });

  it('跳过没定时间的轮次 —— 它们不落在任何一天上', () => {
    const rows = [makeApp({ rounds: [makeRound({ at: '' }), makeRound({ at: '2026-07-28T10:00' })] })];
    expect(calendarEvents(rows)).toHaveLength(1);
  });

  it('按开始时间升序', () => {
    const rows = [
      makeApp({ rounds: [makeRound({ name: '晚', at: '2026-07-28T18:00' })] }),
      makeApp({ rounds: [makeRound({ name: '早', at: '2026-07-28T09:00' })] }),
    ];
    expect(calendarEvents(rows).map((e) => e.roundName)).toEqual(['早', '晚']);
  });

  it('只有日期没有钟点的算全天', () => {
    const rows = [makeApp({ rounds: [makeRound({ at: '2026-07-28' })] })];
    expect(calendarEvents(rows)[0].allDay).toBe(true);
  });

  it('公司名为空时兜底为「未命名」', () => {
    const rows = [makeApp({ company: '', rounds: [makeRound({ at: '2026-07-28T10:00' })] })];
    expect(calendarEvents(rows)[0].company).toBe('未命名');
  });
});

describe('groupByDay', () => {
  it('按本地日期归档', () => {
    const rows = [
      makeApp({ rounds: [makeRound({ at: '2026-07-28T10:00' }), makeRound({ at: '2026-07-28T16:00' })] }),
      makeApp({ rounds: [makeRound({ at: '2026-07-29T10:00' })] }),
    ];
    const map = groupByDay(calendarEvents(rows));
    expect(map.get('2026-07-28')).toHaveLength(2);
    expect(map.get('2026-07-29')).toHaveLength(1);
  });
});

describe('weekDays / monthDays', () => {
  it('周视图永远是周一到周日 7 天', () => {
    const days = weekDays(new Date(2026, 6, 30)); // 周四
    expect(days).toHaveLength(7);
    expect(localISO(days[0])).toBe('2026-07-27');
    expect(localISO(days[6])).toBe('2026-08-02');
  });

  it('月视图从该月第一周的周一开始，天数是 7 的整数倍', () => {
    const days = monthDays(new Date(2026, 6, 15));
    expect(days.length % 7).toBe(0);
    expect(days[0].getDay()).toBe(1);
    expect(days.some((d) => d.getMonth() === 6 && d.getDate() === 1)).toBe(true);
    expect(days.some((d) => d.getMonth() === 6 && d.getDate() === 31)).toBe(true);
  });

  it('不硬撑 6 行 —— 刚好铺满 5 周就只给 5 周', () => {
    // 2026-02 有 28 天且 1 号是周日 → 需要 5 周
    const feb = monthDays(new Date(2026, 1, 10));
    expect(feb.length).toBeLessThanOrEqual(42);
    expect(feb.length % 7).toBe(0);
  });

  it('sameDay 忽略时分秒', () => {
    expect(sameDay(new Date(2026, 6, 28, 1), new Date(2026, 6, 28, 23))).toBe(true);
    expect(sameDay(new Date(2026, 6, 28), new Date(2026, 6, 29))).toBe(false);
  });
});

describe('hourRange', () => {
  const ev = (at: string): CalendarEvent =>
    calendarEvents([makeApp({ rounds: [makeRound({ at })] })])[0];

  it('没有事件时用默认的 8:00–22:00', () => {
    expect(hourRange([])).toEqual([8, 22]);
  });

  it('早于 8 点的事件要把上边界撑开，不能被裁掉', () => {
    const [from] = hourRange([ev('2026-07-28T07:00')]);
    expect(from).toBe(7);
  });

  it('深夜事件把下边界撑开且不超过 24', () => {
    const [, to] = hourRange([ev('2026-07-28T23:30')]);
    expect(to).toBe(24);
  });

  it('全天事件不影响时间轴范围', () => {
    expect(hourRange([ev('2026-07-28')])).toEqual([8, 22]);
  });
});

describe('layoutDay（重叠分列）', () => {
  const evAt = (at: string, name: string) =>
    calendarEvents([makeApp({ rounds: [makeRound({ name, at })] })])[0];

  it('不重叠的事件各占满整列', () => {
    const events = [evAt('2026-07-28T09:00', 'a'), evAt('2026-07-28T14:00', 'b')];
    expect(layoutDay(events).map((p) => p.columns)).toEqual([1, 1]);
  });

  it('三场重叠分成三列，列号互不相同', () => {
    const events = [
      evAt('2026-07-28T10:00', 'a'),
      evAt('2026-07-28T10:15', 'b'),
      evAt('2026-07-28T10:30', 'c'),
    ];
    const placed = layoutDay(events);
    expect(placed.every((p) => p.columns === 3)).toBe(true);
    expect(new Set(placed.map((p) => p.column)).size).toBe(3);
  });

  it('前一场结束后开始的事件可以复用第 0 列', () => {
    const events = [
      evAt('2026-07-28T10:00', 'a'),
      evAt('2026-07-28T10:30', 'b'),
      evAt('2026-07-28T11:30', 'c'), // 与前两场都不重叠
    ];
    const placed = layoutDay(events);
    const c = placed.find((p) => p.ev.roundName === 'c')!;
    expect(c.column).toBe(0);
    expect(c.columns).toBe(1);
  });

  it('全天事件不参与时间轴排布', () => {
    expect(layoutDay([evAt('2026-07-28', 'allday')])).toHaveLength(0);
  });

  it('空输入返回空数组', () => {
    expect(layoutDay([])).toEqual([]);
  });
});

describe('rangeLabel', () => {
  it('月视图给年月', () => {
    expect(rangeLabel(new Date(2026, 6, 15), 'month')).toBe('2026 年 7 月');
  });

  it('同月的周只在末尾写日', () => {
    expect(rangeLabel(new Date(2026, 6, 8), 'week')).toBe('2026 年 7 月 6 日 – 12 日');
  });

  it('跨月的周把月份写全', () => {
    expect(rangeLabel(new Date(2026, 6, 28), 'week')).toBe('2026 年 7 月 27 日 – 8 月 2 日');
  });

  it('跨年的周把年份写全', () => {
    expect(rangeLabel(new Date(2026, 11, 30), 'week')).toBe('2026 年 12 月 28 日 – 2027 年 1 月 3 日');
  });
});

describe('minutesOfDay', () => {
  it('换算成当天第几分钟', () => {
    expect(minutesOfDay(new Date(2026, 6, 28, 0, 0))).toBe(0);
    expect(minutesOfDay(new Date(2026, 6, 28, 14, 30))).toBe(870);
  });
});
