/** 数据模型与流程常量。UTF-8。
 *  实体叫 Application（一次投递），不叫 Record —— 后者是 TS 内置工具类型。 */

export type StatusId =
  | 'wish' | 'applied' | 'assess' | 'interview' | 'final' | 'offer' | 'closed';

export type OutcomeId = 'rejected' | 'declined' | 'ghosted' | 'withdrawn';
export type RoundModeId = 'onsite' | 'video' | 'phone';
export type WorkModeId = 'onsite' | 'hybrid' | 'remote';
export type RoundResultId = 'pending' | 'pass' | 'fail';

export type ViewId = 'board' | 'calendar' | 'list' | 'stats';
export type ThemeId = 'light' | 'dark' | null;
export type SortId = 'updated' | 'applied' | 'next' | 'company';
export type RangeId = 'all' | '7' | '30' | '90';

export interface Round {
  id: string;
  name: string;
  /** 'YYYY-MM-DDTHH:mm'，空串表示还没定时间 */
  at: string;
  mode: RoundModeId;
  location: string;
  interviewer: string;
  result: RoundResultId;
  note: string;
}

export interface HistoryEntry {
  at: number;
  from: StatusId;
  to: StatusId;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  city: string;
  workMode: WorkModeId;
  source: string;
  salary: string;
  /** 'YYYY-MM-DD' */
  appliedAt: string;
  status: StatusId;
  /** 仅 status === 'closed' 时有意义 */
  outcome: OutcomeId | '';
  star: boolean;
  tags: string[];
  note: string;
  rounds: Round[];
  /** 曾经到达过的流程阶段（不含 closed）—— 漏斗靠它，而不是当前状态 */
  reached: StatusId[];
  history: HistoryEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface Persisted {
  applications: Application[];
  theme: ThemeId;
  view: ViewId;
  /** 上次导出 JSON 的时间戳；从没导出过为 null */
  lastExportedAt: number | null;
  /** 上次点「以后再说」的时间戳 */
  backupSnoozedAt: number | null;
}

export interface Filters {
  q: string;
  status: StatusId | 'all';
  city: string | 'all';
  range: RangeId;
  sort: SortId;
}

/* ── 流程状态 ────────────────────────────────────────────────
   每个状态都有自己的图标：Offer 绿 #0ca30c 与 已结束 红 #d03b3b
   在红绿色盲下 ΔE 只有 4.1，几乎不可分辨，所以颜色永远不单独承载
   含义 —— 图标 + 文字才是识别通道。
   阶段色是一条经 validate_palette.js --ordinal 校验过的单一蓝色阶梯。 */
export interface StatusDef {
  id: StatusId;
  label: string;
  glyph: string;
  tone: string;
}

export const STATUS: readonly StatusDef[] = [
  { id: 'wish',      label: '想投',        glyph: '○', tone: 'var(--st-wish)' },
  { id: 'applied',   label: '已投递',      glyph: '↗', tone: 'var(--st-applied)' },
  { id: 'assess',    label: '笔试/测评',   glyph: '✎', tone: 'var(--st-assess)' },
  { id: 'interview', label: '面试中',      glyph: '◐', tone: 'var(--st-interview)' },
  { id: 'final',     label: '终面/待结果', glyph: '◆', tone: 'var(--st-final)' },
  { id: 'offer',     label: '已拿 Offer',  glyph: '★', tone: 'var(--st-offer)' },
  { id: 'closed',    label: '已结束',      glyph: '✕', tone: 'var(--st-closed)' },
];

export const STATUS_BY_ID = Object.fromEntries(
  STATUS.map((s) => [s.id, s]),
) as Record<StatusId, StatusDef>;

/** 还在推进中的状态（closed 之外全部） */
export const LIVE_STATUSES: readonly StatusId[] =
  ['wish', 'applied', 'assess', 'interview', 'final', 'offer'];

/** 一键推进的建议路径；表单里仍可自由改到任意状态 */
export const NEXT_STATUSES: Record<StatusId, StatusId[]> = {
  wish:      ['applied', 'closed'],
  applied:   ['assess', 'interview', 'closed'],
  assess:    ['interview', 'closed'],
  interview: ['final', 'offer', 'closed'],
  final:     ['offer', 'closed'],
  offer:     ['closed'],
  closed:    ['interview', 'applied'],
};

export const OUTCOMES: { id: OutcomeId; label: string }[] = [
  { id: 'rejected',  label: '未通过' },
  { id: 'declined',  label: '我拒绝了' },
  { id: 'ghosted',   label: '无回应' },
  { id: 'withdrawn', label: '主动放弃' },
];

/** 单轮面试的形式 */
export const ROUND_MODES: { id: RoundModeId; label: string }[] = [
  { id: 'onsite', label: '现场' },
  { id: 'video',  label: '视频' },
  { id: 'phone',  label: '电话' },
];

/** 岗位的办公方式 */
export const WORK_MODES: { id: WorkModeId; label: string }[] = [
  { id: 'onsite', label: '现场办公' },
  { id: 'hybrid', label: '混合办公' },
  { id: 'remote', label: '完全远程' },
];

export interface RoundResultDef {
  id: RoundResultId;
  label: string;
  glyph: string;
  tone: string;
}

export const ROUND_RESULTS: readonly RoundResultDef[] = [
  { id: 'pending', label: '待定',   glyph: '◐', tone: 'var(--st-interview)' },
  { id: 'pass',    label: '通过',   glyph: '✓', tone: 'var(--st-offer)' },
  { id: 'fail',    label: '未通过', glyph: '✕', tone: 'var(--st-closed)' },
];

export const ROUND_RESULT_BY_ID = Object.fromEntries(
  ROUND_RESULTS.map((r) => [r.id, r]),
) as Record<RoundResultId, RoundResultDef>;

export const ROUND_PRESETS = ['一面', '二面', '三面', '四面', '交叉面', 'HR 面', '主管面', '终面'];
