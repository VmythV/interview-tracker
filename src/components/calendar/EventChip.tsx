import { fmtHM, type CalendarEvent } from '../../lib/calendar';
import { ROUND_MODES, ROUND_RESULT_BY_ID } from '../../types';

/** 结果用颜色 + 图标双通道标记：待定 ◐ / 通过 ✓ / 未通过 ✕ */
export function eventTone(ev: CalendarEvent) {
  return ROUND_RESULT_BY_ID[ev.result];
}

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

/** 月视图 / 全天行里用的一行式事件 */
export function EventChip({ ev, onOpen }: { ev: CalendarEvent; onOpen: (id: string) => void }) {
  const res = eventTone(ev);
  return (
    <button
      type="button"
      className="cal-chip"
      style={{ ['--tone' as string]: res.tone }}
      title={eventTitle(ev)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(ev.appId);
      }}
    >
      <span className="g" aria-hidden="true">
        {res.glyph}
      </span>
      {!ev.allDay && <span className="t">{fmtHM(ev.start)}</span>}
      <span className="c">{ev.company}</span>
      <span className="r">{ev.roundName}</span>
    </button>
  );
}
