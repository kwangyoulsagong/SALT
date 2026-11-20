import type { Metadata } from "next";

/** 휴대폰 종목 상세 문구(`FE-REQ-072` FR-3) */
export const INVESTMENT_DETAIL_MOBILE = {
  backTo: "투자",
  blockName: "종목 상세",
  panelName: "한 장 패널",
  /** 차트 · 호가 · 투자자 · 일정은 데스크톱 상세 — 휴대폰은 한 장 패널 한 열 */
  more: "차트 · 호가 · 일정은 데스크톱 화면에서 볼 수 있어요",
} as const;

/** 휴대폰 상세는 데스크톱 `/investments/[symbol]` 의 사본이다 — 검색에 싣지 않는다(정본은 데스크톱 · SEO 는 거기) */
export const metadata: Metadata = { title: "종목", robots: { index: false, follow: false } };
