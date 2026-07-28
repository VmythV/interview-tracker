import { useEffect, useRef, type RefObject } from 'react';

interface Options {
  /** 攒够这么多滚动量才走一步。一格标准鼠标滚轮约 100–120 */
  threshold?: number;
  /**
   * 走一步之后的冷却。
   *
   * 步长大（比如一次翻一个月）时需要它，否则触控板一次惯性滑动会连翻十几页；
   * 步长小（一次一周）时应设为 0 —— 连续走很多步正是「滚动」该有的手感，
   * 加冷却反而变成一顿一顿的。
   */
  cooldownMs?: number;
}

/**
 * 让容器支持「滚轮上下翻页」。
 *
 * 只在这个容器上生效，容器之外（工具栏、图例等）滚轮照常滚页面，
 * 免得整页被卡住滚不动。ctrl/⌘ + 滚轮是浏览器缩放，必须放行。
 */
export function useWheelPager(
  ref: RefObject<HTMLElement | null>,
  onStep: (direction: 1 | -1) => void,
  { threshold = 110, cooldownMs = 0 }: Options = {},
) {
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let accumulated = 0;
    let lockedUntil = 0;

    const onWheel = (e: WheelEvent) => {
      // 浏览器缩放手势，交还给浏览器
      if (e.ctrlKey || e.metaKey) return;
      // 横向手势（触控板左右滑）不属于翻页，放行
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();

      const now = performance.now();
      if (cooldownMs > 0 && now < lockedUntil) {
        // 冷却期内把惯性余量丢掉，否则冷却一结束就立刻又走一步
        accumulated = 0;
        return;
      }

      accumulated += e.deltaY;
      if (Math.abs(accumulated) < threshold) return;

      stepRef.current(accumulated > 0 ? 1 : -1);
      accumulated = 0;
      lockedUntil = now + cooldownMs;
    };

    // 要 preventDefault 就不能是 passive
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [ref, threshold, cooldownMs]);
}
