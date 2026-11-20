"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(데스크톱 `InvestmentDetailBody` 와 같은 이유)
import dynamic from "next/dynamic";

import { ROUTES } from "@repo/web-shared/config";
import { DesktopViewLink, MobileDetailTop } from "@repo/web-shared/layout/mobile";
import { BlockBoundary } from "@repo/web-shared/ui";

import { INVESTMENT_DETAIL_MOBILE as M } from "../model/messages";
import { DetailMobileHead } from "./DetailMobileHead";
import * as s from "./detailMobile.css";

/** 한 장 패널 — 데스크톱 상세와 같은 위젯 · 같은 지연 청크(판단 조회는 로그인 세션) */
const ScenarioPanel = dynamic(() => import("@/widgets/scenario-panel").then((mod) => mod.ScenarioPanel), {
  ssr: false,
  loading: () => null,
});

/**
 * 휴대폰 종목 상세 본문(`FE-REQ-072` FR-3 ← 옛 앱 웹뷰 몫 — 휴대폰 폭 패널 · 스트림 복귀) — 머리(이름 · 가격) → **한 장 패널 한 열** → 데스크톱 화면 링크.
 * 패널 안 누름 칸 44 · 글자 13 은 위젯이 `/m` 표지(`ON_MOBILE`)로 맞춘다. 해설 스트림 복귀(화면 복귀 · 연결 복귀에 다시 붙기)는
 * 위젯의 `useExplanationStream` 그대로 — 휴대폰이라 다른 코드가 없다
 */
export const DetailMobileBody = ({ symbol, asset }: { symbol: string; asset: "crypto" | "kr" }) => (
  <>
    <MobileDetailTop>
      <DetailMobileHead symbol={symbol} asset={asset} />
    </MobileDetailTop>
    {/* 패널 지연 청크가 실패해도 머리(이름 · 가격)는 남는다 — 패널 칸만 한 줄(실측: 청크 abort 에 머리까지 사라졌다) */}
    <div className={s.panel}>
      <BlockBoundary name={M.panelName} minHeight={480}>
        <ScenarioPanel symbol={symbol} asset={asset} />
      </BlockBoundary>
    </div>
    <div className={s.foot}>
      <p className={s.note}>{M.more}</p>
      <DesktopViewLink to={ROUTES.investmentDetail(symbol)} />
    </div>
  </>
);
