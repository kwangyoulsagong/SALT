import { privatePageMetadata } from "@repo/web-shared/config";

/** 챌린지 화면 문구(가계부 S1d) — 사실만. 실패 · 재촉 · 칭찬 0 */
export const CHALLENGES_PAGE = {
  back: "가계부로",
  title: "챌린지",
  description: "해 보고 싶은 걸 고르고 기간을 정해요. 한 날만 표시하고, 언제든 그만둬도 돼요. 아낀 돈은 저축 목표에 보탤 수 있어요",
  blockName: "챌린지",
  empty: "아직 고른 챌린지가 없어요",
  ended: "끝난 챌린지",
  signedOut: "로그인하면 볼 수 있어요",
  loadFailed: "불러오지 못했어요",
} as const;

/** 내 기록이 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata("챌린지");
