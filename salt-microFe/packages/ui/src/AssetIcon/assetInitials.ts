/**
 * 로고가 없을 때 이니셜 — 한글은 1글자, 그 외는 2글자.
 * 마켓 접두어(`KRW-BTC` · `USDT-ETH`)는 떼고 자산 쪽에서 고른다 — 접두어로 고르면 원화 코인이 전부 "KR" 이 된다(`FE-REQ-074` FR-5).
 * 숫자만인 코드(국내 `005930`)는 이름이 있으면 이름 첫 글자 — 코드 앞 두 자리("00")는 아무것도 말하지 않는다
 */
export const assetInitials = (symbol: string, name?: string): string => {
  const trimmed = symbol.trim();
  const named = name?.trim();
  if (/^\d+$/.test(trimmed) && named && !/^\d+$/.test(named)) return assetInitials(named);
  const asset = trimmed.includes("-") ? (trimmed.split("-").pop() ?? "").trim() : trimmed;
  const base = asset || trimmed;
  if (!base) return "?";
  return /[가-힣]/.test(base[0] as string) ? base.slice(0, 1) : base.slice(0, 2).toUpperCase();
};
