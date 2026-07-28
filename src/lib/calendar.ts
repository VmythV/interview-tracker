/** 日历视图的派生计算：把面试轮次摊平成事件，再排成周/月网格。全部纯函数。 */

import type { Application, RoundModeId, RoundResultId, StatusId } from '../types';
import { localISO, mondayOfWeek, parseDT } from './date';

/** 一场面试 = 一条日历事件 */
export interface CalendarEvent {
  key: string;
  appId: string;
  roundId: string;
  company: string;
  roundName: string;
  start: Date;
  /** 只有日期没有钟点（多半来自旧数据导入），单独放到「全天」那一行 */
  allDay: boolean;
  result: RoundResultId;
  mode: RoundModeId;
  location: string;
  interviewer: string;
  status: StatusId;
}

/** 模型里没有时长，统一按 1 小时画块 */
export const EVENT_MINUTES = 60;

export function calendarEvents(apps: Application[]): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const app of apps) {
    for (const round of app.rounds) {
      const start = parseDT(round.at);
      if (!start) continue; // 没定时间的轮次不落在任何一天上
      out.push({
        key: `${app.id}:${round.id}`,
        appId: app.id,
        roundId: round.id,
        company: app.company || '未命名',
        roundName: round.name || '面试',
        start,
        allDay: round.at.length <= 10,
        result: round.result,
        mode: round.mode,
        location: round.location,
        interviewer: round.interviewer,
        status: app.status,
      });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** 按 'YYYY-MM-DD' 归档 */
export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = localISO(ev.start);
    const list = map.get(key);
    if (list) list.push(ev);
    else map.set(key, [ev]);
  }
  return map;
}

export const sameDay = (a: Date, b: Date) => localISO(a) === localISO(b);

/** 周一 … 周日 */
export function weekDays(anchor: Date): Date[] {
  const monday = mondayOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  );
}

/**
 * 月视图固定铺 6 周。
 *
 * 不按「这个月实际占几周」铺 5 或 6 行 —— 那样按周滚动时网格高度会忽高忽低，
 * 页面跟着跳，比翻页本身更难受。固定 6 行代价是某些月份多出一整周的邻月日期，
 * 换来滚动时布局纹丝不动。
 */
export const MONTH_WEEKS = 6;

/** 从某个周一开始连续铺 N 周 */
export function weeksFrom(mondayStart: Date, weeks = MONTH_WEEKS): Date[] {
  return Array.from({ length: weeks * 7 }, (_, i) =>
    new Date(mondayStart.getFullYear(), mondayStart.getMonth(), mondayStart.getDate() + i),
  );
}

/** 某个月默认对应的窗口起点：该月 1 号所在那周的周一 */
export function monthWindowStart(anchor: Date): Date {
  return mondayOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
}

/**
 * 窗口当前「属于」哪个月 —— 取正中那一周（第 4 行的周一）所在的月。
 * 标题和置灰都用它；按周滚动时它只在真正跨月时才变，不会一格一变。
 */
export function focusMonthOf(windowStart: Date, weeks = MONTH_WEEKS): Date {
  const middle = Math.floor(weeks / 2) * 7;
  return new Date(
    windowStart.getFullYear(),
    windowStart.getMonth(),
    windowStart.getDate() + middle,
  );
}

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

/**
 * 时间轴要显示的小时区间。默认 8:00–22:00，但一定要包住当周所有事件 ——
 * 早上 7 点的面试不能被裁掉。
 */
export function hourRange(events: CalendarEvent[]): [number, number] {
  let from = 8;
  let to = 22;
  for (const ev of events) {
    if (ev.allDay) continue;
    from = Math.min(from, ev.start.getHours());
    to = Math.max(to, ev.start.getHours() + Math.ceil(EVENT_MINUTES / 60) + 1);
  }
  return [Math.max(0, from), Math.min(24, Math.max(to, from + 4))];
}

/** 同一天里时间重叠的事件并排放，不互相盖住 */
export interface PositionedEvent {
  ev: CalendarEvent;
  column: number;
  columns: number;
}

export function layoutDay(events: CalendarEvent[]): PositionedEvent[] {
  const timed = events
    .filter((e) => !e.allDay)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const out: PositionedEvent[] = [];
  let cluster: CalendarEvent[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    // 贪心分列：每个事件放进第一个不冲突的列
    const lanes: number[] = []; // 每列当前的结束时间（分钟）
    const placed = cluster.map((ev) => {
      const start = minutesOfDay(ev.start);
      const end = start + EVENT_MINUTES;
      let lane = lanes.findIndex((busyUntil) => busyUntil <= start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(end);
      } else {
        lanes[lane] = end;
      }
      return { ev, column: lane };
    });
    for (const p of placed) out.push({ ...p, columns: lanes.length });
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of timed) {
    const start = minutesOfDay(ev.start);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, start + EVENT_MINUTES);
  }
  flush();
  return out;
}

export const fmtHM = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** 顶栏标题：周显示区间，月显示年月；跨年/跨月都写清楚 */
export function rangeLabel(anchor: Date, mode: 'week' | 'month'): string {
  if (mode === 'month') return `${anchor.getFullYear()} 年 ${anchor.getMonth() + 1} 月`;
  const days = weekDays(anchor);
  const a = days[0];
  const b = days[6];
  const head = `${a.getFullYear()} 年 ${a.getMonth() + 1} 月 ${a.getDate()} 日`;
  const tail =
    a.getFullYear() !== b.getFullYear()
      ? `${b.getFullYear()} 年 ${b.getMonth() + 1} 月 ${b.getDate()} 日`
      : a.getMonth() !== b.getMonth()
        ? `${b.getMonth() + 1} 月 ${b.getDate()} 日`
        : `${b.getDate()} 日`;
  return `${head} – ${tail}`;
}
