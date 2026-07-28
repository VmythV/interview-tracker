import { useEffect } from 'react';

interface Options {
  /** 抽屉打开时全局快捷键要让路，否则会在编辑途中又弹出一条新记录 */
  enabled: boolean;
  onNew: () => void;
  onSearch: () => void;
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);

export function useHotkeys({ enabled, onNew, onSearch }: Options) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // 输入法组字过程中不要抢键
      if (e.isComposing || e.keyCode === 229) return;
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNew();
      } else if (e.key === '/') {
        e.preventDefault();
        onSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onNew, onSearch]);
}
