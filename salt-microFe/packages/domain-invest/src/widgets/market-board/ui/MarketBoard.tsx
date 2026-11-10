"use client";

// 클라이언트 잎: 탭 상태를 갖고, 실시간 테이블을 ssr:false 로 내린다.
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Margin } from "@repo/ui/margin";
import { Section } from "@repo/ui/section";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Tabs } from "@repo/ui/tabs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { type ReactNode, Suspense, useEffect, useState } from "react";

import { INVESTMENTS_ASSET_PARAM, ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { NewsModalHost } from "@/entities/market";

import {
  ASSET_CLASS_TABS,
  DEFAULT_ASSET_CLASS_TAB,
  DEFAULT_MARKET_BOARD_TAB,
  MARKET_BOARD_MESSAGES,
  MARKET_BOARD_TABS,
  WATCH_LIST_TAB,
  type PreviewRenderer,
} from "../model";
import { headingRow, reportLink } from "./MarketBoardLayout.css";
import { placeholder as summaryPlaceholder } from "./MarketSummaryStrip.css";

const RealtimeMarketTable = dynamic(
  () =>
    import("./RealtimeMarketTable").then((mod) => mod.RealtimeMarketTable),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 관심 종목 탭도 `ssr:false` 다.
 *
 * 토큰이 `localStorage` 에 있어서(`FE-REQ-008` §6-4) 서버 렌더는 언제나 "로그인 안 됨"을
 * 그리고 클라이언트는 다른 것을 그린다 — 하이드레이션 불일치다. 쿠키로 옮기면
 * (`FE-REQ-013`) 이 탭이 서버 컴포넌트로 내려갈 수 있다.
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 이 자리가 클라이언트에 남은 것은 아직 서버 조회로 옮기지 않아서다 — 목록은 `FE-REQ-013` FR-81)
 */
const WatchlistTab = dynamic(
  () => import("./WatchlistTab").then((mod) => mod.WatchlistTab),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 시장 요약 띠(`FE-REQ-037`)도 `ssr:false` 잎이다. 시세 조회 · WS 가 브라우저에만 있고, 정적으로 부르면
 * 엔티티 barrel 이 페이지 첫 로드에 들어온다(`model/index.ts` 주석). 청크가 오기 전에는 카드 높이만큼
 * 자리를 잡아 탭 · 표가 밀리지 않게 한다(FR-8).
 */
const MarketSummaryStrip = dynamic(
  () => import("./MarketSummaryStrip").then((mod) => mod.MarketSummaryStrip),
  {
    ssr: false,
    loading: () => <div className={summaryPlaceholder} aria-hidden="true" />,
  }
);

/** 국내 주식(F011) 자산군 탭을 보일지 정하는 잎 — 엔티티 barrel 을 쓰므로 늦게 온다 */
const KrStockAvailability = dynamic(
  () => import("./KrStockAvailability").then((mod) => mod.KrStockAvailability),
  { ssr: false, loading: () => null }
);

interface MarketBoardProps {
  /** 우측 패널. 페이지가 AI 코치 패널을 주입한다 — `model/previewSlot.ts` */
  renderPreview?: PreviewRenderer;
  /**
   * 머리 바로 아래 칸(F010 `FE-REQ-040` FR-7). 페이지가 위험 · 판정 성적표 카드를 주입한다 — 위젯끼리 import 할 수 없다.
   * 시세 요약 띠보다 위다: 첫 화면에 "오늘 내 위험"이 먼저 보여야 한다(리서치 §9-4). 자산군 탭마다 다시 그린다 —
   * 국내 탭엔 국내 성적만(`FE-REQ-050` FR-5)
   */
  renderLead?: (assetClass: string) => ReactNode;
}

/**
 * `?asset=kr_stock` 으로 들어오면 그 자산군 탭으로(검색 모달 업종 · 지수 줄 — `FE-REQ-066` FR-8). 주소를 읽는 잎을 따로 두고 Suspense 로
 * 감싼다 — 보드 전체가 `useSearchParams` 때문에 클라이언트로 미뤄지지 않게. 국내가 안 열리는 사람(비소유자)은 아래 판정이 코인으로 되돌린다
 */
const AssetParamSync = ({ onAsset }: { onAsset: (asset: string) => void }) => {
  const asset = useSearchParams()?.get(INVESTMENTS_ASSET_PARAM) ?? null;
  useEffect(() => {
    if (asset && ASSET_CLASS_TABS.some((tab) => tab.id === asset)) onAsset(asset);
  }, [asset, onAsset]);
  return null;
};

/** 조합만 한다. 비즈니스 로직은 `entities/market` 과 그 위의 feature 가 갖는다. */
export const MarketBoard = ({ renderPreview, renderLead }: MarketBoardProps) => {
  const [activeTab, setActiveTab] = useState(DEFAULT_MARKET_BOARD_TAB);
  const [assetTab, setAssetTab] = useState(DEFAULT_ASSET_CLASS_TAB);
  const [krAvailable, setKrAvailable] = useState(false);
  // 자산군 탭이 사라지면(로그아웃 · 소유자 아님) 코인으로 돌아온다 — 빈 국내 주식 화면에 남지 않는다
  const assetClass = krAvailable ? assetTab : DEFAULT_ASSET_CLASS_TAB;
  return (
    <Section noContainer>
      <Suspense fallback={null}>
        <AssetParamSync onAsset={setAssetTab} />
        {/* 시세 화면 뉴스 모달 하나 — 주소(`?news=&newsOf=`)가 상태라 프리뷰 선택 · 탭과 무관하게 새로고침에도 열린다(`FE-REQ-065`) */}
        <NewsModalHost />
      </Suspense>
      <FlexBox direction="column">
        <div className={headingRow}>
          <FlexBox direction="row" align="center" gap="lg">
            <ServiceIcon variant="analysis" />
            {/* 화면의 첫 제목 — 모양은 h2, 태그는 h1(axe page-has-heading-one) */}
            <Heading level={2} as={1}>
              {MARKET_BOARD_MESSAGES.heading}
            </Heading>
          </FlexBox>
          <FlexBox direction="row" align="center" gap="lg">
            {/* 종목 검색 진입은 머리 검색칸으로 옮겼다(2026-11-09 `FE-REQ-066` · `067` — 어느 투자 화면에서나 `/` · 머리 칸) */}
            {/* 코치 리포트 진입(`FE-REQ-026` FR-140). 보유 전체의 리포트라 종목 패널이 아니라 화면 머리에 둔다 */}
            <Link href={ROUTES.coachReport} className={reportLink}>
              {MARKET_BOARD_MESSAGES.coachReportLink}
              <NavChevron />
            </Link>
          </FlexBox>
        </div>
        {/*
          자산군 탭(F011 `FE-REQ-041`) — 제목 바로 아래. 아래 화면은 탭마다 같고 데이터만 다르다. 국내 주식을 볼 수 없는
          사용자(비로그인 · 소유자 아님 · 키 없음)에겐 이 줄이 없다 — 화면이 지금과 같다
        */}
        <KrStockAvailability onChange={setKrAvailable} />
        {krAvailable && (
          <Margin top="lg">
            <Tabs tabs={ASSET_CLASS_TABS} activeTab={assetClass} onTabChange={setAssetTab} />
          </Margin>
        )}
        {/*
          머리 띠 · 시장 요약 띠는 자산군마다 같은 자리 · 같은 컴포넌트, 데이터만 다르다(`FE-REQ-050` FR-1 · FR-5). 국내 탭에 코인
          숫자를 두지 않는다 — 머리 띠는 국내 성적만, 요약 띠는 국내 요약(대표 지수 · 작은 칸 · 오늘의 시장 + 다가오는 일정).
          `key` — 탭을 바꾸면 띠가 새로 선다(이전 자산군 값이 한 프레임 남지 않게)
        */}
        {renderLead?.(assetClass)}
        <Margin top="xl">
          <MarketSummaryStrip key={assetClass} assetClass={assetClass} />
        </Margin>
        <Margin top="xl">
          <Tabs
            tabs={MARKET_BOARD_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </Margin>
        <Margin top="md">
          <Suspense fallback={null}>
            {/* `key` — 자산군을 바꾸면 선택 · 필터 · 깜빡임 상태를 새로 시작한다(다른 종목 목록이다) */}
            {activeTab === DEFAULT_MARKET_BOARD_TAB && (
              <RealtimeMarketTable key={assetClass} renderPreview={renderPreview} assetClass={assetClass} />
            )}
            {activeTab === WATCH_LIST_TAB && (
              <WatchlistTab key={assetClass} renderPreview={renderPreview} assetClass={assetClass} />
            )}
          </Suspense>
        </Margin>
      </FlexBox>
    </Section>
  );
};

export default MarketBoard;
