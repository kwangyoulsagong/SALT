export const SortOptions = [
  { label: "전체", value: "" },
  { label: "거래대금", value: "trade_value" },
  { label: "변동률", value: "change" },
  { label: "가격", value: "price" },
  { label: "이름", value: "name" },
];
export const OrderOptions = [
  { label: "오름차순", value: "" },
  { label: "내림차순", value: "desc" },
];

export const PerioidOptions = [
  { label: "실시간", value: "" },
  { label: "1일", value: "1d" },
  { label: "1주일", value: "7d" },
  { label: "1개월", value: "1m" },
  { label: "3개월", value: "3m" },
  { label: "6개월", value: "6m" },
  { label: "1년", value: "1y" },
];
export type Sort = "" | "trade_value" | "change" | "price" | "name";
export type Order = "" | "desc";
export type Period = "" | "1d" | "7d" | "1m" | "3m" | "6m" | "1y";
