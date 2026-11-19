"use client";

import type { PanelLayoutResult } from "@repo/core/coach";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LayoutNode } from "@repo/ui/layoutTree";

import { coachQueryKeys } from "@/entities/coach";
import type { ApiError } from "@repo/web-shared/api";

import { arrangePanelsApi } from "./arrangePanelsApi";

/**
 * 배치 저장 — 금액이 아닌 표시 설정. 화면은 이미 옮긴 배치를 그리고 있으니(로컬 상태) 실패해도 되돌리지 않는다:
 * 저장은 편의 기능이고 이 화면에서는 그대로 쓴다(`DB-REQ-021` FR-23 · `FE-REQ-030` FR-55). 성공하면 캐시를 그 배치로.
 */
export const useSavePanelLayout = () => {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, LayoutNode>({
    mutationFn: arrangePanelsApi.save,
    retry: 0,
    onSuccess: (_void, tree) => {
      queryClient.setQueryData<PanelLayoutResult>(coachQueryKeys.panelLayout(), {
        tree: tree as unknown as Record<string, unknown>,
        updatedAt: null,
        degraded: false,
      });
    },
  });
};
