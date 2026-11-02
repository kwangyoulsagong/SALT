/** 업비트 KRW 마켓 심볼 모양. 서버 `explainCoachSchema` 상한(20자)과 같다 */
const SYMBOL_PATTERN = /^[A-Za-z0-9]{1,20}$/;

/**
 * 라우트 파라미터(Next 가 이미 디코드했다) → 심볼. 모양이 아니면 `null`(페이지가 404 로 보낸다).
 * 대문자로 맞춘다 — 서버가 대문자로 저장하고 쿼리 키도 한 표기여야 캐시가 갈리지 않는다.
 */
export const parseSymbolParam = (raw: string): string | null =>
  SYMBOL_PATTERN.test(raw) ? raw.toUpperCase() : null;
