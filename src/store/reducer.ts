/** 全部状态变更都收在这里，方便审计。reducer 是纯函数。 */

import type { Application, Persisted, StatusId, ThemeId, ViewId } from '../types';

export type Action =
  | { type: 'upsert'; app: Application }
  | { type: 'remove'; id: string }
  | { type: 'restore'; app: Application; index: number }
  | { type: 'advance'; id: string; to: StatusId }
  | { type: 'replaceAll'; apps: Application[] }
  | { type: 'mergeIn'; apps: Application[] }
  | { type: 'setTheme'; theme: ThemeId }
  | { type: 'setView'; view: ViewId };

/** 推进状态：写 reached、写历史、维护 outcome。closed 不进 reached。 */
export function advance(app: Application, to: StatusId): Application {
  if (app.status === to) return app;
  const reached =
    to === 'closed' || app.reached.includes(to) ? app.reached : [...app.reached, to];
  return {
    ...app,
    status: to,
    reached,
    outcome: to === 'closed' ? app.outcome || 'rejected' : '',
    history: [...app.history, { at: Date.now(), from: app.status, to }],
    updatedAt: Date.now(),
  };
}

export function reducer(state: Persisted, action: Action): Persisted {
  switch (action.type) {
    case 'upsert': {
      const app = { ...action.app, updatedAt: Date.now() };
      const i = state.applications.findIndex((a) => a.id === app.id);
      if (i < 0) return { ...state, applications: [app, ...state.applications] };
      const applications = state.applications.slice();
      applications[i] = app;
      return { ...state, applications };
    }

    case 'remove':
      return { ...state, applications: state.applications.filter((a) => a.id !== action.id) };

    case 'restore': {
      const applications = state.applications.slice();
      applications.splice(Math.min(action.index, applications.length), 0, action.app);
      return { ...state, applications };
    }

    case 'advance': {
      const i = state.applications.findIndex((a) => a.id === action.id);
      if (i < 0) return state;
      const next = advance(state.applications[i], action.to);
      if (next === state.applications[i]) return state;
      const applications = state.applications.slice();
      applications[i] = next;
      return { ...state, applications };
    }

    case 'replaceAll':
      return { ...state, applications: action.apps };

    case 'mergeIn': {
      const map = new Map(state.applications.map((a) => [a.id, a]));
      for (const a of action.apps) map.set(a.id, a);
      return { ...state, applications: [...map.values()] };
    }

    case 'setTheme':
      return { ...state, theme: action.theme };

    case 'setView':
      return { ...state, view: action.view };

    default: {
      const never: never = action;
      return never;
    }
  }
}
