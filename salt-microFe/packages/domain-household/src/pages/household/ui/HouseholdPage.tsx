import { notFound } from "next/navigation";

import { BlockBoundary, PageFrame } from "@repo/web-shared/ui";

import { serverMonth } from "../api";
import { HOUSEHOLD_PAGE as M, currentMonth, isMonth } from "../model";
import { HouseholdBoard } from "./HouseholdBoard";
import { HouseholdSide } from "./HouseholdSide";
import { MonthNav } from "./MonthNav";

/**
 * 한 달 화면(`FE-REQ-057` FR-1 · FR-7 → `FE-REQ-060` FR-1~6 데스크톱 틀). 서버 셸 — 첫 숫자는 서버가 쿠키로 받아 본문 · 사이드에 같이 넘긴다
 * (둘 다 같은 조회 키라 요청은 한 번). 머리 = 제목 + 달 이동, 오른쪽 사이드 = 바로 적기 · 봉투 · 분류 · 착지 · 도구
 */
const MonthView = async ({ ym }: { ym: string }) => {
  const initial = await serverMonth(ym);
  return (
    <PageFrame title={M.title} actions={<MonthNav ym={ym} />} side={<HouseholdSide ym={ym} initial={initial} />} sideLabel={M.title} surface="cards">
      <BlockBoundary name={M.blockName} minHeight={480}>
        <HouseholdBoard ym={ym} initial={initial} />
      </BlockBoundary>
    </PageFrame>
  );
};

/** 가계부 `/household` — 이번 달 */
export const HouseholdPage = async () => <MonthView ym={currentMonth()} />;

/** 지난 달 `/household/month/[ym]`(FR-7). 형식이 틀리거나 미래 달이면 404 */
export const HouseholdMonthPage = async ({ params }: { params: Promise<{ ym: string }> }) => {
  const { ym } = await params;
  if (!isMonth(ym) || ym > currentMonth()) notFound();
  return <MonthView ym={ym} />;
};

export default HouseholdPage;
