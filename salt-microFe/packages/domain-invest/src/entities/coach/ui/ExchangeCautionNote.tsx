import type { ExchangeFlag } from "@repo/core/coach";

import { COACH_MESSAGES } from "../model";
import { exchangeLine } from "./CoachBlock.css";

interface ExchangeCautionNoteProps {
  flag: ExchangeFlag | null;
}

/**
 * 거래소 투자주의 한 줄 — 판단 아래(F010 슬라이스 6 · `FE-REQ-040` FR-14).
 *
 * **투자유의는 여기서 그리지 않는다** — 그때는 판단 자리가 `BlockedNotice(exchange_warning)` 로 이미 막혀 있다.
 * 주의만 켜졌을 때 판단은 그대로 두고 사실 한 줄만 붙인다. 행동을 말하지 않는다(공통 수용 기준 4).
 * 모르는 코드는 BFF 가 이미 버렸고, 여기 문구가 없는 코드도 그리지 않는다.
 */
export const ExchangeCautionNote = ({ flag }: ExchangeCautionNoteProps) => {
  if (!flag || flag.warning) return null;
  const kinds = flag.cautions
    .map((code) => COACH_MESSAGES.exchangeCaution.kinds[code])
    .filter(Boolean);
  if (kinds.length === 0) return null;
  return (
    <p className={exchangeLine}>
      {COACH_MESSAGES.exchangeCaution.heading} · {kinds.join(" · ")}
    </p>
  );
};

export default ExchangeCautionNote;
