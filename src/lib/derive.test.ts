import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Filters } from '../types';
import {
  applyFilters,
  attention,
  bySource,
  cityOptions,
  funnel,
  isLive,
  kpis,
  nextRound,
  pct,
  reachedFinal,
  reachedInterview,
  reachedOffer,
  weeklyApplied,
} from './derive';
import { makeApp, makeRound } from './testFactory';

afterEach(() => vi.useRealTimers());

const freeze = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
};

const FILTERS: Filters = { q: '', status: 'all', city: 'all', range: 'all', sort: 'updated' };
const f = (patch: Partial<Filters> = {}): Filters => ({ ...FILTERS, ...patch });

describe('applyFilters', () => {
  const rows = [
    makeApp({ company: '星野科技', city: '上海', status: 'interview', appliedAt: '2026-07-20', tags: ['大厂'] }),
    makeApp({ company: '青柠网络', city: '杭州', status: 'closed', appliedAt: '2026-05-01', note: '远程友好' }),
    makeApp({ company: '云梯数据', city: '', status: 'applied', appliedAt: '2026-07-27' }),
  ];

  it('搜索命中公司名、标签和备注', () => {
    expect(applyFilters(rows, f({ q: '星野' })).map((a) => a.company)).toEqual(['星野科技']);
    expect(applyFilters(rows, f({ q: '大厂' })).map((a) => a.company)).toEqual(['星野科技']);
    expect(applyFilters(rows, f({ q: '远程' })).map((a) => a.company)).toEqual(['青柠网络']);
  });

  it('搜索不区分大小写且能匹配不到', () => {
    expect(applyFilters(rows, f({ q: '不存在的词' }))).toHaveLength(0);
  });

  it('按状态和城市过滤；没填城市归入「未填」', () => {
    expect(applyFilters(rows, f({ status: 'closed' })).map((a) => a.company)).toEqual(['青柠网络']);
    expect(applyFilters(rows, f({ city: '未填' })).map((a) => a.company)).toEqual(['云梯数据']);
  });

  it('时间范围按投递日期过滤，超窗的排除', () => {
    freeze('2026-07-28T12:00:00');
    const got = applyFilters(rows, f({ range: '30' })).map((a) => a.company);
    expect(got).toContain('星野科技');
    expect(got).toContain('云梯数据');
    expect(got).not.toContain('青柠网络');
  });

  it('多个条件是「与」的关系', () => {
    expect(applyFilters(rows, f({ q: '星野', city: '杭州' }))).toHaveLength(0);
  });

  it('不改动传入数组', () => {
    const original = [...rows];
    applyFilters(rows, f({ sort: 'company' }));
    expect(rows).toEqual(original);
  });
});

describe('排序', () => {
  it('按公司名用中文排序规则', () => {
    const rows = [makeApp({ company: '张三' }), makeApp({ company: '李四' }), makeApp({ company: '王五' })];
    expect(applyFilters(rows, f({ sort: 'company' })).map((a) => a.company)).toEqual(['李四', '王五', '张三']);
  });

  it('按最近更新倒序', () => {
    const rows = [
      makeApp({ company: '旧', updatedAt: 1000 }),
      makeApp({ company: '新', updatedAt: 9000 }),
    ];
    expect(applyFilters(rows, f({ sort: 'updated' })).map((a) => a.company)).toEqual(['新', '旧']);
  });

  it('按最近面试排序时，有待定面试的排在没有的前面', () => {
    freeze('2026-07-28T12:00:00');
    const withRound = makeApp({
      company: '有面试',
      rounds: [makeRound({ at: '2026-07-30T10:00' })],
    });
    const without = makeApp({ company: '没面试', updatedAt: Date.now() });
    expect(applyFilters([without, withRound], f({ sort: 'next' })).map((a) => a.company)).toEqual([
      '有面试',
      '没面试',
    ]);
  });
});

describe('nextRound', () => {
  it('取最近的待定轮次', () => {
    freeze('2026-07-28T12:00:00');
    const app = makeApp({
      rounds: [
        makeRound({ name: '三面', at: '2026-08-10T10:00' }),
        makeRound({ name: '二面', at: '2026-07-30T10:00' }),
      ],
    });
    expect(nextRound(app)?.name).toBe('二面');
  });

  it('忽略已出结果的轮次', () => {
    freeze('2026-07-28T12:00:00');
    const app = makeApp({
      rounds: [makeRound({ name: '一面', at: '2026-07-30T10:00', result: 'pass' })],
    });
    expect(nextRound(app)).toBeNull();
  });

  it('忽略没定时间的轮次', () => {
    const app = makeApp({ rounds: [makeRound({ at: '' })] });
    expect(nextRound(app)).toBeNull();
  });

  it('过去超过 6 小时的不再算「下一场」，刚过去的还算', () => {
    freeze('2026-07-28T12:00:00');
    const longPast = makeApp({ rounds: [makeRound({ at: '2026-07-28T02:00' })] });
    const justPast = makeApp({ rounds: [makeRound({ at: '2026-07-28T09:00' })] });
    expect(nextRound(longPast)).toBeNull();
    expect(nextRound(justPast)).not.toBeNull();
  });
});

describe('漏斗', () => {
  it('各层严格包含下一层', () => {
    const rows = [
      makeApp({ status: 'applied', reached: ['applied'] }),
      makeApp({ status: 'interview', reached: ['applied', 'interview'] }),
      makeApp({ status: 'final', reached: ['applied', 'interview', 'final'] }),
      makeApp({ status: 'offer', reached: ['applied', 'interview', 'final', 'offer'] }),
    ];
    const [applied, interviewed, final, offer] = funnel(rows).map((s) => s.n);
    expect(applied).toBe(4);
    expect(interviewed).toBe(3);
    expect(final).toBe(2);
    expect(offer).toBe(1);
    expect(applied).toBeGreaterThanOrEqual(interviewed);
    expect(interviewed).toBeGreaterThanOrEqual(final);
    expect(final).toBeGreaterThanOrEqual(offer);
  });

  it('用 reached 而不是当前状态 —— 被刷掉的公司仍计入走到过的最深一层', () => {
    const rejected = makeApp({
      status: 'closed',
      outcome: 'rejected',
      reached: ['applied', 'interview', 'final'],
    });
    expect(reachedInterview(rejected)).toBe(true);
    expect(reachedFinal(rejected)).toBe(true);
    expect(reachedOffer(rejected)).toBe(false);
    expect(funnel([rejected]).map((s) => s.n)).toEqual([1, 1, 1, 0]);
  });

  it('记了面试轮次也算进过面试，即使 reached 里没写', () => {
    const app = makeApp({ status: 'applied', reached: ['applied'], rounds: [makeRound()] });
    expect(reachedInterview(app)).toBe(true);
  });

  it('只是「想投」不计入已投递', () => {
    expect(funnel([makeApp({ status: 'wish', reached: ['wish'] })])[0].n).toBe(0);
  });
});

describe('attention（待办分档）', () => {
  it('今明两天、7 天内、久无进展分别落桶', () => {
    freeze('2026-07-28T12:00:00');
    const tomorrow = makeApp({
      company: '明天面',
      status: 'interview',
      rounds: [makeRound({ at: '2026-07-29T15:00' })],
    });
    const thisWeek = makeApp({
      company: '周内面',
      status: 'interview',
      rounds: [makeRound({ at: '2026-08-02T15:00' })],
    });
    const stale = makeApp({
      company: '久无进展',
      status: 'applied',
      updatedAt: new Date('2026-07-10T12:00:00').getTime(),
    });
    const got = attention([tomorrow, thisWeek, stale]);
    expect(got.soon.map((x) => x.app.company)).toEqual(['明天面']);
    expect(got.week.map((x) => x.app.company)).toEqual(['周内面']);
    expect(got.stale.map((x) => x.app.company)).toEqual(['久无进展']);
  });

  it('已结束的不进任何一档', () => {
    freeze('2026-07-28T12:00:00');
    const closed = makeApp({
      status: 'closed',
      updatedAt: new Date('2026-01-01').getTime(),
      rounds: [makeRound({ at: '2026-07-29T15:00' })],
    });
    const got = attention([closed]);
    expect(got.soon).toHaveLength(0);
    expect(got.week).toHaveLength(0);
    expect(got.stale).toHaveLength(0);
  });

  it('有排期的不会同时被算作「久无进展」', () => {
    freeze('2026-07-28T12:00:00');
    const app = makeApp({
      status: 'interview',
      updatedAt: new Date('2026-01-01').getTime(),
      rounds: [makeRound({ at: '2026-07-29T15:00' })],
    });
    expect(attention([app]).stale).toHaveLength(0);
  });
});

describe('kpis 与 pct', () => {
  it('分母为 0 时返回 0，不产生 NaN', () => {
    expect(pct(0, 0)).toBe(0);
    expect(pct(3, 0)).toBe(0);
  });

  it('统计轮次通过率只算已出结果的', () => {
    const app = makeApp({
      rounds: [
        makeRound({ result: 'pass' }),
        makeRound({ result: 'fail' }),
        makeRound({ result: 'pending' }),
      ],
    });
    const k = kpis([app], 1);
    expect(k.roundsDone).toBe(2);
    expect(k.roundsPassed).toBe(1);
    expect(pct(k.roundsPassed, k.roundsDone)).toBe(50);
  });

  it('在投数不含已结束', () => {
    const rows = [makeApp({ status: 'interview' }), makeApp({ status: 'closed' })];
    expect(kpis(rows, 2).live).toBe(1);
    expect(isLive(rows[0])).toBe(true);
    expect(isLive(rows[1])).toBe(false);
  });
});

describe('weeklyApplied', () => {
  it('返回 12 个桶，末桶是本周', () => {
    freeze('2026-07-28T12:00:00');
    const buckets = weeklyApplied([makeApp({ appliedAt: '2026-07-27' })]);
    expect(buckets).toHaveLength(12);
    expect(buckets[11].n).toBe(1);
    expect(buckets.slice(0, 11).every((b) => b.n === 0)).toBe(true);
  });

  it('窗口之外的投递不计入', () => {
    freeze('2026-07-28T12:00:00');
    expect(weeklyApplied([makeApp({ appliedAt: '2020-01-01' })]).every((b) => b.n === 0)).toBe(true);
  });
});

describe('bySource / cityOptions', () => {
  it('按渠道聚合并统计进面试与 offer', () => {
    const rows = [
      makeApp({ source: '内推', reached: ['applied', 'interview'] }),
      makeApp({ source: '内推', reached: ['applied'] }),
      makeApp({ source: '猎头', reached: ['applied', 'interview', 'offer'] }),
    ];
    const got = bySource(rows);
    expect(got[0]).toMatchObject({ source: '内推', n: 2, interviewed: 1, offers: 0 });
    expect(got[1]).toMatchObject({ source: '猎头', n: 1, interviewed: 1, offers: 1 });
  });

  it('渠道留空归入「未填写渠道」', () => {
    expect(bySource([makeApp({ source: '  ' })])[0].source).toBe('未填写渠道');
  });

  it('城市列表去重排序，空值归「未填」', () => {
    const rows = [makeApp({ city: '上海' }), makeApp({ city: '上海' }), makeApp({ city: '' })];
    expect(cityOptions(rows)).toEqual(['上海', '未填']);
  });
});
