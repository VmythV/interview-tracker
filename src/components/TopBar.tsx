import { useRef } from 'react';

import { useTheme } from '../hooks/useTheme';
import { parseImport } from '../lib/backup';
import { useStore } from '../store/StoreContext';
import { useToast } from '../store/ToastContext';

export function TopBar({ onNew, onExport }: { onNew: () => void; onExport: () => void }) {
  const { state, dispatch } = useStore();
  const { isDark, toggle } = useTheme();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function importJson(file: File) {
    try {
      const apps = parseImport(await file.text());
      if (state.applications.length === 0) {
        dispatch({ type: 'replaceAll', apps });
      } else {
        const replace = window.confirm(
          `导入 ${apps.length} 条。\n\n确定 = 替换现有 ${state.applications.length} 条\n取消 = 合并（同 id 覆盖）`,
        );
        dispatch(replace ? { type: 'replaceAll', apps } : { type: 'mergeIn', apps });
      }
      toast.push(`导入完成，共 ${apps.length} 条`);
    } catch (err) {
      console.warn('[面试追踪] 导入失败', err);
      toast.push('导入失败：不是有效的记录文件');
    }
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <h1>面试追踪</h1>
          <p className="brand-sub">数据仅保存在这台设备的浏览器中</p>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileInput.current?.click()}
          title="从 JSON 文件导入"
        >
          导入
        </button>
        <button type="button" className="btn btn-ghost" onClick={onExport} title="导出为 JSON 文件">
          导出
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={toggle}
          title={isDark ? '切换到浅色' : '切换到深色'}
          aria-label={isDark ? '切换到浅色' : '切换到深色'}
        >
          <span aria-hidden="true">{isDark ? '☾' : '☀'}</span>
        </button>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          ＋ 新建投递 <kbd>N</kbd>
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importJson(file);
          e.target.value = '';
        }}
      />
    </header>
  );
}
