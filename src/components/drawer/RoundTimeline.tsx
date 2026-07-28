import { fmtWhen, parseDT } from '../../lib/date';
import { ROUND_MODES, ROUND_RESULT_BY_ID, type Round } from '../../types';

interface Props {
  rounds: Round[];
  onSetResult: (id: string, result: Round['result']) => void;
  onEdit: (round: Round) => void;
  onDelete: (id: string) => void;
}

/** 没定时间的排最后，其余按时间先后 */
const byTime = (a: Round, b: Round) => {
  const x = parseDT(a.at)?.getTime() ?? Number.POSITIVE_INFINITY;
  const y = parseDT(b.at)?.getTime() ?? Number.POSITIVE_INFINITY;
  return x - y;
};

export function RoundTimeline({ rounds, onSetResult, onEdit, onDelete }: Props) {
  if (rounds.length === 0) return <p className="hint">还没有记录任何轮次。</p>;

  return (
    <div className="rounds">
      {[...rounds].sort(byTime).map((r) => {
        const res = ROUND_RESULT_BY_ID[r.result];
        const mode = ROUND_MODES.find((m) => m.id === r.mode);
        return (
          <div className="round" key={r.id} style={{ ['--tone' as string]: res.tone }}>
            <div className="round-head">
              <span className="round-name">{r.name || '一轮'}</span>
              <span className="round-badge" style={{ ['--tone' as string]: res.tone }}>
                <span className="g" aria-hidden="true">
                  {res.glyph}
                </span>
                <span>{res.label}</span>
              </span>
              <span className="round-when">{r.at ? fmtWhen(r.at) : '未定时间'}</span>
            </div>

            <div className="round-meta">
              {mode && <span>{mode.label}</span>}
              {r.location && <span>◎ {r.location}</span>}
              {r.interviewer && <span>面试官 {r.interviewer}</span>}
            </div>

            {r.note && <div className="round-note">{r.note}</div>}

            <div className="round-actions">
              {r.result === 'pending' ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onSetResult(r.id, 'pass')}
                  >
                    ✓ 通过
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onSetResult(r.id, 'fail')}
                  >
                    ✕ 未过
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onSetResult(r.id, 'pending')}
                >
                  ↺ 改回待定
                </button>
              )}
              <button type="button" className="btn btn-sm" onClick={() => onEdit(r)}>
                编辑
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(r.id)}
              >
                删除
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
