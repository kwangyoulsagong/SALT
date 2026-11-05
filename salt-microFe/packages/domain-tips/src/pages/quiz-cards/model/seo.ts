import type { Metadata } from "next";

import { QUIZ_CARDS_PAGE } from "./messages";

/** 개인 화면 — 늘 색인 0(공개 플래그와 무관) */
export const quizCardsMetadata: Metadata = {
  title: QUIZ_CARDS_PAGE.title,
  robots: { index: false, follow: false },
};
