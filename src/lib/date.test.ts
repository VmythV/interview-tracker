import { afterEach, describe, expect, it, vi } from 'vitest';

import { addDays, dayDiff, daysAgo, fmtDate, fmtWhen, localISO, mondayOfWeek, parseDT } from './date';

afterEach(() => vi.useRealTimers());

/** 固定「现在」，否则跨天跑测试会飘 */
const freeze = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
};

describe('localISO', () => {
  it('用本地时区，不是 UTC —— 晚间时刻不能被挪到第二天', () => {
    // 这个时刻在 UTC 下已是 7/29，本地（东八区）仍是 7/28
    const d = new Date(2026, 6, 28, 23, 30);
    expect(localISO(d)).toBe('2026-07-28');
    expect(localISO(d.getTime())).toBe('2026-07-28');
  });

  it('月份和日期补零', () => {
    expect(localISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseDT', () => {
  it('解析纯日期为当天零点', () => {
    const d = parseDT('2026-07-28')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(28);
    expect(d.getHours()).toBe(0);
  });

  it('解析日期时间', () => {
    const d = parseDT('2026-07-28T14:30')!;
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it('空值和垃圾串返回 null', () => {
    expect(parseDT('')).toBeNull();
    expect(parseDT(null)).toBeNull();
    expect(parseDT(undefined)).toBeNull();
    expect(parseDT('不是日期')).toBeNull();
  });
});

describe('dayDiff', () => {
  it('按自然日算，忽略时分秒', () => {
    const a = new Date(2026, 6, 28, 23, 59);
    const b = new Date(2026, 6, 29, 0, 1);
    expect(dayDiff(a, b)).toBe(1);
  });

  it('同一天为 0，倒序为负', () => {
    expect(dayDiff(new Date(2026, 6, 28, 1), new Date(2026, 6, 28, 22))).toBe(0);
    expect(dayDiff(new Date(2026, 6, 29), new Date(2026, 6, 28))).toBe(-1);
  });
});

describe('fmtWhen', () => {
  it('今天 / 明天 / 昨天走中文口语', () => {
    freeze('2026-07-28T12:00:00');
    expect(fmtWhen('2026-07-28T15:00')).toBe('今天 15:00');
    expect(fmtWhen('2026-07-29T09:05')).toBe('明天 09:05');
    expect(fmtWhen('2026-07-27T18:00')).toBe('昨天 18:00');
  });

  it('更远的日期带星期', () => {
    freeze('2026-07-28T12:00:00');
    expect(fmtWhen('2026-08-05T14:30')).toBe('8月5日 周三 14:30');
  });

  it('只有日期时不显示时间', () => {
    freeze('2026-07-28T12:00:00');
    expect(fmtWhen('2026-08-05')).toBe('8月5日 周三');
  });

  it('无效输入给破折号', () => {
    expect(fmtWhen('')).toBe('—');
    expect(fmtDate('')).toBe('—');
  });
});

describe('daysAgo', () => {
  it('正数表示过去', () => {
    freeze('2026-07-28T12:00:00');
    expect(daysAgo('2026-07-21')).toBe(7);
    expect(daysAgo('2026-07-28')).toBe(0);
    expect(daysAgo('2026-07-30')).toBe(-2);
  });
});

describe('mondayOfWeek / addDays', () => {
  it('周二取到本周一', () => {
    expect(localISO(mondayOfWeek(new Date(2026, 6, 28)))).toBe('2026-07-27');
  });

  it('周日取到本周一（不是下周一）', () => {
    expect(localISO(mondayOfWeek(new Date(2026, 7, 2)))).toBe('2026-07-27');
  });

  it('周一取自己', () => {
    expect(localISO(mondayOfWeek(new Date(2026, 6, 27)))).toBe('2026-07-27');
  });

  it('addDays 跨月正确', () => {
    expect(localISO(addDays(new Date(2026, 6, 30), 3))).toBe('2026-08-02');
  });
});
