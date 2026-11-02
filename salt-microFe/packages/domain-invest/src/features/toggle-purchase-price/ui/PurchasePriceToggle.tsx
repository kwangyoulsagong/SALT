"use client";

import { StatusLine } from "@repo/ui/statusLine";
import { Toggle } from "@repo/ui/toggle";

import { useCoachProfile } from "@/entities/coach";

import { useTogglePurchasePrice } from "../api";
import { TOGGLE_PURCHASE_PRICE_MESSAGES as MSG } from "../model";
import { block, hint } from "./PurchasePriceToggle.css";

/**
 * 매입가 숨김 토글 (F009 FR-27 · `FE-REQ-039` FR-13). 상태는 서버 설정이다 — 기기를 바꿔도 같다.
 *
 * 값이 오기 전에는 그리지 않는다 — 꺼진 채로 그렸다가 켜짐으로 뒤집히면 잘못 읽힌다.
 * 로그인 전이면 없다(패널이 이미 로그인 안내를 한다).
 */
export const PurchasePriceToggle = () => {
  const profile = useCoachProfile();
  const toggle = useTogglePurchasePrice();

  if (profile.isSignedOut || profile.isPending) return null;
  if (profile.isError) return <StatusLine kind="error">{MSG.unavailable}</StatusLine>;

  return (
    <div className={block}>
      <Toggle
        label={MSG.label}
        checked={profile.data.hidePurchasePrice}
        // 저장 중에는 입력만 무시한다 — `disabled` 로 바꾸면 버튼에서 키보드 포커스가 빠진다
        onChange={(next) => {
          if (!toggle.isPending) toggle.mutate(next);
        }}
        aria-busy={toggle.isPending}
      />
      <p className={hint}>{MSG.description}</p>
      {toggle.isError && <StatusLine kind="error">{MSG.failed}</StatusLine>}
    </div>
  );
};
