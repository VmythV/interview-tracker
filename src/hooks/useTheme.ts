import { useCallback, useEffect, useState } from 'react';

import { useStore } from '../store/StoreContext';

/** 主题默认跟随系统；用户手动切过之后由 data-theme 接管（两个方向都要能压过系统值）。 */
export function useTheme() {
  const { state, dispatch } = useStore();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme) root.dataset.theme = state.theme;
    else delete root.dataset.theme;
  }, [state.theme]);

  const isDark = state.theme ? state.theme === 'dark' : systemDark;
  const toggle = useCallback(
    () => dispatch({ type: 'setTheme', theme: isDark ? 'light' : 'dark' }),
    [dispatch, isDark],
  );

  return { isDark, toggle };
}
