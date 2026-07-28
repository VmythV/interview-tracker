import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Persisted } from '../types';
import { BACKUP_SNOOZE_DAYS, BACKUP_STALE_DAYS, backupNotice } from './backup';
import { emptyState } from './storage';
import { makeApp } from './testFactory';

afterEach(() => vi.useRealTimers());

const DAY = 86_400_000;
const NOW = new Date('2026-07-28T12:00:00');
const freeze = () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
};
const daysAgo = (n: number) => NOW.getTime() - n * DAY;

/** 建一份含 n 条记录的状态，记录都在 createdDaysAgo 天前建的 */
const state = (n: number, patch: Partial<Persisted> = {}, createdDaysAgo = 3): Persisted => ({
  ...emptyState(),
  applications: Array.from({ length: n }, () => makeApp({ createdAt: daysAgo(createdDaysAgo) })),
  ...patch,
});

describe('backupNotice', () => {
  it('记录太少时不打扰', () => {
    freeze();
    expect(backupNotice(state(2))).toBeNull();
  });

  it('从没导出过且数据攒了一天以上，提示「还没备份过」', () => {
    freeze();
    expect(backupNotice(state(5))).toEqual({ never: true, days: 0 });
  });

  it('刚建的记录当天不提示 —— 建完就弹太烦', () => {
    freeze();
    expect(backupNotice(state(5, {}, 0))).toBeNull();
  });

  it('刚导出过就不提示', () => {
    freeze();
    expect(backupNotice(state(5, { lastExportedAt: daysAgo(1) }))).toBeNull();
  });

  it('超过阈值天数没导出才提示，并带上天数', () => {
    freeze();
    const justUnder = state(5, { lastExportedAt: daysAgo(BACKUP_STALE_DAYS - 1) });
    const justOver = state(5, { lastExportedAt: daysAgo(BACKUP_STALE_DAYS) });
    expect(backupNotice(justUnder)).toBeNull();
    expect(backupNotice(justOver)).toEqual({ never: false, days: BACKUP_STALE_DAYS });
  });

  it('点过「以后再说」后在安静期内不提示', () => {
    freeze();
    const snoozed = state(5, { backupSnoozedAt: daysAgo(BACKUP_SNOOZE_DAYS - 1) });
    expect(backupNotice(snoozed)).toBeNull();
  });

  it('安静期过了会重新提示', () => {
    freeze();
    const expired = state(5, { backupSnoozedAt: daysAgo(BACKUP_SNOOZE_DAYS) });
    expect(backupNotice(expired)).not.toBeNull();
  });

  it('没有任何记录时永远不提示', () => {
    freeze();
    expect(backupNotice(emptyState())).toBeNull();
  });
});
