/** 日期工具。一律走本地时区 —— toISOString() 是 UTC，会把日期整体挪一天。 */

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/** 时间戳 → 'YYYY-MM-DD'（本地时区） */
export function localISO(ms: number | Date): string {
  const d = ms instanceof Date ? ms : new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = () => localISO(Date.now());

/** 'YYYY-MM-DD' 或 'YYYY-MM-DDTHH:mm' → Date，无法解析时返回 null */
export function parseDT(s: string | undefined | null): Date | null {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** b − a，按自然日计（忽略时分秒） */
export function dayDiff(a: Date, b: Date): number {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((y.getTime() - x.getTime()) / 86_400_000);
}

/** 距今多少天（正数 = 过去） */
export function daysAgo(s: string): number | null {
  const d = parseDT(s);
  return d ? dayDiff(d, new Date()) : null;
}

/** '7月30日' */
export function fmtDate(s: string): string {
  const d = parseDT(s);
  return d ? `${d.getMonth() + 1}月${d.getDate()}日` : '—';
}

/** '今天 14:00' / '明天 10:30' / '7月30日 周四 15:00' */
export function fmtWhen(s: string): string {
  const d = parseDT(s);
  if (!d) return '—';
  const diff = dayDiff(new Date(), d);
  const time = s.length > 10 ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
  if (diff === 0) return `今天${time}`;
  if (diff === 1) return `明天${time}`;
  if (diff === -1) return `昨天${time}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAY[d.getDay()]}${time}`;
}

/** 本周一 00:00 */
export function mondayOfWeek(ref = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ((ref.getDay() + 6) % 7));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
