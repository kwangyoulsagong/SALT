import type { Metadata } from "next";

import { ROUTES } from "@/shared/config";

/** 공개 시세 목록 — 검색에 싣는다 */
export const metadata: Metadata = {
  title: "코인 시세 · AI 코치 판단",
  description:
    "원화 코인 전 종목의 실시간 시세와 24시간 변동률, 종목마다 과거 적중률과 틀렸던 사례를 함께 보는 AI 코치 판단.",
  alternates: { canonical: ROUTES.investments },
  openGraph: { url: ROUTES.investments, title: "코인 시세 · AI 코치 판단" },
};
