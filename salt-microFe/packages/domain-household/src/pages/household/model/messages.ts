import { privatePageMetadata } from "@repo/web-shared/config";

/** 가계부 화면 문구 — 사실만 */
export const HOUSEHOLD_PAGE = {
  title: "가계부",
  description: "적은 지출로 이번 달이 어디쯤 닿을지 서버가 계산해요. 예산은 막지 않아요",
  add: "지출 적기",
  addHint: "한 줄 · 결제 문자 붙여넣기",
  budget: "예산",
  budgetHint: "봉투 · 50/30/20 · 통장 쪼개기",
  recurring: "매달 나가는 돈",
  challenges: "챌린지",
  story: "이야기 카드",
  people: "사람 장부",
  blockName: "가계부",
  emptyTitle: "이 달에 적은 지출이 없어요",
  emptyDescription: "금액부터 적으면 돼요. 결제 문자를 붙여넣어도 돼요",
  retry: "다시 불러오기",
  prev: "이전 달",
  next: "다음 달",
  current: "이번 달",
  monthNav: "달 고르기",
  /** 요약 띠(`FE-REQ-060` FR-2) — 값은 서버 */
  summaryLabel: "이 달 요약",
  landing: "이번 달 끝에는",
  /** 요약 띠 칸에 들어가는 짧은 구간(설명 문장은 사이드 착지 상자) */
  landingRange: (low: string, high: string) => `${low} ~ ${high}`,
  landingShort: "기록이 14일 쌓이면 보여 드려요",
  /** 본문 · 사이드 칸 제목 */
  list: "쓴 내역",
  calendar: "달력",
  more: "이 달 더 보기",
  /** 목록 · 달력 전환(2026-11-20) */
  viewLabel: "쓴 내역 보기",
  viewList: "목록",
  /** 앱 웹뷰 세그먼트 셋째 칸 — 분류별로 쓴 돈(FR-M1) */
  viewRatio: "분류",
  dailyHint: "막대를 누르면 그날 내역을 열어요",
  toolsFold: "가계부 도구",
  /** 지출이 없는 달 — 한 줄 대신 첫 기록 안내(리서치: 빈 영역은 무엇이 생기는지 · 어떻게 채우는지 · 바로 가는 행동) */
  start: {
    title: "이번 달 첫 지출을 적어 볼까요?",
    description: "금액부터 적으면 돼요. 결제 문자를 붙여넣으면 금액 · 날짜를 읽어 드려요. 적은 만큼 아래 그림이 채워져요.",
    add: "지출 적기",
    budget: "예산 정하기",
    sampleTitle: "적으면 이렇게 보여요",
    sample: "예시",
    pastTitle: "이 달에 적은 지출이 없어요",
  },
  quickEntry: "바로 적기",
  envelopes: "봉투",
  ratio: "분류별로 쓴 돈",
  landingBlock: "이번 달 끝에는",
  tools: "가계부 도구",
  noBudget: "정한 봉투가 없어요 — 예산에서 정하면 여기 보여요",
  dayDetail: (head: string) => `${head} 쓴 내역`,
} as const;

/** 내 지출이 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata("가계부");
