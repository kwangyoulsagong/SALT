export const PORTFOLIO_MESSAGES = {
  loading: "Loading...",
  heading: "투자 분석",
  stockHeading: "주식",
  /** 보유가 없을 때. 더미를 만들지 않는다 */
  holdingsEmpty: "보유 중인 자산이 없습니다",
  holdingsLoadFailed: "보유 정보를 불러오지 못했습니다.",
  holdingsSignInRequired: "로그인하면 보유 자산을 볼 수 있습니다.",
  amount: (formatted: string) => `${formatted} 원`,
  /** 부호를 **문자로도** 쓴다 — 색만으로 상태를 표현하지 않는다 (`a11y-policy.md`) */
  profitRate: (rate: number) =>
    `${rate > 0 ? "+" : rate < 0 ? "−" : ""}${Math.abs(rate).toFixed(2)} %`,
  totalLabel: "합계",
} as const;

/** 자산군 배지 문구. 모르는 값이면 배지를 만들지 않는다 (`DB-REQ-003` 이 값을 늘린다). */
export const PORTFOLIO_ASSET_LABELS: Readonly<Record<string, string>> = {
  crypto: "크립토",
  stock: "주식",
  kr_stock: "국내주식",
  us_stock: "미국주식",
};
