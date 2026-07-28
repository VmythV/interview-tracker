import { useEffect, useRef, useState } from 'react';

import { useModalDialog } from '../../hooks/useModalDialog';
import { fmtWhen, localISO } from '../../lib/date';
import { uid } from '../../lib/id';
import { advance } from '../../store/reducer';
import {
  NEXT_STATUSES,
  OUTCOMES,
  ROUND_PRESETS,
  STATUS_BY_ID,
  WORK_MODES,
  type Application,
  type OutcomeId,
  type Round,
  type WorkModeId,
} from '../../types';
import { StatusPill } from '../StatusPill';
import { Field } from './Field';
import { RoundEditor } from './RoundEditor';
import { RoundTimeline } from './RoundTimeline';

interface Props {
  app: Application;
  /** 每次改动都往上抛，由上层决定要不要落库 */
  onChange: (next: Application) => void;
  onClose: () => void;
  onDelete: () => void;
  /** 渠道来源的历史值，做输入建议 */
  sourceSuggestions: string[];
}

const newRound = (index: number): Round => ({
  id: uid(),
  name: ROUND_PRESETS[Math.min(index, ROUND_PRESETS.length - 1)],
  at: '',
  mode: 'video',
  location: '',
  interviewer: '',
  result: 'pending',
  note: '',
});

export function ApplicationDrawer({
  app,
  onChange,
  onClose,
  onDelete,
  sourceSuggestions,
}: Props) {
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const firstInput = useRef<HTMLInputElement | null>(null);
  const panel = useRef<HTMLElement | null>(null);
  const st = STATUS_BY_ID[app.status];

  // Esc 先取消轮次编辑，再关抽屉
  useModalDialog(panel, () => {
    if (editingRound) setEditingRound(null);
    else onClose();
  });

  useEffect(() => {
    firstInput.current?.focus();
  }, []);

  const patch = <K extends keyof Application>(key: K, value: Application[K]) =>
    onChange({ ...app, [key]: value });

  function saveRound(round: Round) {
    const i = app.rounds.findIndex((r) => r.id === round.id);
    const rounds = i >= 0 ? app.rounds.map((r) => (r.id === round.id ? round : r)) : [...app.rounds, round];
    let next: Application = { ...app, rounds };
    // 记了面试轮次却还停在投递/笔试阶段，顺手推进到「面试中」
    if (['wish', 'applied', 'assess'].includes(next.status)) next = advance(next, 'interview');
    onChange(next);
    setEditingRound(null);
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" ref={panel} role="dialog" aria-modal="true" aria-label="投递详情">
        <div className="drawer-head">
          <div>
            <h2>{app.company || '新建投递'}</h2>
            <p>{[app.role, app.city].filter(Boolean).join(' · ') || '填写下面的信息'}</p>
          </div>
          <StatusPill status={app.status} />
          <button type="button" className="drawer-close" aria-label="关闭" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {/* ── 状态流转 ─────────────────────────────── */}
          <div className="sec">
            <div className="sec-title">状态流转</div>
            <div className="advance">
              <span
                className="adv-btn"
                aria-current="true"
                style={{ ['--tone' as string]: st.tone }}
              >
                <span className="glyph" aria-hidden="true">
                  {st.glyph}
                </span>
                当前：{st.label}
              </span>
              {NEXT_STATUSES[app.status].map((to) => {
                const nextSt = STATUS_BY_ID[to];
                return (
                  <button
                    key={to}
                    type="button"
                    className="adv-btn"
                    style={{ ['--tone' as string]: nextSt.tone }}
                    onClick={() => onChange(advance(app, to))}
                  >
                    →{' '}
                    <span className="glyph" aria-hidden="true">
                      {nextSt.glyph}
                    </span>
                    {nextSt.label}
                  </button>
                );
              })}
            </div>

            {app.history.length > 0 && (
              <div className="hist" style={{ marginTop: 10 }}>
                {app.history
                  .slice(-4)
                  .reverse()
                  .map((h) => (
                    <div className="hist-row" key={`${h.at}-${h.to}`}>
                      <time>{fmtWhen(localISO(h.at))}</time>
                      <span>
                        {STATUS_BY_ID[h.from].label} → {STATUS_BY_ID[h.to].label}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* ── 基本信息 ─────────────────────────────── */}
          <div className="sec">
            <div className="sec-title">基本信息</div>
            <div className="grid2">
              <Field label="公司">
                <input
                  ref={firstInput}
                  value={app.company}
                  placeholder="例：某某科技"
                  onChange={(e) => patch('company', e.target.value)}
                />
              </Field>

              <Field label="岗位">
                <input
                  value={app.role}
                  placeholder="例：前端工程师"
                  onChange={(e) => patch('role', e.target.value)}
                />
              </Field>

              <Field label="城市">
                <input
                  value={app.city}
                  placeholder="例：上海"
                  onChange={(e) => patch('city', e.target.value)}
                />
              </Field>

              <Field label="办公方式">
                <select
                  value={app.workMode}
                  onChange={(e) => patch('workMode', e.target.value as WorkModeId)}
                >
                  {WORK_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="渠道来源">
                <input
                  value={app.source}
                  list="source-suggestions"
                  placeholder="内推 / 官网 / BOSS / 猎头…"
                  onChange={(e) => patch('source', e.target.value)}
                />
              </Field>

              <Field label="薪资 / 备注">
                <input
                  value={app.salary}
                  placeholder="例：30–40K ×15"
                  onChange={(e) => patch('salary', e.target.value)}
                />
              </Field>

              <Field label="投递日期">
                <input
                  type="date"
                  value={app.appliedAt}
                  onChange={(e) => patch('appliedAt', e.target.value)}
                />
              </Field>

              <Field label="重点关注">
                <select
                  value={app.star ? '1' : '0'}
                  onChange={(e) => patch('star', e.target.value === '1')}
                >
                  <option value="0">普通</option>
                  <option value="1">★ 重点</option>
                </select>
              </Field>

              {app.status === 'closed' && (
                <div className="full">
                  <Field label="结束原因">
                    <select
                      value={app.outcome || 'rejected'}
                      onChange={(e) => patch('outcome', e.target.value as OutcomeId)}
                    >
                      {OUTCOMES.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <div className="full">
                <Field label="标签（逗号分隔）">
                  <input
                    value={app.tags.join(', ')}
                    placeholder="大厂, 远程友好, 需要笔试"
                    onChange={(e) =>
                      patch(
                        'tags',
                        e.target.value
                          .split(/[,，]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </Field>
              </div>

              <div className="full">
                <Field label="备注">
                  <textarea
                    value={app.note}
                    placeholder="JD 要点、面试官反馈、待确认的问题…"
                    onChange={(e) => patch('note', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── 面试轮次 ─────────────────────────────── */}
          <div className="sec">
            <div className="sec-title">面试轮次（{app.rounds.length}）</div>

            {editingRound ? (
              <RoundEditor
                key={editingRound.id}
                initial={editingRound}
                onSave={saveRound}
                onCancel={() => setEditingRound(null)}
              />
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginBottom: 12 }}
                onClick={() => setEditingRound(newRound(app.rounds.length))}
              >
                ＋ 添加一轮
              </button>
            )}

            <RoundTimeline
              rounds={app.rounds}
              onSetResult={(id, result) =>
                patch(
                  'rounds',
                  app.rounds.map((r) => (r.id === id ? { ...r, result } : r)),
                )
              }
              onEdit={setEditingRound}
              onDelete={(id) =>
                patch(
                  'rounds',
                  app.rounds.filter((r) => r.id !== id),
                )
              }
            />
          </div>
        </div>

        <div className="drawer-foot">
          <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
            删除这条
          </button>
          <span className="spacer" />
          <span className="hint">改动即时保存</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            完成
          </button>
        </div>

        <datalist id="source-suggestions">
          {sourceSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </aside>
    </>
  );
}
