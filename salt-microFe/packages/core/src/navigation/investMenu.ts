import { isKrStockCode } from "../market/krStock";

/**
 * 투자 zone 머리 메뉴(`FE-REQ-069` FR-2) — 자산 종류(코인 · 주식)는 탭, 보유(포트폴리오) · 리포트 · 코치 설정은 따로(참고 증권 웹 둘 실측,
 * 리서치 `2026-11-10-invest-header-portfolio.md`). 순서 · 주소 · 지금 메뉴 판정은 여기 한 벌 — 웹 · 앱이 같이 읽는다.
 */
export enum InvestMenuId {
  Crypto = "crypto",
  Stock = "stock",
  Portfolio = "portfolio",
  Report = "report",
  CoachSettings = "coach-settings",
}

/** 투자 화면 자산군을 주소로 고르는 쿼리 — `?asset=kr_stock` 이면 주식, 없으면 코인 */
export const INVEST_ASSET_PARAM = "asset";
export const INVEST_STOCK_ASSET = "kr_stock";

export interface InvestMenuItem {
  id: InvestMenuId;
  label: string;
  href: string;
  /** 국내 시세 소유자만 보이는 메뉴(주식) */
  requiresKrViewer: boolean;
}

export const INVEST_MENU: readonly InvestMenuItem[] = [
  { id: InvestMenuId.Crypto, label: "코인", href: "/investments", requiresKrViewer: false },
  { id: InvestMenuId.Stock, label: "주식", href: `/investments?${INVEST_ASSET_PARAM}=${INVEST_STOCK_ASSET}`, requiresKrViewer: true },
  { id: InvestMenuId.Portfolio, label: "포트폴리오", href: "/portfolio", requiresKrViewer: false },
  { id: InvestMenuId.Report, label: "리포트", href: "/coach/report", requiresKrViewer: false },
  { id: InvestMenuId.CoachSettings, label: "코치 설정", href: "/coach/settings", requiresKrViewer: false },
];

/**
 * 지금 메뉴 — 없으면 `null`(검색 `/search` 처럼 어느 메뉴도 아닌 화면).
 * - `/investments` = 코인, `?asset=kr_stock` 이면 주식
 * - `/investments/<종목>` = 국내 코드(6자리 · 숫자 시작)면 주식, 아니면 코인 — 상세도 그 자산 메뉴 안이다
 * - `/portfolio` = 포트폴리오 · `/coach/report` · `/coach/signals/*` = 리포트(판정 근거는 리포트에서 들어간다) · `/coach/settings` = 코치 설정
 */
export const activeInvestMenu = (pathname: string, asset: string | null): InvestMenuId | null => {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/investments") return asset === INVEST_STOCK_ASSET ? InvestMenuId.Stock : InvestMenuId.Crypto;
  if (path.startsWith("/investments/")) {
    const symbol = decodeURIComponent(path.slice("/investments/".length).split("/")[0] ?? "");
    return isKrStockCode(symbol) ? InvestMenuId.Stock : InvestMenuId.Crypto;
  }
  if (path === "/portfolio" || path.startsWith("/portfolio/")) return InvestMenuId.Portfolio;
  if (path === "/coach/report" || path.startsWith("/coach/signals")) return InvestMenuId.Report;
  if (path === "/coach/settings") return InvestMenuId.CoachSettings;
  return null;
};
