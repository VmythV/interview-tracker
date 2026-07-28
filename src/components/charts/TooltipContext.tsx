import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** tooltip 一行：值在前、名字在后 —— 读者已经知道系列，想要的是数字 */
export interface TipRow {
  tone: string;
  name: string;
  value: string;
}

export interface TipContent {
  title: string;
  rows: TipRow[];
}

interface TooltipApi {
  show: (content: TipContent, e: { clientX: number; clientY: number }) => void;
  move: (e: { clientX: number; clientY: number }) => void;
  hide: () => void;
}

const TooltipContext = createContext<TooltipApi | null>(null);

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<TipContent | null>(null);
  const pos = useRef({ x: 0, y: 0 });
  const el = useRef<HTMLDivElement | null>(null);

  const place = useCallback(() => {
    const node = el.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    let x = pos.current.x + 14;
    let y = pos.current.y + 14;
    if (x + box.width > window.innerWidth - 8) x = pos.current.x - box.width - 14;
    if (y + box.height > window.innerHeight - 8) y = pos.current.y - box.height - 14;
    node.style.left = `${Math.max(8, x)}px`;
    node.style.top = `${Math.max(8, y)}px`;
  }, []);

  const api = useMemo<TooltipApi>(
    () => ({
      show: (next, e) => {
        pos.current = { x: e.clientX, y: e.clientY };
        setContent(next);
      },
      move: (e) => {
        pos.current = { x: e.clientX, y: e.clientY };
        place();
      },
      hide: () => setContent(null),
    }),
    [place],
  );

  // 内容变了要在绘制前重新定位，否则会看到 tooltip 从旧位置跳过来
  useLayoutEffect(place, [content, place]);

  return (
    <TooltipContext.Provider value={api}>
      {children}
      {content && (
        <div className="tip" ref={el} role="status">
          <div className="tip-title">{content.title}</div>
          {content.rows.map((r) => (
            <div className="tip-row" key={r.name} style={{ ['--tone' as string]: r.tone }}>
              <span className="tip-key" />
              <span className="tip-val">{r.value}</span>
              <span className="tip-name">{r.name}</span>
            </div>
          ))}
        </div>
      )}
    </TooltipContext.Provider>
  );
}

export function useTooltip(): TooltipApi {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error('useTooltip 必须在 <TooltipProvider> 内部使用');
  return ctx;
}

/** 挂到任意元素上，让它带一个悬停/聚焦 tooltip */
export function useTipHandlers(content: TipContent) {
  const tip = useTooltip();
  return useMemo(
    () => ({
      onPointerEnter: (e: React.PointerEvent) => tip.show(content, e),
      onPointerMove: (e: React.PointerEvent) => tip.move(e),
      onPointerLeave: () => tip.hide(),
      onFocus: (e: React.FocusEvent<HTMLElement>) => {
        const box = e.currentTarget.getBoundingClientRect();
        tip.show(content, { clientX: box.left + box.width / 2, clientY: box.bottom });
      },
      onBlur: () => tip.hide(),
    }),
    [content, tip],
  );
}
