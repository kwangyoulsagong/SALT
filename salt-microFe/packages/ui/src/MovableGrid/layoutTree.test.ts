import { describe, expect, it } from "vitest";
import {
  collectPanelIds,
  dropIndicatorRect,
  dropZoneAt,
  insertPanel,
  layoutRects,
  movePanel,
  panel,
  panelAt,
  removePanel,
  setRatio,
  split,
} from "./layoutTree";
import type { SplitNode } from "./layoutTree";

/** [chart | (book / trades)] */
const makeTree = () =>
  split(
    "row",
    panel("chart"),
    split("column", panel("book"), panel("trades")),
    0.6
  );

describe("layoutRects", () => {
  it("칸을 겹침도 빈틈도 없이 배치한다", () => {
    const { panels } = layoutRects(
      makeTree(),
      { x: 0, y: 0, width: 1000, height: 600 },
      6
    );

    const chart = panels.find((item) => item.id === "chart");
    const book = panels.find((item) => item.id === "book");
    const trades = panels.find((item) => item.id === "trades");

    expect(chart).toBeDefined();
    expect(book).toBeDefined();
    expect(trades).toBeDefined();
    if (!chart || !book || !trades) return;

    // 간격 6px을 뺀 나머지를 ratio로 나눈다
    expect(chart.width).toBeCloseTo(994 * 0.6);
    expect(chart.width + 6 + book.width).toBeCloseTo(1000);
    expect(book.height + 6 + trades.height).toBeCloseTo(600);
    expect(chart.x + chart.width).toBeLessThanOrEqual(book.x);
  });

  it("split마다 구분선 하나를 만든다", () => {
    const { splitters } = layoutRects(makeTree(), {
      x: 0,
      y: 0,
      width: 800,
      height: 400,
    });

    expect(splitters).toHaveLength(2);
    expect(splitters.map((item) => item.orientation).sort()).toEqual([
      "column",
      "row",
    ]);
  });
});

describe("removePanel", () => {
  it("한쪽이 비면 가지를 남은 쪽으로 접는다", () => {
    const removed = removePanel(makeTree(), "book");

    expect(removed).not.toBeNull();
    expect(collectPanelIds(removed!)).toEqual(["chart", "trades"]);
    expect((removed as SplitNode).second.type).toBe("panel");
  });

  it("마지막 칸을 지우면 null이다", () => {
    expect(removePanel(panel("only"), "only")).toBeNull();
  });

  it("없는 id면 트리를 그대로 돌려준다", () => {
    const tree = makeTree();
    expect(removePanel(tree, "nope")).toBe(tree);
  });
});

describe("insertPanel", () => {
  it("top이면 세로로 나누고 새 칸이 앞에 온다", () => {
    const inserted = insertPanel(makeTree(), "chart", "news", "top");
    const branch = (inserted as SplitNode).first as SplitNode;

    expect(collectPanelIds(inserted)).toHaveLength(4);
    expect(branch.type).toBe("split");
    expect(branch.orientation).toBe("column");
    expect(collectPanelIds(branch)).toEqual(["news", "chart"]);
  });

  it("right이면 가로로 나누고 새 칸이 뒤에 온다", () => {
    const inserted = insertPanel(makeTree(), "chart", "news", "right");
    const branch = (inserted as SplitNode).first as SplitNode;

    expect(branch.orientation).toBe("row");
    expect(collectPanelIds(branch)).toEqual(["chart", "news"]);
  });
});

describe("movePanel", () => {
  it("칸을 다른 칸 옆으로 옮긴다", () => {
    const moved = movePanel(makeTree(), "trades", "chart", "left");

    expect(collectPanelIds(moved)).toHaveLength(3);
    expect(collectPanelIds(moved)[0]).toBe("trades");
  });

  it("칸이 2개면 자리를 바꾼다", () => {
    const two = split("row", panel("a"), panel("b"));

    expect(collectPanelIds(movePanel(two, "a", "b", "right"))).toEqual([
      "b",
      "a",
    ]);
  });

  it("칸이 2개여도 방향은 바뀐다", () => {
    const two = split("row", panel("a"), panel("b"));
    const moved = movePanel(two, "a", "b", "top") as SplitNode;

    expect(moved.orientation).toBe("column");
    expect(collectPanelIds(moved)).toEqual(["a", "b"]);
  });

  it("자기 자신이나 없는 목표로는 움직이지 않는다", () => {
    const tree = makeTree();

    expect(movePanel(tree, "chart", "chart", "left")).toBe(tree);
    expect(movePanel(tree, "chart", "nope", "left")).toBe(tree);
    expect(movePanel(tree, "nope", "chart", "left")).toBe(tree);
  });
});

describe("setRatio", () => {
  it("비율을 0.08~0.92로 자른다", () => {
    const tree = makeTree();

    expect((setRatio(tree, tree.id, 5) as SplitNode).ratio).toBe(0.92);
    expect((setRatio(tree, tree.id, -5) as SplitNode).ratio).toBe(0.08);
  });

  it("해당 split만 바꾸고 나머지는 그대로 둔다", () => {
    const tree = makeTree();
    const next = setRatio(tree, tree.id, 0.3) as SplitNode;

    expect(next.ratio).toBe(0.3);
    expect(next.second).toBe(tree.second);
  });
});

describe("dropZoneAt", () => {
  const rect = { x: 0, y: 0, width: 100, height: 100 };

  it("네 삼각형 구역으로 나눈다", () => {
    expect(dropZoneAt(rect, 50, 10)).toBe("top");
    expect(dropZoneAt(rect, 50, 90)).toBe("bottom");
    expect(dropZoneAt(rect, 10, 50)).toBe("left");
    expect(dropZoneAt(rect, 90, 50)).toBe("right");
  });

  it("칸의 좌상단 좌표를 반영한다", () => {
    const offset = { x: 200, y: 100, width: 100, height: 100 };
    expect(dropZoneAt(offset, 250, 110)).toBe("top");
    expect(dropZoneAt(offset, 210, 150)).toBe("left");
  });
});

describe("panelAt / dropIndicatorRect", () => {
  it("좌표 위의 칸을 찾는다", () => {
    const { panels } = layoutRects(makeTree(), {
      x: 0,
      y: 0,
      width: 1000,
      height: 600,
    });

    expect(panelAt(panels, 5, 5)?.id).toBe("chart");
    expect(panelAt(panels, 5000, 5000)).toBeUndefined();
  });

  it("드롭 표시는 목표 칸의 절반이다", () => {
    const rect = { id: "chart", x: 0, y: 0, width: 200, height: 100 };

    expect(dropIndicatorRect(rect, "right")).toEqual({
      x: 100,
      y: 0,
      width: 100,
      height: 100,
    });
    expect(dropIndicatorRect(rect, "bottom")).toEqual({
      x: 0,
      y: 50,
      width: 200,
      height: 50,
    });
  });
});
