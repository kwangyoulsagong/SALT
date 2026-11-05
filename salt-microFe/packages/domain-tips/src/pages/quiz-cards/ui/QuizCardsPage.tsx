import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { backLink, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { QUIZ_CARDS_PAGE as M, quizCardsMetadata } from "../model";
import { QuizCardList } from "./QuizCardList";
import * as s from "./quizCards.css";

export const metadata = quizCardsMetadata;

/** 맞힌 카드 모음 `/tips/cards`(`FE-REQ-058` FR-5, 금융 팁 S2b) — 개인 화면. 서버 HTML 은 머리만, 카드는 세션이 있는 잎이 그린다 */
export const QuizCardsPage = () => (
  <div className={s.page}>
    <Link href={ROUTES.tips} className={backLink}>
      {M.back}
    </Link>
    <h1 className={panelTitle}>{M.title}</h1>
    <p className={panelDescription}>{M.description}</p>
    <BlockBoundary name={M.blockName} minHeight={240}>
      <QuizCardList />
    </BlockBoundary>
  </div>
);

export default QuizCardsPage;
