/**
 * 뉴스 행 · 상세 모달 문구(`FE-REQ-065`). 제목 · 요약은 원문 그대로 — 여기엔 틀 문구만. 해요체
 */
export const NEWS_MESSAGES = {
  /** 행 단추 이름 — 스크린리더가 "무엇을 여는지" 읽게 */
  openLabel: (title: string) => `${title} — 소식 자세히 보기`,
  meta: (source: string, when: string) => `${source} ・ ${when}`,
  relatedHeading: "관련 종목",
  /** 국내 원천엔 본문 · 링크가 없다(`ADR-009`) — 모달이 그 사실을 한 줄로 */
  krNoBody: "본문은 제공처에서 볼 수 있어요. 이 화면엔 제목만 모아요.",
  openOriginal: "원문 보기",
  openOriginalLabel: (source: string) => `${source} 원문 보기(새 탭)`,
  moreKr: "이 종목 오늘 소식",
  moreCoin: "주요 뉴스",
  /** 모달 이름(제목이 없을 때) */
  dialogLabel: "소식 자세히",
} as const;

/** 주소 쿼리 이름 — `?news=<id>`(새로고침 · 뒤로가기로 열고 닫힌다) */
export const NEWS_QUERY_PARAM = "news";
