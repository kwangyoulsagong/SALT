import { serverBffRead } from "@repo/web-shared/api/server";
import { todayInKorea } from "@repo/web-shared/lib";
import { BlockBoundary } from "@repo/web-shared/ui";
import { MobileHead, MobileScreen } from "@repo/web-shared/layout/mobile";

import type { HouseholdMonth } from "@/entities/household";

import { HOUSEHOLD_MOBILE as M } from "../model/messages";
import { HouseholdMobile } from "./HouseholdMobile";

/**
 * 휴대폰 가계부 탭 `/m/household`(`FE-REQ-072` FR-1 · FR-2) — 이번 달(한국 시간). 서버 셸 — 첫 숫자는 데스크톱 `/household` 와 같은 BFF 하나.
 * 지난 달 · 예산 · 반복 · 챌린지 화면은 데스크톱(대응표에 없다 — 휴대폰은 안내)
 */
export const HouseholdMobilePage = async () => {
  const ym = todayInKorea().slice(0, 7);
  const initial = await serverBffRead<HouseholdMonth>(`/api/app/household/month/${encodeURIComponent(ym)}`);
  return (
    <MobileScreen>
      <MobileHead title={M.title} />
      <BlockBoundary name={M.blockName} minHeight={480}>
        <HouseholdMobile ym={ym} initial={initial} />
      </BlockBoundary>
    </MobileScreen>
  );
};
