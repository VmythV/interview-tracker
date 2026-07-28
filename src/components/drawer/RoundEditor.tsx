import { useState } from 'react';

import { ROUND_MODES, ROUND_PRESETS, ROUND_RESULTS, type Round } from '../../types';
import { Field } from './Field';

interface Props {
  initial: Round;
  onSave: (round: Round) => void;
  onCancel: () => void;
}

export function RoundEditor({ initial, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Round>(initial);
  const set = <K extends keyof Round>(key: K, value: Round[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="round-editor">
      <div className="grid2">
        <Field label="轮次名称">
          <input
            value={draft.name}
            list="round-name-presets"
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>

        <Field label="时间">
          <input
            type="datetime-local"
            value={draft.at}
            onChange={(e) => set('at', e.target.value)}
          />
        </Field>

        <Field label="形式">
          <select
            value={draft.mode}
            onChange={(e) => set('mode', e.target.value as Round['mode'])}
          >
            {ROUND_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="结果">
          <select
            value={draft.result}
            onChange={(e) => set('result', e.target.value as Round['result'])}
          >
            {ROUND_RESULTS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="full">
          <Field label="地点 / 会议链接">
            <input
              value={draft.location}
              placeholder="例：张江某某大厦 12F，或腾讯会议号"
              onChange={(e) => set('location', e.target.value)}
            />
          </Field>
        </div>

        <Field label="面试官">
          <input
            value={draft.interviewer}
            placeholder="姓名 / 职位"
            onChange={(e) => set('interviewer', e.target.value)}
          />
        </Field>

        <div className="full">
          <Field label="记录">
            <textarea
              value={draft.note}
              placeholder="问了什么、答得怎样、下次要准备的…"
              onChange={(e) => set('note', e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="round-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>
          保存这一轮
        </button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          取消
        </button>
      </div>

      <datalist id="round-name-presets">
        {ROUND_PRESETS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  );
}
