/** 导出 / 导入，以及「该备份了」的判定。
 *
 *  这是纯本地应用，localStorage 并不是永久存储：Safari 的 ITP 会在长期不访问后
 *  清掉可被脚本写入的存储（含 localStorage），清浏览数据、换设备也一样会丢。
 *  所以「多久没导出了」必须主动提醒，不能等用户自己想起来。 */

import type { Application, Persisted } from '../types';
import { localISO, todayISO } from './date';
import { normalize } from './storage';

/** 超过这么多天没导出就提醒 */
export const BACKUP_STALE_DAYS = 14;
/** 点「以后再说」之后安静这么多天 */
export const BACKUP_SNOOZE_DAYS = 7;
/** 少于这么多条记录不打扰 */
const MIN_RECORDS_TO_NAG = 3;

const DAY = 86_400_000;
const daysSince = (ts: number) => Math.floor((Date.now() - ts) / DAY);

export interface BackupNotice {
  /** 从没导出过 */
  never: boolean;
  /** 距上次导出多少天；never 时无意义 */
  days: number;
}

/** 该不该提醒备份；不该则返回 null */
export function backupNotice(state: Persisted): BackupNotice | null {
  if (state.applications.length < MIN_RECORDS_TO_NAG) return null;
  if (state.backupSnoozedAt != null && daysSince(state.backupSnoozedAt) < BACKUP_SNOOZE_DAYS) {
    return null;
  }
  if (state.lastExportedAt == null) {
    // 刚建了几条就弹太烦，等这份数据攒够一天再说
    const oldest = Math.min(...state.applications.map((a) => a.createdAt));
    return daysSince(oldest) >= 1 ? { never: true, days: 0 } : null;
  }
  const days = daysSince(state.lastExportedAt);
  return days >= BACKUP_STALE_DAYS ? { never: false, days } : null;
}

/** 触发浏览器下载。返回本次导出的时间戳，交由调用方记账。 */
export function exportApplications(applications: Application[]): number {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    applications,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `面试记录-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return Date.now();
}

/** 从导入的文件里取出记录数组；格式不对就抛错 */
export function parseImport(text: string): Application[] {
  const parsed = JSON.parse(text) as unknown;
  const container = parsed as Record<string, unknown> | null;
  const list = Array.isArray(parsed)
    ? parsed
    : (container?.applications ?? container?.records);
  if (!Array.isArray(list)) throw new Error('文件里找不到记录数组');
  return list.map(normalize);
}

export const fmtBackupDate = (ts: number) => localISO(ts);
