import { STATUS_BY_ID, type StatusId } from '../types';

/** 状态标签：色点之外一定带图标 + 文字，颜色永远不单独承载含义。 */
export function StatusPill({ status }: { status: StatusId }) {
  const st = STATUS_BY_ID[status];
  return (
    <span className="pill" style={{ ['--tone' as string]: st.tone }}>
      <span className="glyph" aria-hidden="true">
        {st.glyph}
      </span>
      <span>{st.label}</span>
    </span>
  );
}
