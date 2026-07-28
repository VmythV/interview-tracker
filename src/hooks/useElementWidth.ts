import { useLayoutEffect, useRef, useState } from 'react';

/** 量出容器实际宽度，SVG 的 viewBox 才能 1:1 贴合 —— 否则整张图连字一起被缩放。 */
export function useElementWidth<T extends HTMLElement>(fallback = 720) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
