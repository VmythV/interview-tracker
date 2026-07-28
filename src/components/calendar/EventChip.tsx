import { fmtHM, type CalendarEvent } from '../../lib/calendar';
import { eventTitle, eventTone } from './eventDisplay';

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
