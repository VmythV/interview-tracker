import { useRef, useState } from 'react';

import { useModalDialog } from '../../hooks/useModalDialog';
import { uid } from '../../lib/id';
import { advance } from '../../store/reducer';
import {
  LIVE_STATUSES,
  ROUND_MODES,
  ROUND_PRESETS,
  STATUS_BY_ID,
  type Application,
  type Round,
  type RoundModeId,
} from '../../types';
import { Field } from '../drawer/Field';

interface Props {
  /** 点日历空白处带过来的时间，'YYYY-MM-DDTHH:mm' */
  at: string;
  applications: Application[];
  onSave: (next: Application) => void;
  onClose: () => void;
}

/** 在日历上点一下空白就能约面试，不必先翻到那条投递再进抽屉。 */
export function QuickAddRound({ at, applications, onSave, onClose }: Props) {
  const panel = useRef<HTMLDivElement | null>(null);
  useModalDialog(panel, onClose);

  // 在投的排前面，已结束的排后面 —— 多数时候要选的是前者
  const options = [...applications].sort((a, b) => {
    const liveA = LIVE_STATUSES.includes(a.status) ? 0 : 1;
    const liveB = LIVE_STATUSES.includes(b.status) ? 0 : 1;
    return liveA - liveB || a.company.localeCompare(b.company, 'zh-Hans-CN');
  });

  const [appId, setAppId] = useState(options[0]?.id ?? '');
  const [name, setName] = useState('');
  const [when, setWhen] = useState(at);
  const [mode, setMode] = useState<RoundModeId>('video');
  const [location, setLocation] = useState('');

  const target = options.find((a) => a.id === appId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    const round: Round = {
      id: uid(),
      // 没填就按已有轮次数量顺延，省得每次都手打「一面」「二面」
      name: name.trim() || ROUND_PRESETS[Math.min(target.rounds.length, ROUND_PRESETS.length - 1)],
      at: when,
      mode,
      location: location.trim(),
      interviewer: '',
      result: 'pending',
      note: '',
    };
    let next: Application = { ...target, rounds: [...target.rounds, round] };
    if (['wish', 'applied', 'assess'].includes(next.status)) next = advance(next, 'interview');
    onSave(next);
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="quickadd" ref={panel} role="dialog" aria-modal="true" aria-label="新增一场面试">
        <form onSubmit={submit}>
          <div className="quickadd-head">
            <h2>新增一场面试</h2>
            <button type="button" className="drawer-close" aria-label="关闭" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="quickadd-body">
            {options.length === 0 ? (
              <p className="hint">还没有任何投递记录，先建一条再来约面试。</p>
            ) : (
              <div className="grid2">
                <div className="full">
                  <Field label="哪家公司">
                    <select value={appId} onChange={(e) => setAppId(e.target.value)}>
                      {options.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.company || '未命名'}
                          {a.role ? ` · ${a.role}` : ''}（{STATUS_BY_ID[a.status].label}）
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="轮次名称">
                  <input
                    value={name}
                    list="quickadd-round-presets"
                    placeholder={
                      target
                        ? ROUND_PRESETS[Math.min(target.rounds.length, ROUND_PRESETS.length - 1)]
                        : '一面'
                    }
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>

                <Field label="时间">
                  <input
                    type="datetime-local"
                    value={when}
                    required
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </Field>

                <Field label="形式">
                  <select value={mode} onChange={(e) => setMode(e.target.value as RoundModeId)}>
                    {ROUND_MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="地点 / 会议链接">
                  <input
                    value={location}
                    placeholder="选填"
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="quickadd-foot">
            <span className="hint">保存后可在详情里补面试官和记录</span>
            <button type="button" className="btn btn-sm" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!target}>
              保存
            </button>
          </div>
        </form>

        <datalist id="quickadd-round-presets">
          {ROUND_PRESETS.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>
    </>
  );
}
