import Link from "next/link";
import { notFound } from "next/navigation";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { backLink, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { serverStory } from "../api";
import { STORY_PAGE as M, isCurrentMonth, isStoryPeriod } from "../model";
import { StoryBoard } from "./StoryBoard";
import * as s from "./story.css";

/**
 * 이야기 카드 `/household/story/[period]`(`FE-REQ-057` FR-9, 가계부 S1g) — period = YYYY-MM(달) | YYYY(해). 서버 셸 + 카드 잎.
 * 형식이 틀리거나 오지 않은 기간이면 404. 이번 기간을 언제부터 볼 수 있는지는 서버(`readyOn`).
 */
export const StoryPage = async ({ params }: { params: Promise<{ period: string }> }) => {
  const { period } = await params;
  if (!isStoryPeriod(period)) notFound();
  const initial = await serverStory(period);
  const year = period.slice(0, 4);
  return (
    <div className={s.page}>
      <Link href={ROUTES.household} className={backLink}>
        {M.back}
      </Link>
      <h1 className={panelTitle}>{M.title}</h1>
      <p className={panelDescription}>{M.description}</p>
      <BlockBoundary name={M.blockName} minHeight={280}>
        <StoryBoard period={period} initial={initial} />
      </BlockBoundary>
      {period.length === 7 ? (
        <nav className={s.links} aria-label={M.moreLinks}>
          <Link href={isCurrentMonth(period) ? ROUTES.household : ROUTES.householdMonth(period)} className={backLink}>
            {M.monthLink}
          </Link>
          <Link href={ROUTES.householdStory(year)} className={backLink}>
            {M.yearLink(year)}
          </Link>
        </nav>
      ) : null}
    </div>
  );
};

export default StoryPage;
