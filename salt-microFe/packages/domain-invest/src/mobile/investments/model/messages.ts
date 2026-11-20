import { privatePageMetadata } from "@repo/web-shared/config";

/** 휴대폰 투자 탭 문구(`FE-REQ-072` FR-3) */
export const INVESTMENTS_MOBILE = {
  title: "투자",
  blockName: "관심 종목",
  watchlist: "관심 종목",
  watchlistEmpty: "관심 종목이 아직 없어요. 시세 표에서 ★ 를 누르면 여기 모여요.",
  watchlistUnavailable: "지금은 불러올 수 없어요",
  signedOut: "로그인하면 관심 종목을 볼 수 있어요",
  signIn: "로그인",
  reportTitle: "코치 리포트",
  reportHint: "위험 · 판정 성적 · 매매 거울",
  board: "시세 표 · 포트폴리오 · 적립은 데스크톱 화면에서 볼 수 있어요",
} as const;

export const metadata = privatePageMetadata(INVESTMENTS_MOBILE.title);
