"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseLayout, type LayoutNode } from "@repo/ui/layoutTree";

import { usePanelLayout } from "@/entities/coach";

import { useSavePanelLayout } from "../api/useSavePanelLayout";
import { PANEL_LAYOUT_SAVE_DELAY_MS } from "../model/constants";

export interface PanelArrangement {
  layout: LayoutNode;
  /** 저장 배치를 읽는 중 — 읽기 전에 기본 배치를 그렸다가 바뀌어 칸이 뛰지 않게 기다린다 */
  isLoading: boolean;
  /** 사용자가 바꿨다 — 그린 뒤 멈추면 한 번 저장 */
  change: (next: LayoutNode) => void;
  reset: () => void;
}

/**
 * 격자 배치 상태(F006 A절 · `FE-REQ-030` FR-52 · 55). 저장된 배치는 `parseLayout` 이 칸 목록과 맞을 때만 쓴다 —
 * 모르는 칸 · 빠진 칸 · 깨진 모양이면 기본 배치(칸 구성이 바뀐 뒤 옛 저장이 화면을 깨지 않게). 못 읽어도 기본 배치로 돈다.
 *
 * 저장은 **사용자가 바꾼 뒤에만** 멈춘 뒤 한 번 — 불러온 배치 · 기본 배치를 그냥 다시 쓰지 않는다. 화면을 떠나면 남은 저장을 바로 보낸다.
 */
export const usePanelArrangement = (panelIds: readonly string[], defaultLayout: LayoutNode): PanelArrangement => {
  const remote = usePanelLayout();
  const { mutate: save } = useSavePanelLayout();
  const [local, setLocal] = useState<LayoutNode | null>(null);
  const idsKey = panelIds.join("|");
  const restored = useMemo(
    () => (remote.data?.tree ? parseLayout(remote.data.tree, idsKey.split("|")) : null),
    [remote.data, idsKey]
  );

  const pending = useRef<LayoutNode | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const tree = pending.current;
    pending.current = null;
    if (tree) save(tree);
  }, [save]);

  const change = useCallback(
    (next: LayoutNode) => {
      setLocal(next);
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, PANEL_LAYOUT_SAVE_DELAY_MS);
    },
    [flush]
  );

  // 화면을 떠나면 기다리던 저장을 바로 — 옮기고 곧장 다른 메뉴로 가도 남는다
  useEffect(() => flush, [flush]);

  return {
    layout: local ?? restored ?? defaultLayout,
    // 로그아웃이면 부르지 않는다(`fetchStatus` idle) — 페이지 유리막이 덮는다
    isLoading: remote.isPending && remote.fetchStatus !== "idle",
    change,
    reset: useCallback(() => change(defaultLayout), [change, defaultLayout]),
  };
};
