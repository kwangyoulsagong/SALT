import { privatePageMetadata } from "@repo/web-shared/config";

/** 휴대폰 저축 목록 문구(`FE-REQ-072`, `screen-mobile.md` §5 해요체) — 요약 칸은 `GOAL_SUMMARY_MESSAGES`, 도구는 `GOAL_TOOLS_MESSAGES` */
export const GOALS_MOBILE = {
  title: "저축",
  blockName: "저축 목표",
  list: "목표",
  signedOut: "로그인하면 목표를 볼 수 있어요",
  signIn: "로그인",
  retry: "다시 불러오기",
  empty: "아직 목표가 없어요. 목표 만들기는 데스크톱 화면에서 해요.",
} as const;

/** 내 목표 · 금액이 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata(GOALS_MOBILE.title);
