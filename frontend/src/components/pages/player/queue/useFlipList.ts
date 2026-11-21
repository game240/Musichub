import { useRef, useLayoutEffect } from 'react';

export interface UseFlipListOptions {
  duration?: number;
  easing?: string;
}

export function useFlipList<T extends HTMLElement = HTMLDivElement>(
  itemKeys: (string | number)[],
  options: UseFlipListOptions = {},
) {
  const { duration = 350, easing = 'cubic-bezier(0.2, 0.8, 0.2, 1)' } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string | number, T>>(new Map());
  const prevTopsRef = useRef<Map<string | number, number>>(new Map());

  // String signature to ensure layout effect only runs when item order actually changes
  const keysSignature = itemKeys.join(',');

  const registerItemRef = (key: string | number) => (el: T | null) => {
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  };

  useLayoutEffect(() => {
    // Respect user's motion preferences
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const nextTops = new Map<string | number, number>();
      itemRefs.current.forEach((el, key) => {
        nextTops.set(key, el.offsetTop);
      });
      prevTopsRef.current = nextTops;
      return;
    }

    const prevTops = prevTopsRef.current;
    const currentTops = new Map<string | number, number>();

    // Step 1: Record all current offsetTop layout positions
    itemRefs.current.forEach((el, key) => {
      currentTops.set(key, el.offsetTop);
    });

    // Step 2: Invert and Play for elements whose positions changed
    itemRefs.current.forEach((el, key) => {
      const prevTop = prevTops.get(key);
      const currentTop = currentTops.get(key);

      if (prevTop !== undefined && currentTop !== undefined) {
        const deltaY = prevTop - currentTop;
        if (Math.abs(deltaY) > 1) {
          // Invert: snap immediately to previous layout position
          el.style.transform = `translateY(${deltaY}px)`;
          el.style.transition = 'none';

          // Play: trigger hardware-accelerated transition to target position
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.transition = `transform ${duration}ms ${easing}`;
              el.style.transform = 'translateY(0)';
            });
          });

          // Clean up inline styles upon transition completion
          const handleTransitionEnd = (e: TransitionEvent) => {
            if (e.target === el && e.propertyName === 'transform') {
              el.style.transition = '';
              el.style.transform = '';
              el.removeEventListener('transitionend', handleTransitionEnd);
            }
          };
          el.addEventListener('transitionend', handleTransitionEnd);
        }
      }
    });

    // Step 3: Cache current positions for next reorder
    prevTopsRef.current = currentTops;
  }, [keysSignature, duration, easing]);

  return {
    containerRef,
    registerItemRef,
  };
}
