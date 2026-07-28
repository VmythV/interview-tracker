import { describe, expect, it } from 'vitest';

import { makeApp } from '../lib/testFactory';
import { emptyState } from '../lib/storage';
import type { Persisted } from '../types';
import { advance, reducer } from './reducer';

const withApps = (...apps: ReturnType<typeof makeApp>[]): Persisted => ({
  ...emptyState(),
  applications: apps,
});

describe('advance（状态流转）', () => {
  it('推进会写 reached 和 history', () => {
    const app = makeApp({ status: 'applied', reached: ['applied'] });
    const next = advance(app, 'interview');
    expect(next.status).toBe('interview');
    expect(next.reached).toEqual(['applied', 'interview']);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toMatchObject({ from: 'applied', to: 'interview' });
  });

  it('推到相同状态时原样返回，不产生多余历史', () => {
    const app = makeApp({ status: 'applied' });
    expect(advance(app, 'applied')).toBe(app);
  });

  it('closed 不写进 reached —— 它不是流程阶段', () => {
    const app = makeApp({ status: 'interview', reached: ['applied', 'interview'] });
    const next = advance(app, 'closed');
    expect(next.reached).toEqual(['applied', 'interview']);
    expect(next.status).toBe('closed');
  });

  it('转到 closed 时补默认结束原因；离开 closed 时清空', () => {
    const closed = advance(makeApp({ status: 'interview' }), 'closed');
    expect(closed.outcome).toBe('rejected');
    expect(advance(closed, 'interview').outcome).toBe('');
  });

  it('已在 reached 里的阶段不会重复追加', () => {
    const app = makeApp({ status: 'closed', reached: ['applied', 'interview'] });
    expect(advance(app, 'interview').reached).toEqual(['applied', 'interview']);
  });

  it('反复推进累计历史但不重复阶段', () => {
    let app = makeApp({ status: 'applied', reached: ['applied'] });
    app = advance(app, 'interview');
    app = advance(app, 'final');
    app = advance(app, 'offer');
    expect(app.history).toHaveLength(3);
    expect(app.reached).toEqual(['applied', 'interview', 'final', 'offer']);
  });
});

describe('reducer', () => {
  it('upsert 不存在的记录时插到最前面', () => {
    const app = makeApp();
    const next = reducer(emptyState(), { type: 'upsert', app });
    expect(next.applications).toHaveLength(1);
    expect(next.applications[0].id).toBe(app.id);
  });

  it('upsert 已存在的记录时原地替换，不改变顺序', () => {
    const a = makeApp({ company: 'A' });
    const b = makeApp({ company: 'B' });
    const next = reducer(withApps(a, b), { type: 'upsert', app: { ...b, company: 'B2' } });
    expect(next.applications.map((x) => x.company)).toEqual(['A', 'B2']);
  });

  it('upsert 会刷新 updatedAt', () => {
    const app = makeApp({ updatedAt: 1 });
    const next = reducer(withApps(app), { type: 'upsert', app });
    expect(next.applications[0].updatedAt).toBeGreaterThan(1);
  });

  it('remove 后 restore 能放回原位', () => {
    const a = makeApp({ company: 'A' });
    const b = makeApp({ company: 'B' });
    const c = makeApp({ company: 'C' });
    const removed = reducer(withApps(a, b, c), { type: 'remove', id: b.id });
    expect(removed.applications.map((x) => x.company)).toEqual(['A', 'C']);
    const restored = reducer(removed, { type: 'restore', app: b, index: 1 });
    expect(restored.applications.map((x) => x.company)).toEqual(['A', 'B', 'C']);
  });

  it('restore 的下标越界时追加到末尾而不是丢掉', () => {
    const a = makeApp({ company: 'A' });
    const b = makeApp({ company: 'B' });
    const next = reducer(withApps(a), { type: 'restore', app: b, index: 99 });
    expect(next.applications.map((x) => x.company)).toEqual(['A', 'B']);
  });

  it('advance 作用到指定记录；id 不存在时原样返回', () => {
    const app = makeApp({ status: 'applied' });
    const next = reducer(withApps(app), { type: 'advance', id: app.id, to: 'offer' });
    expect(next.applications[0].status).toBe('offer');
    const same = withApps(app);
    expect(reducer(same, { type: 'advance', id: '不存在', to: 'offer' })).toBe(same);
  });

  it('mergeIn 按 id 覆盖并保留新增', () => {
    const a = makeApp({ company: 'A' });
    const b = makeApp({ company: 'B' });
    const next = reducer(withApps(a), { type: 'mergeIn', apps: [{ ...a, company: 'A2' }, b] });
    expect(next.applications.map((x) => x.company)).toEqual(['A2', 'B']);
  });

  it('replaceAll 整体替换', () => {
    const next = reducer(withApps(makeApp()), { type: 'replaceAll', apps: [] });
    expect(next.applications).toEqual([]);
  });

  it('markExported 记时间并清掉安静期', () => {
    const start: Persisted = { ...emptyState(), backupSnoozedAt: 123 };
    const next = reducer(start, { type: 'markExported', at: 999 });
    expect(next.lastExportedAt).toBe(999);
    expect(next.backupSnoozedAt).toBeNull();
  });

  it('snoozeBackup 记下当前时间', () => {
    expect(reducer(emptyState(), { type: 'snoozeBackup' }).backupSnoozedAt).toBeGreaterThan(0);
  });

  it('主题与视图切换互不影响数据', () => {
    const app = makeApp();
    let s = reducer(withApps(app), { type: 'setTheme', theme: 'dark' });
    s = reducer(s, { type: 'setView', view: 'calendar' });
    expect(s.theme).toBe('dark');
    expect(s.view).toBe('calendar');
    expect(s.applications).toHaveLength(1);
  });

  it('永远不原地改动传入的 state', () => {
    const app = makeApp({ status: 'applied' });
    const before = withApps(app);
    const snapshot = JSON.parse(JSON.stringify(before));
    reducer(before, { type: 'advance', id: app.id, to: 'offer' });
    reducer(before, { type: 'remove', id: app.id });
    expect(JSON.parse(JSON.stringify(before))).toEqual(snapshot);
  });
});
