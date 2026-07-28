/** localStorage 读写。任何外部数据（旧版本、导入的文件）都要过 normalize。 */

import {
  STATUS_BY_ID,
  type Application,
  type OutcomeId,
  type Persisted,
  type RoundModeId,
  type RoundResultId,
  type StatusId,
  type ViewId,
  type WorkModeId,
} from '../types';
import { todayISO } from './date';
import { uid } from './id';

export const STORAGE_KEY = 'interview-tracker-v1';

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const WORK_MODE_IDS: WorkModeId[] = ['onsite', 'hybrid', 'remote'];
const ROUND_MODE_IDS: RoundModeId[] = ['onsite', 'video', 'phone'];
const ROUND_RESULT_IDS: RoundResultId[] = ['pending', 'pass', 'fail'];
const OUTCOME_IDS: OutcomeId[] = ['rejected', 'declined', 'ghosted', 'withdrawn'];
const STATUS_IDS = Object.keys(STATUS_BY_ID) as StatusId[];

export function blankApplication(): Application {
  const now = Date.now();
  return {
    id: uid(),
    company: '',
    role: '',
    city: '',
    workMode: 'onsite',
    source: '',
    salary: '',
    appliedAt: todayISO(),
    status: 'applied',
    outcome: '',
    star: false,
    tags: [],
    note: '',
    rounds: [],
    reached: ['applied'],
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** 把任意来源的对象补齐成合法的 Application */
export function normalize(raw: unknown): Application {
  const o = (raw ?? {}) as Partial<Application> & Record<string, unknown>;
  const base = blankApplication();
  const status = oneOf<StatusId>(o.status, STATUS_IDS, 'applied');

  const reached = Array.isArray(o.reached)
    ? o.reached.filter((s): s is StatusId => STATUS_IDS.includes(s as StatusId) && s !== 'closed')
    : [];
  if (status !== 'closed' && !reached.includes(status)) reached.push(status);
  if (reached.length === 0) reached.push('applied');

  return {
    ...base,
    id: str(o.id) || base.id,
    company: str(o.company),
    role: str(o.role),
    city: str(o.city),
    workMode: oneOf<WorkModeId>(o.workMode, WORK_MODE_IDS, 'onsite'),
    source: str(o.source),
    salary: str(o.salary),
    appliedAt: str(o.appliedAt, base.appliedAt),
    status,
    outcome:
      status === 'closed'
        ? oneOf<OutcomeId>(o.outcome, OUTCOME_IDS, 'rejected')
        : '',
    star: o.star === true,
    tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
    note: str(o.note),
    rounds: Array.isArray(o.rounds)
      ? o.rounds.map((r) => {
          const rr = (r ?? {}) as Partial<Application['rounds'][number]>;
          return {
            id: str(rr.id) || uid(),
            name: str(rr.name, '一面'),
            at: str(rr.at),
            mode: oneOf<RoundModeId>(rr.mode, ROUND_MODE_IDS, 'video'),
            location: str(rr.location),
            interviewer: str(rr.interviewer),
            result: oneOf<RoundResultId>(rr.result, ROUND_RESULT_IDS, 'pending'),
            note: str(rr.note),
          };
        })
      : [],
    reached,
    history: Array.isArray(o.history)
      ? o.history.flatMap((h) => {
          const hh = (h ?? {}) as unknown as Record<string, unknown>;
          const from = oneOf<StatusId>(hh.from, STATUS_IDS, 'applied');
          const to = oneOf<StatusId>(hh.to, STATUS_IDS, 'applied');
          return [{ at: num(hh.at, Date.now()), from, to }];
        })
      : [],
    createdAt: num(o.createdAt, base.createdAt),
    updatedAt: num(o.updatedAt, base.updatedAt),
  };
}

export const emptyState = (): Persisted => ({ applications: [], theme: null, view: 'board' });

export function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // v1（原生 JS 版）用的是 records 字段，这里一并兼容
    const list = Array.isArray(parsed.applications)
      ? parsed.applications
      : Array.isArray(parsed.records)
        ? parsed.records
        : [];
    return {
      applications: list.map(normalize),
      theme: parsed.theme === 'dark' ? 'dark' : parsed.theme === 'light' ? 'light' : null,
      view: oneOf<ViewId>(parsed.view, ['board', 'calendar', 'list', 'stats'], 'board'),
    };
  } catch (err) {
    console.warn('[面试追踪] 本地数据读取失败，已从空白开始', err);
    return emptyState();
  }
}

/** 写入失败（隐私模式 / 配额满）时返回 false，由调用方提示用户 */
export function saveState(state: Persisted): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('[面试追踪] 本地数据保存失败', err);
    return false;
  }
}

/** 从导入的文件里取出记录数组；格式不对就抛错 */
export function parseImport(text: string): Application[] {
  const parsed = JSON.parse(text) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : ((parsed as Record<string, unknown>)?.applications ??
       (parsed as Record<string, unknown>)?.records);
  if (!Array.isArray(list)) throw new Error('文件里找不到记录数组');
  return list.map(normalize);
}
