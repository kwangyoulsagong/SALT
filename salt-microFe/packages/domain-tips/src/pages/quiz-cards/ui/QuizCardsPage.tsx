import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { BackNav, PageFrame } from "@repo/web-shared/ui/frame";

import { TIP_MESSAGES } from "@/entities/tip";
import { TipsForMeSlot } from "@/features/tips-for-me";

import { QUIZ_CARDS_PAGE as M, quizCardsMetadata } from "../model";
import { QuizCardList } from "./QuizCardList";
import * as s from "./quizCards.css";

export const metadata = quizCardsMetadata;

/**
 * 맞힌 카드 모음 `/tips/cards`(`FE-REQ-058` FR-5 → `FE-REQ-060` FR-10) — 개인 화면. 서버 HTML 은 머리만, 카드는 세션이 있는 잎이 그린다.
 * 데스크톱 틀: 뒤로(금융 팁 › 맞힌 카드) · 제목 → 카드 격자(정보 상자) + 오른쪽 사이드(내게 맞춘 팁)
 */
export const QuizCardsPage = () => (
  <PageFrame sideLabel={TIP_MESSAGES.sideLabel} side={<TipsForMeSlot />}>
    <BackNav label={M.back} trailLabel={M.trailLabel} fallbackHref={ROUTES.tips} crumbs={[{ label: M.trailTips, href: ROUTES.tips }, { label: M.title }]} />
    <h1 className={s.title}>{M.title}</h1>
    <p className={s.description}>{M.description}</p>
    <BlockBoundary name={M.blockName} minHeight={240}>
      <QuizCardList />
    </BlockBoundary>
  </PageFrame>
);

export default QuizCardsPage;
