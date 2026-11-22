import { useState, useRef, useCallback, useEffect } from 'react';

export type DropPosition = 'before' | 'after';

export interface DropTarget {
  index: number;
  position: DropPosition;
}

export function calculateTargetIndex(
  fromIndex: number,
  overIndex: number,
  position: DropPosition,
): number {
  if (fromIndex === overIndex) return fromIndex;

  if (fromIndex < overIndex) {
    // Dragging downward
    return position === 'after' ? overIndex : overIndex - 1;
  } else {
    // Dragging upward
    return position === 'after' ? overIndex + 1 : overIndex;
  }
}

export interface UseQueueDragAndDropOptions {
  onReorder: (fromIndex: number, toIndex: number) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function useQueueDragAndDrop({ onReorder, containerRef }: UseQueueDragAndDropOptions) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const touchDraggingRef = useRef<{ index: number } | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);

  // Keep dropTargetRef in sync for touch callbacks safely in effect
  useEffect(() => {
    dropTargetRef.current = dropTarget;
  }, [dropTarget]);

  // Desktop HTML5 DnD Handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggingIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: DropPosition = e.clientY > midY ? 'after' : 'before';

    setDropTarget((prev) => {
      if (prev?.index === index && prev?.position === position) {
        return prev;
      }
      return { index, position };
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();

      if (draggingIndex !== null) {
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position: DropPosition = e.clientY > midY ? 'after' : 'before';

        const targetIndex = calculateTargetIndex(draggingIndex, index, position);
        if (targetIndex !== draggingIndex) {
          onReorder(draggingIndex, targetIndex);
        }
      }

      setDraggingIndex(null);
      setDropTarget(null);
    },
    [draggingIndex, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
    setDropTarget(null);
  }, []);

  // Mobile Touch Handlers
  const handleTouchStart = useCallback((_e: React.TouchEvent, index: number) => {
    touchDraggingRef.current = { index };
    setDraggingIndex(index);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchDraggingRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;

      // Auto-scroll container when dragging near edges
      if (containerRef?.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const edgeThreshold = 45;
        if (touch.clientY < containerRect.top + edgeThreshold) {
          containerRef.current.scrollTop -= 6;
        } else if (touch.clientY > containerRect.bottom - edgeThreshold) {
          containerRef.current.scrollTop += 6;
        }
      }

      // Identify track element under finger
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const rowEl = targetEl?.closest<HTMLElement>('[data-track-index]');
      if (rowEl) {
        const idxAttr = rowEl.getAttribute('data-track-index');
        if (idxAttr !== null) {
          const overIdx = parseInt(idxAttr, 10);
          const rect = rowEl.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const position: DropPosition = touch.clientY > midY ? 'after' : 'before';

          setDropTarget((prev) => {
            if (prev?.index === overIdx && prev?.position === position) {
              return prev;
            }
            return { index: overIdx, position };
          });
        }
      }
    },
    [containerRef],
  );

  const handleTouchEnd = useCallback(() => {
    const dragging = touchDraggingRef.current;
    const target = dropTargetRef.current;

    if (dragging && target) {
      const targetIndex = calculateTargetIndex(dragging.index, target.index, target.position);
      if (targetIndex !== dragging.index) {
        onReorder(dragging.index, targetIndex);
      }
    }

    touchDraggingRef.current = null;
    setDraggingIndex(null);
    setDropTarget(null);
  }, [onReorder]);

  return {
    draggingIndex,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
