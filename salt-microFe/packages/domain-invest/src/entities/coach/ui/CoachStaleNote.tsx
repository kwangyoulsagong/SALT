import { kstClock } from "@repo/core/marketKr";
import { Text } from "@repo/ui/text";

import { COACH_MESSAGES } from "../model";

/**
 * 새 판단을 못 받아 마지막 판단을 보여 줄 때 한 줄(`BFF-REQ-052` FR-2) — 화면 전체를 오류로 버리지 않고, 낡았다는 사실은 숨기지 않는다.
 * 새 판단이면 아무것도 그리지 않는다
 */
export const CoachStaleNote = ({ staleSince }: { staleSince: string | null }) =>
  staleSince ? (
    <div role="status">
      <Text color="tertiary">{COACH_MESSAGES.judgmentStale(kstClock(staleSince))}</Text>
    </div>
  ) : null;
