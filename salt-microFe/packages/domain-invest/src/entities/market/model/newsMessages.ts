import { INVESTMENTS_NEWS_PARAM } from "@repo/web-shared/config";

/**
 * 뉴스 행 · 상세 모달 문구(`FE-REQ-065`). 제목 · 요약은 원문 그대로 — 여기엔 틀 문구만. 해요체
 */
export const NEWS_MESSAGES = {
  /** 행 단추 이름 — 스크린리더가 "무엇을 여는지" 읽게 */
  openLabel: (title: string) => `${title} — 소식 자세히 보기`,
  meta: (source: string, when: string) => `${source} ・ ${when}`,
  relatedHeading: "관련 종목",
  /** 국내 — 본문을 못 찾았을 때(포털에 같은 기사가 없음 · 공시 · 받지 못함) 한 줄로(`FE-REQ-068`) */
  krNoBody: "이 소식은 본문을 찾지 못했어요. 본문은 제공처에서 볼 수 있어요.",
  /** 본문을 받는 동안 — 화면 리더용 */
  bodyLoading: "본문을 불러오고 있어요",
  /** 본문 아래 출처 한 줄 */
  bodySource: (source: string) => `출처 ${source}`,
  openOriginal: "원문 보기",
  openOriginalLabel: (source: string) => `${source} 원문 보기(새 탭)`,
  moreKr: "이 종목 오늘 소식",
  moreCoin: "주요 뉴스",
  /** 검색 모달에서 연 소식 — 같은 검색의 다른 뉴스(`FE-REQ-066` FR-8) */
  moreSearch: "같은 검색의 다른 소식",
  /** 모달 이름(제목이 없을 때) */
  dialogLabel: "소식 자세히",
} as const;

/** 주소 쿼리 이름 — `?news=<id>`(새로고침 · 뒤로가기로 열고 닫힌다) */
export const NEWS_QUERY_PARAM = INVESTMENTS_NEWS_PARAM;
/**
 * 그 기사가 속한 종목 — `?newsOf=<심볼 · 국내 코드>`(2026-11-10). 프리뷰 종목은 hover 라 새로고침하면 바뀐다 — 모달이 어느 목록에서
 * 찾을지 주소가 말한다(`NewsModalHost`)
 */
export const NEWS_OF_QUERY_PARAM = "newsOf";
/** 코인 뉴스 프리뷰가 받는 건수 — 프리뷰와 모달 호스트가 같은 쿼리 키를 쓰도록 한 곳에 */
export const NEWS_PREVIEW_FETCH_LIMIT = 6;
