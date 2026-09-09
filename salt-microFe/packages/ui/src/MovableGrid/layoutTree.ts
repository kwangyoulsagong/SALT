/**
 * 화면을 겹침도 빈틈도 없이 나누는 레이아웃 트리.
 *
 * 사각형을 두 조각으로 계속 쪼개는 이진 트리다.
 * 잎(`panel`)은 실제로 보이는 칸이고, 가지(`split`)는 나눔 자체를 뜻한다.
 * 크기 조절은 해당 `split`의 `ratio` 하나만 바꾸면 되고,
 * 칸을 옮기는 것은 "떼어내고 → 빈 가지를 접고 → 목표 옆에 새 가지를 만들어 끼우기"다.
 */

/** `row`는 좌우로 나눈다(세로 구분선). `column`은 위아래로 나눈다(가로 구분선). */
export type SplitOrientation = "row" | "column";

export interface PanelNode {
  type: "panel";
  id: string;
}

export interface SplitNode {
  type: "split";
  id: string;
  orientation: SplitOrientation;
  /** `first`가 차지하는 비율. 0~1 */
  ratio: number;
  first: LayoutNode;
  second: LayoutNode;
}

export type LayoutNode = PanelNode | SplitNode;

/** 끌어다 놓을 때 목표 칸의 어느 쪽에 붙일지. */
export type DropZone = "top" | "bottom" | "left" | "right";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelRect extends Rect {
  id: string;
}

export interface SplitterRect extends Rect {
  /** 이 구분선이 조절하는 `split`의 id */
  splitId: string;
  orientation: SplitOrientation;
  ratio: number;
  /** 구분선이 나누고 있는 전체 영역. ratio를 다시 계산할 때 쓴다. */
  area: Rect;
}

export interface LayoutRects {
  panels: PanelRect[];
  splitters: SplitterRect[];
}

export const MIN_RATIO = 0.08;
export const MAX_RATIO = 0.92;

const clampRatio = (ratio: number) =>
  Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));

let sequence = 0;

const nextSplitId = () => {
  sequence += 1;
  return `split-${sequence}`;
};

export const panel = (id: string): PanelNode => ({ type: "panel", id });

export const split = (
  orientation: SplitOrientation,
  first: LayoutNode,
  second: LayoutNode,
  ratio = 0.5,
  id?: string
): SplitNode => ({
  type: "split",
  id: id ?? nextSplitId(),
  orientation,
  ratio: clampRatio(ratio),
  first,
  second,
});

export const isPanel = (node: LayoutNode): node is PanelNode =>
  node.type === "panel";

/** 트리에 있는 칸 id를 왼쪽·위쪽부터 순서대로 모은다. */
export const collectPanelIds = (node: LayoutNode): string[] =>
  isPanel(node)
    ? [node.id]
    : [...collectPanelIds(node.first), ...collectPanelIds(node.second)];

export const hasPanel = (node: LayoutNode, id: string): boolean =>
  collectPanelIds(node).includes(id);

/**
 * 칸을 떼어낸다.
 * 가지에서 한쪽이 없어지면 그 가지는 남은 쪽으로 대체된다(접힘).
 * 마지막 칸까지 떼어내면 `null`이다.
 */
export const removePanel = (
  node: LayoutNode,
  id: string
): LayoutNode | null => {
  if (isPanel(node)) {
    return node.id === id ? null : node;
  }

  const first = removePanel(node.first, id);
  const second = removePanel(node.second, id);

  if (!first) return second;
  if (!second) return first;
  if (first === node.first && second === node.second) return node;

  return { ...node, first, second };
};

/** 목표 칸을 새 가지로 바꿔서 그 옆에 칸을 끼운다. */
export const insertPanel = (
  node: LayoutNode,
  targetPanelId: string,
  newPanelId: string,
  zone: DropZone,
  ratio = 0.5
): LayoutNode => {
  if (isPanel(node)) {
    if (node.id !== targetPanelId) return node;

    const incoming = panel(newPanelId);
    const orientation: SplitOrientation =
      zone === "left" || zone === "right" ? "row" : "column";
    const incomingFirst = zone === "left" || zone === "top";

    return incomingFirst
      ? split(orientation, incoming, node, ratio)
      : split(orientation, node, incoming, 1 - ratio);
  }

  const first = insertPanel(node.first, targetPanelId, newPanelId, zone, ratio);
  const second = insertPanel(
    node.second,
    targetPanelId,
    newPanelId,
    zone,
    ratio
  );

  if (first === node.first && second === node.second) return node;
  return { ...node, first, second };
};

/**
 * 칸을 다른 칸 옆으로 옮긴다.
 * 자기 자신에게 놓거나 목표가 사라지면 원래 트리를 그대로 돌려준다.
 */
export const movePanel = (
  node: LayoutNode,
  panelId: string,
  targetPanelId: string,
  zone: DropZone
): LayoutNode => {
  if (panelId === targetPanelId) return node;
  if (!hasPanel(node, panelId) || !hasPanel(node, targetPanelId)) return node;

  const detached = removePanel(node, panelId);
  if (!detached) return node;
  // 떼어내면서 목표 칸이 접혀 사라졌다면 되돌린다.
  if (!hasPanel(detached, targetPanelId)) return node;

  return insertPanel(detached, targetPanelId, panelId, zone);
};

/** 구분선 하나의 비율만 바꾼다. */
export const setRatio = (
  node: LayoutNode,
  splitId: string,
  ratio: number
): LayoutNode => {
  if (isPanel(node)) return node;

  if (node.id === splitId) {
    return { ...node, ratio: clampRatio(ratio) };
  }

  const first = setRatio(node.first, splitId, ratio);
  const second = setRatio(node.second, splitId, ratio);

  if (first === node.first && second === node.second) return node;
  return { ...node, first, second };
};

/**
 * 트리를 좌표로 바꾼다.
 * `gap`은 칸 사이 간격이고, 구분선은 그 간격 위에 놓인다.
 */
export const layoutRects = (
  node: LayoutNode,
  container: Rect,
  gap = 6
): LayoutRects => {
  const panels: PanelRect[] = [];
  const splitters: SplitterRect[] = [];

  const walk = (current: LayoutNode, area: Rect) => {
    if (isPanel(current)) {
      panels.push({ id: current.id, ...area });
      return;
    }

    const horizontal = current.orientation === "row";
    const length = horizontal ? area.width : area.height;
    const usable = Math.max(0, length - gap);
    const firstLength = usable * current.ratio;
    const secondLength = usable - firstLength;

    if (horizontal) {
      walk(current.first, { ...area, width: firstLength });
      walk(current.second, {
        ...area,
        x: area.x + firstLength + gap,
        width: secondLength,
      });
      splitters.push({
        splitId: current.id,
        orientation: current.orientation,
        ratio: current.ratio,
        area,
        x: area.x + firstLength,
        y: area.y,
        width: gap,
        height: area.height,
      });
      return;
    }

    walk(current.first, { ...area, height: firstLength });
    walk(current.second, {
      ...area,
      y: area.y + firstLength + gap,
      height: secondLength,
    });
    splitters.push({
      splitId: current.id,
      orientation: current.orientation,
      ratio: current.ratio,
      area,
      x: area.x,
      y: area.y + firstLength,
      width: area.width,
      height: gap,
    });
  };

  walk(node, container);
  return { panels, splitters };
};

/**
 * 칸 안에서 커서가 어느 삼각형 구역에 있는지 판정한다.
 * 사각형을 두 대각선으로 넷으로 자르고, 커서가 속한 삼각형이 붙일 방향이다.
 */
export const dropZoneAt = (
  rect: Rect,
  pointerX: number,
  pointerY: number
): DropZone => {
  const nx = rect.width === 0 ? 0.5 : (pointerX - rect.x) / rect.width;
  const ny = rect.height === 0 ? 0.5 : (pointerY - rect.y) / rect.height;

  // 대각선 y=x 위쪽이면서 y=1-x 위쪽 → 위 삼각형
  if (ny < nx && ny < 1 - nx) return "top";
  if (ny > nx && ny > 1 - nx) return "bottom";
  return nx < 0.5 ? "left" : "right";
};

/** 좌표가 어떤 칸 위에 있는지 찾는다. */
export const panelAt = (
  panelRects: PanelRect[],
  pointerX: number,
  pointerY: number
): PanelRect | undefined =>
  panelRects.find(
    (rect) =>
      pointerX >= rect.x &&
      pointerX <= rect.x + rect.width &&
      pointerY >= rect.y &&
      pointerY <= rect.y + rect.height
  );

/** 드롭 표시를 그릴 사각형. 목표 칸의 절반이다. */
export const dropIndicatorRect = (rect: PanelRect, zone: DropZone): Rect => {
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;

  switch (zone) {
    case "left":
      return { x: rect.x, y: rect.y, width: halfWidth, height: rect.height };
    case "right":
      return {
        x: rect.x + halfWidth,
        y: rect.y,
        width: halfWidth,
        height: rect.height,
      };
    case "top":
      return { x: rect.x, y: rect.y, width: rect.width, height: halfHeight };
    case "bottom":
    default:
      return {
        x: rect.x,
        y: rect.y + halfHeight,
        width: rect.width,
        height: halfHeight,
      };
  }
};
