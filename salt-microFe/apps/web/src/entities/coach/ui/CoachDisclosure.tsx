import { DisclosureSlot } from "@repo/ui/disclosureSlot";

import { RISK_MESSAGES } from "../model";

/**
 * F009 새 카드의 3종 고지(FR-32). **prop 이 없다** — 카드가 이것을 그리면 세 줄이 늘 보이고,
 * 끄거나 바꿀 길이 없다. 문구는 슬라이스가 소유하고 자리는 `@repo/ui` 가 고정한다.
 */
export const CoachDisclosure = () => (
  <DisclosureSlot lines={RISK_MESSAGES.disclosure} label={RISK_MESSAGES.disclosureLabel} />
);
