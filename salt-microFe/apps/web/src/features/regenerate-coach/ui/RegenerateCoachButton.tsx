"use client";

import { Button } from "@repo/ui/button";

import { useRegenerateCoach } from "../api";
import { REGENERATE_COACH_MESSAGES as MESSAGES } from "../model";
import { hint, wrap } from "./RegenerateCoach.css";

const SECONDS_PER_MINUTE = 60;

/**
 * [새로 생성] (`FE-REQ-026` FR-73~76).
 *
 * - 쿨다운 중이면 **비활성 + 남은 시간**(FR-74). 429 를 받아도 같은 모양이다 — 오류가 아니다(FR-76)
 * - 생성 중이면 `loading` 이다. 버튼은 흐려지지 않는다 — `Button` 이 회전 표시를 얹을 뿐 색을
 *   빼지 않는다(FR-75)
 * - 결과 문구는 **한 번만** 알린다(`role="status"`). 남은 초는 낭독 대상이 아니다 — 매초 읽힌다
 */
export const RegenerateCoachButton = () => {
  const { regenerate, isGenerating, remainingSeconds, notice, isSignedOut } =
    useRegenerateCoach();

  if (isSignedOut) return null;

  const coolingDown = remainingSeconds > 0 && !isGenerating;
  const noticeText = notice ? MESSAGES[notice] : null;

  return (
    <div className={wrap}>
      <Button
        size="sm"
        variant="secondary"
        loading={isGenerating}
        disabled={coolingDown}
        onClick={regenerate}
      >
        {MESSAGES.button}
      </Button>
      {coolingDown && (
        <p className={hint}>
          {MESSAGES.cooldown(
            Math.floor(remainingSeconds / SECONDS_PER_MINUTE),
            remainingSeconds % SECONDS_PER_MINUTE,
          )}
        </p>
      )}
      <p className={hint} role="status">
        {isGenerating ? MESSAGES.generating : noticeText}
      </p>
    </div>
  );
};

export default RegenerateCoachButton;
