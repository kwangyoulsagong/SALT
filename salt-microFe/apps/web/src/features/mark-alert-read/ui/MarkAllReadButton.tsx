"use client";

import { Button } from "@repo/ui/button";

import { useMarkAllAlertsRead } from "../api";
import { MARK_ALERT_READ_MESSAGES as MESSAGES } from "../model";

interface MarkAllReadButtonProps {
  /** 안 읽은 것이 있나 — 없으면 비활성(`FE-REQ-030` FR-112). 목록 캐시 값을 위젯이 넘긴다 */
  hasUnread: boolean;
}

/**
 * [모두 읽음] — 주 버튼이 아니다(화면 주 동작은 목록 행). 채운 보라 버튼을 정보 영역에 두지 않는다(`screen-desktop.md` §5) —
 * 글자 버튼(`ghost`). 2026-11-18 실화면에서 `secondary` 가 큰 보라 면으로 그려져 바꿨다.
 */
export const MarkAllReadButton = ({ hasUnread }: MarkAllReadButtonProps) => {
  const markAll = useMarkAllAlertsRead();
  return (
    <div>
      <Button size="sm" variant="ghost" disabled={!hasUnread || markAll.isPending} onClick={() => markAll.mutate()}>
        {MESSAGES.markAll}
      </Button>
      {markAll.isError ? <p role="status">{MESSAGES.markAllFailed}</p> : null}
    </div>
  );
};
