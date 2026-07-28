import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import { loadState, saveState } from '../lib/storage';
import type { Persisted } from '../types';
import { reducer, type Action } from './reducer';

interface StoreValue {
  state: Persisted;
  dispatch: React.Dispatch<Action>;
  /** 本地写入是否正常。隐私模式或配额满时为 false —— 这是纯本地应用，
   *  写不进去等于改动会丢，必须让用户看见，不能静默失败。 */
  persistOk: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // 惰性初始化：只在首次挂载时读一次 localStorage
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [persistOk, setPersistOk] = useState(true);

  useEffect(() => {
    const ok = saveState(state);
    setPersistOk((prev) => (prev === ok ? prev : ok));
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, persistOk }), [state, persistOk]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore 必须在 <StoreProvider> 内部使用');
  return ctx;
}
