import { fmtHM, type CalendarEvent } from '../../lib/calendar';
import { ROUND_MODES, ROUND_RESULT_BY_ID, type RoundResultDef } from '../../types';

/** 结果用颜色 + 图标双通道标记：待定 ◐ / 通过 ✓ / 未通过 ✕ */
export const eventTone = (ev: CalendarEvent): RoundResultDef => ROUND_RESULT_BY_ID[ev.result];

/** 悬停提示：把这场面试的所有信息摊平成一行 */
export function eventTitle(ev: CalendarEvent): string {
  const mode = ROUND_MODES.find((m) => m.id === ev.mode)?.label ?? '';
  return [
    `${ev.company} · ${ev.roundName}`,
    ev.allDay ? '全天' : fmtHM(ev.start),
    mode,
    ev.location,
    ev.interviewer && `面试官 ${ev.interviewer}`,
    ROUND_RESULT_BY_ID[ev.result].label,
  ]
    .filter(Boolean)
    .join('　·　');
}
