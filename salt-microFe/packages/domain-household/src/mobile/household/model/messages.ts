import { privatePageMetadata } from "@repo/web-shared/config";

/** 휴대폰 가계부 문구(`FE-REQ-072`) — 요약 칸은 `HOUSEHOLD_SUMMARY_MESSAGES`, 행 · 달력 문구는 엔티티 */
export const HOUSEHOLD_MOBILE = {
  title: "가계부",
  blockName: "가계부",
  signedOut: "로그인하면 이 달 지출을 볼 수 있어요",
  signIn: "로그인",
  retry: "다시 불러오기",
  list: "쓴 내역",
  /** 세그먼트 넷 — 한 화면에 한 가지(`FE-REQ-060` FR-M1, 탭 4개까지 고정 폭 `screen-mobile.md` §4) */
  viewLabel: "쓴 내역 보기",
  views: { list: "목록", calendar: "달력", ratio: "분류", envelopes: "봉투" },
  empty: "이 달에 적은 지출이 없어요. 아래 지출 적기로 금액부터 적으면 돼요.",
  noBudget: "정한 봉투가 없어요. 예산은 데스크톱 화면에서 정해요.",
  dayDetail: (head: string) => `${head} 쓴 내역`,
  add: "지출 적기",
} as const;

/** 내 지출이 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata(HOUSEHOLD_MOBILE.title);
