"use client";

import { useRolledNumber } from "../Motion/useRolledNumber";
import { formatAmount, parseAmount, type ParsedAmount } from "./parseAmount";

export interface RolledTextProps {
  /** 이미 포맷된 금액 글자(서버 · BFF 값). 숫자로 시작하지 않으면 그대로 보인다 */
  text: string;
}

const Rolled = ({ parsed }: { parsed: ParsedAmount }) => {
  const shown = useRolledNumber(parsed.value);
  return <>{formatAmount(parsed, shown)}</>;
};

/**
 * 요약 숫자 굴림 (FE-REQ-062 FR-5) — 주인공 금액 글자가 **바뀔 때만** 이전 값에서 굴러간다. 첫 렌더는 글자 그대로라 서버 HTML 과 같다.
 * 글자 → 숫자 → 같은 모양 글자로만 바꾼다(계산 0 · 도착값은 받은 글자 그대로). 가격 · 등락률에는 쓰지 않는다(`motion.md` §5).
 * 굴림은 `duration.base`(0.24초) 한 번이고 알림 영역(`aria-live`)이 아니라 스크린리더가 중간값을 받아 읽지 않는다.
 */
export const RolledText = ({ text }: RolledTextProps) => {
  const parsed = parseAmount(text);
  return parsed ? <Rolled parsed={parsed} /> : <>{text}</>;
};
