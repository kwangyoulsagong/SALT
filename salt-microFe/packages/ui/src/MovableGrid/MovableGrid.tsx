"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent, ReactNode } from "react";
import { GripVertical } from "lucide-react";
import {
  containerStyles,
  dragHandleStyles,
  dropIndicatorStyles,
  panelBodyStyles,
  panelHeaderStyles,
  panelStyles,
  panelTitleStyles,
  splitterStyles,
} from "./styles/movableGrid.css";
import {
  dropIndicatorRect,
  dropZoneAt,
  layoutRects,
  movePanel,
  panelAt,
  setRatio,
} from "./layoutTree";
import type { DropZone, LayoutNode, PanelRect, Rect } from "./layoutTree";

const RATIO_STEP = 0.02;

export interface MovableGridProps {
  layout: LayoutNode;
  onLayoutChange: (layout: LayoutNode) => void;
  /** 칸 안에 무엇을 그릴지 */
  renderPanel: (id: string) => ReactNode;
  /** 칸 머리말. 여기를 잡아 끌면 칸이 움직인다. */
  renderPanelTitle?: (id: string) => ReactNode;
  /** 칸 머리말 오른쪽 슬롯. 닫기 버튼 같은 것을 넣는다. */
  renderPanelActions?: (id: string) => ReactNode;
  /** 칸 사이 간격 겸 구분선 두께(px) */
  gap?: number;
  className?: string;
}

interface DragState {
  panelId: string;
  target?: PanelRect;
  zone?: DropZone;
}

/**
 * 이진 트리로 화면을 나누는 옮길 수 있는 격자.
 *
 * 칸 머리말을 끌어 다른 칸의 위·아래·왼쪽·오른쪽에 놓으면 그 방향으로 새로 나뉜다.
 * 구분선은 끌어서, 또는 포커스를 주고 화살표 키로 조절한다.
 *
 * 칸을 옮기는 동작은 포인터 전용이다. 키보드만 쓰는 사용자를 위한 이동 수단이
 * 필요하면 `layoutTree`의 `movePanel`을 앱에서 메뉴로 노출한다.
 */
export const MovableGrid = ({
  layout,
  onLayoutChange,
  renderPanel,
  renderPanelTitle,
  renderPanelActions,
  gap = 6,
  className,
}: MovableGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const resizingRef = useRef<string | null>(null);

  // 컨테이너 크기는 렌더 중에 읽으면 SSR에서 깨진다. 마운트 후 관측한다.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const container: Rect = { x: 0, y: 0, ...size };
  const { panels, splitters } = layoutRects(layout, container, gap);

  const toLocalPoint = useCallback((clientX: number, clientY: number) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  }, []);

  // ===== 구분선 끌어서 크기 조절 =====
  const handleSplitterPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    splitId: string
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizingRef.current = splitId;
  };

  const handleSplitterPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    const splitId = resizingRef.current;
    if (!splitId) return;

    const target = splitters.find((item) => item.splitId === splitId);
    if (!target) return;

    const point = toLocalPoint(event.clientX, event.clientY);
    const horizontal = target.orientation === "row";
    const length = horizontal ? target.area.width : target.area.height;
    if (length <= gap) return;

    const offset = horizontal
      ? point.x - target.area.x
      : point.y - target.area.y;

    onLayoutChange(setRatio(layout, splitId, offset / (length - gap)));
  };

  const endResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizingRef.current = null;
  };

  const handleSplitterKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    splitId: string,
    ratio: number
  ) => {
    const decrease = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const increase = event.key === "ArrowRight" || event.key === "ArrowDown";
    if (!decrease && !increase) return;

    event.preventDefault();
    onLayoutChange(
      setRatio(layout, splitId, ratio + (increase ? RATIO_STEP : -RATIO_STEP))
    );
  };

  // ===== 머리말 끌어서 칸 옮기기 =====
  const handleDragPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    panelId: string
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ panelId });
  };

  const handleDragPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (!drag) return;

    const point = toLocalPoint(event.clientX, event.clientY);
    const candidates = panels.filter((rect) => rect.id !== drag.panelId);
    const target = panelAt(candidates, point.x, point.y);

    setDrag({
      panelId: drag.panelId,
      target,
      zone: target ? dropZoneAt(target, point.x, point.y) : undefined,
    });
  };

  const handleDragPointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (drag?.target && drag.zone) {
      onLayoutChange(
        movePanel(layout, drag.panelId, drag.target.id, drag.zone)
      );
    }
    setDrag(null);
  };

  const indicator =
    drag?.target && drag.zone
      ? dropIndicatorRect(drag.target, drag.zone)
      : null;

  return (
    <div ref={containerRef} className={`${containerStyles} ${className || ""}`}>
      {size.width > 0
        ? panels.map((rect) => (
            <div
              key={rect.id}
              className={panelStyles({ dragging: drag?.panelId === rect.id })}
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              }}
            >
              <div className={panelHeaderStyles}>
                <button
                  type="button"
                  className={dragHandleStyles}
                  aria-label={`${rect.id} 칸 옮기기`}
                  onPointerDown={(event) =>
                    handleDragPointerDown(event, rect.id)
                  }
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={handleDragPointerUp}
                  onPointerCancel={handleDragPointerUp}
                >
                  <GripVertical size={14} aria-hidden="true" />
                  <span className={panelTitleStyles}>
                    {renderPanelTitle ? renderPanelTitle(rect.id) : rect.id}
                  </span>
                </button>
                {renderPanelActions ? renderPanelActions(rect.id) : null}
              </div>

              <div className={panelBodyStyles}>{renderPanel(rect.id)}</div>
            </div>
          ))
        : null}

      {size.width > 0
        ? splitters.map((item) => (
            <button
              key={item.splitId}
              type="button"
              role="separator"
              aria-orientation={
                item.orientation === "row" ? "vertical" : "horizontal"
              }
              aria-label="칸 크기 조절"
              aria-valuenow={Math.round(item.ratio * 100)}
              aria-valuemin={8}
              aria-valuemax={92}
              className={splitterStyles({ orientation: item.orientation })}
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
              }}
              onPointerDown={(event) =>
                handleSplitterPointerDown(event, item.splitId)
              }
              onPointerMove={handleSplitterPointerMove}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              onKeyDown={(event) =>
                handleSplitterKeyDown(event, item.splitId, item.ratio)
              }
            />
          ))
        : null}

      {indicator ? (
        <div
          className={dropIndicatorStyles}
          style={{
            left: indicator.x,
            top: indicator.y,
            width: indicator.width,
            height: indicator.height,
          }}
        />
      ) : null}
    </div>
  );
};
