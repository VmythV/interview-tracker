/** 纯派生计算：筛选、排序、待办、KPI、漏斗、趋势、渠道。全部无副作用。 */

import {
  LIVE_STATUSES,
  type Application,
  type Filters,
  type Round,
  type StatusId,
} from '../types';
import { addDays, dayDiff, daysAgo, mondayOfWeek, parseDT } from './date';

/* ── 单条记录的判断 ─────────────────────────────────────── */

export const isLive = (a: Application) => LIVE_STATUSES.includes(a.status);

/** 下一场还没出结果的面试（已经过去超过 6 小时的不再算“下一场”） */
export function nextRound(a: Application): Round | null {
  const floor = Date.now() - 6 * 3600_000;
  const upcoming = a.rounds
    .filter((r) => {
      if (r.result !== 'pending') return false;
      const d = parseDT(r.at);
      return d != null && d.getTime() >= floor;
    })
    .sort((x, y) => parseDT(x.at)!.getTime() - parseDT(y.at)!.getTime());
  return upcoming[0] ?? null;
}

const reachedAny = (a: Application, ids: StatusId[]) => ids.some((s) => a.reached.includes(s));

/** 漏斗的四层，逐层严格包含下一层 */
export const reachedApplied = (a: Application) =>
  a.status !== 'wish' || a.reached.some((s) => s !== 'wish');
export const reachedInterview = (a: Application) =>
  reachedAny(a, ['interview', 'final', 'offer']) || a.rounds.length > 0;
export const reachedFinal = (a: Application) => reachedAny(a, ['final', 'offer']);
export const reachedOffer = (a: Application) => a.reached.includes('offer');

/* ── 筛选与排序 ─────────────────────────────────────────── */

export function applyFilters(all: Application[], f: Filters): Application[] {
  const q = f.q.trim().toLowerCase();
  const limit = f.range === 'all' ? null : Number(f.range);

  const kept = all.filter((a) => {
    if (f.status !== 'all' && a.status !== f.status) return false;
    if (f.city !== 'all' && cityOf(a) !== f.city) return false;
    if (limit != null) {
      const d = daysAgo(a.appliedAt);
      if (d == null || d > limit || d < 0) return false;
    }
    if (q) {
      const hay = [a.company, a.role, a.city, a.source, a.note, a.tags.join(' ')]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return kept.sort((a, b) => compare(a, b, f.sort));
}

export const cityOf = (a: Application) => a.city.trim() || '未填';

function compare(a: Application, b: Application, sort: Filters['sort']): number {
  switch (sort) {
    case 'applied':
      return b.appliedAt.localeCompare(a.appliedAt);
    case 'company':
      return a.company.localeCompare(b.company, 'zh-Hans-CN');
    case 'next': {
      const x = nextRound(a);
      const y = nextRound(b);
      if (x && y) return parseDT(x.at)!.getTime() - parseDT(y.at)!.getTime();
      if (x) return -1;
      if (y) return 1;
      return b.updatedAt - a.updatedAt;
    }
    default:
      return b.updatedAt - a.updatedAt;
  }
}

/** 记录里出现过的城市，用于筛选下拉 */
export function cityOptions(all: Application[]): string[] {
  return [...new Set(all.map(cityOf))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

/* ── 待办（重点区）───────────────────────────────────────── */

export interface UpcomingItem { app: Application; round: Round; days: number }
export interface StaleItem { app: Application; idle: number }

export interface Attention {
  soon: UpcomingItem[];   // 今明两天
  week: UpcomingItem[];   // 未来 7 天
  stale: StaleItem[];     // 久无进展
}

export const STALE_DAYS = 10;

export function attention(all: Application[]): Attention {
  const soon: UpcomingItem[] = [];
  const week: UpcomingItem[] = [];
  const stale: StaleItem[] = [];
  const now = new Date();

  for (const app of all) {
    if (!isLive(app)) continue;
    const round = nextRound(app);
    if (round) {
      const days = dayDiff(now, parseDT(round.at)!);
      if (days <= 1) soon.push({ app, round, days });
      else if (days <= 7) week.push({ app, round, days });
    } else if (['applied', 'assess', 'interview', 'final'].includes(app.status)) {
      const idle = Math.floor((Date.now() - app.updatedAt) / 86_400_000);
      if (idle >= STALE_DAYS) stale.push({ app, idle });
    }
  }

  const byTime = (x: UpcomingItem, y: UpcomingItem) =>
    parseDT(x.round.at)!.getTime() - parseDT(y.round.at)!.getTime();
  soon.sort(byTime);
  week.sort(byTime);
  stale.sort((x, y) => y.idle - x.idle);
  return { soon, week, stale };
}

/* ── KPI ────────────────────────────────────────────────── */

export interface Kpis {
  live: number;
  total: number;
  applied: number;
  interviewed: number;
  offers: number;
  roundsDone: number;
  roundsPassed: number;
  thisWeek: number;
}

export function kpis(rows: Application[], totalCount: number): Kpis {
  let roundsDone = 0;
  let roundsPassed = 0;
  for (const a of rows) {
    for (const r of a.rounds) {
      if (r.result === 'pending') continue;
      roundsDone += 1;
      if (r.result === 'pass') roundsPassed += 1;
    }
  }
  return {
    live: rows.filter(isLive).length,
    total: totalCount,
    applied: rows.filter(reachedApplied).length,
    interviewed: rows.filter(reachedInterview).length,
    offers: rows.filter(reachedOffer).length,
    roundsDone,
    roundsPassed,
    thisWeek: rows.filter((a) => {
      const d = daysAgo(a.appliedAt);
      return d != null && d >= 0 && d < 7;
    }).length,
  };
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/* ── 漏斗 ───────────────────────────────────────────────── */

export interface FunnelStage { name: string; n: number; tone: string }

/** 单一蓝色 ordinal 阶梯 —— 不混入状态色，色阶本身表示“越走越深” */
export function funnel(rows: Application[]): FunnelStage[] {
  return [
    { name: '已投递',     n: rows.filter(reachedApplied).length,   tone: 'var(--st-applied)' },
    { name: '进入面试',   n: rows.filter(reachedInterview).length, tone: 'var(--st-assess)' },
    { name: '走到终面',   n: rows.filter(reachedFinal).length,     tone: 'var(--st-interview)' },
    { name: '拿到 Offer', n: rows.filter(reachedOffer).length,     tone: 'var(--st-final)' },
  ];
}

/* ── 每周投递量 ─────────────────────────────────────────── */

export interface WeekBucket { start: Date; label: string; n: number }

export function weeklyApplied(rows: Application[], weeks = 12): WeekBucket[] {
  const monday = mondayOfWeek();
  const out: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(monday, -i * 7);
    const end = addDays(start, 7);
    out.push({
      start,
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      n: rows.filter((a) => {
        const d = parseDT(a.appliedAt);
        return d != null && d >= start && d < end;
      }).length,
    });
  }
  return out;
}

/* ── 渠道效果 ───────────────────────────────────────────── */

export interface SourceRow {
  source: string;
  n: number;
  interviewed: number;
  offers: number;
}

export function bySource(rows: Application[]): SourceRow[] {
  const map = new Map<string, SourceRow>();
  for (const a of rows) {
    const key = a.source.trim() || '未填写渠道';
    const row = map.get(key) ?? { source: key, n: 0, interviewed: 0, offers: 0 };
    row.n += 1;
    if (reachedInterview(a)) row.interviewed += 1;
    if (reachedOffer(a)) row.offers += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.n - a.n);
}
