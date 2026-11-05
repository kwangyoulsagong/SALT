import { privatePageMetadata } from "@repo/web-shared/config";

/** 리볼빙 화면 문구(가계부 S1h) — 사실만. 지시 · 경고 0 */
export const REVOLVING_PAGE = {
  back: "가계부로",
  title: "리볼빙(일부결제금액이월약정)",
  description: "카드 명세서를 적어 두면 앞으로 6개월 청구와 수수료를 추정해 보여 줘요. 연동하지 않아요 — 적은 값으로만 계산해요",
  blockName: "리볼빙",
  empty: "적어 둔 명세서가 없어요",
  signedOut: "로그인하면 볼 수 있어요",
  loadFailed: "불러오지 못했어요",
} as const;

/** 내 금융 정보가 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata("리볼빙");
