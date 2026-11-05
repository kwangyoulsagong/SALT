"use client";

import { Toggle } from "@repo/ui/toggle";

import { SHARE_STORY_MESSAGES as M } from "../model";

/** 금액 보이기 — 꺼진 채 시작한다(공유 시 금액 가림 기본, FEATURE-013 FR-21). 값은 페이지가 쥔다(카드 · 이미지가 같이 쓴다) */
export const AmountToggle = ({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) => (
  <Toggle checked={checked} onChange={onChange} label={M.showAmounts} />
);
