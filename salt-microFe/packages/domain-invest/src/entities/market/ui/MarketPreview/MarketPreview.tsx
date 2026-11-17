"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { ScrollContainer } from "@repo/ui/scrollContainer";
import { Text } from "@repo/ui/text";
import React, { type ReactNode, Suspense } from "react";

import { MARKET_MESSAGES } from "../../model";
import { MarketAssetClass, MarketPreviewSubject } from "../../model/types";
import { previewPanel } from "./MarketPreview.css";
import { type MarketChartOverlay, MarketPreviewChart } from "./MarketPreviewChart";
import { MarketPreviewHeader } from "./MarketPreviewHeader";
import { KrNewsPreview } from "./KrNewsPreview";
import { MarketNewsPreview } from "./MarketNewsPreview";

interface MarketPreviewProps {
  subject: MarketPreviewSubject | undefined;
  /**
   * 머리 바로 아래 원인 → 근거 → 결과(F017 v4 순서 6 · `FE-REQ-064` FR-12 — "왜 올랐을까" 카드를 원인 칸으로).
   * **슬롯인 이유:** 원인은 한 장 패널 응답(코치 슬라이스)이다. 시세 슬라이스가 코치 슬라이스를 import 하면 cross-slice —
   * 조합은 위 레이어(`widgets/coach-panel`)가 하고 이 컴포넌트는 자리만 낸다
   */
  causeSlot?: ReactNode;
  /** 차트 아래 시나리오 한 칸 · 자세히 보기 — 같은 이유로 자리만 낸다(`FE-REQ-026` FR-110) */
  coachSlot?: ReactNode;
  /** 차트 위 선. 코치 패널이 틀리는 선 하나를 넣는다(관찰 구간 띠는 뺐다, F017 v4 순서 6) — 위와 같은 이유로 자리만 낸다 */
  chartOverlay?: MarketChartOverlay;
}

/** 미리보기 차트(5분봉)가 있는 자산군 — 국내 주식은 서버가 체결로 쌓은 5분봉(F011 `FE-REQ-041`) */
const CHART_ASSET_TYPES: readonly string[] = [MarketAssetClass.Crypto, MarketAssetClass.KrStock];

/**
 * 우측 프리뷰 패널.
 *
 * ## 패널은 **언제나 자리를 지킨다**
 *
 * 선택된 항목이 없을 때 `null` 을 돌려주면 500px 열이 사라지고 왼쪽 테이블이 그 폭만큼
 * 늘어난다. 첫 선택이 들어오는 순간 다시 줄어들어 **화면이 한 번 크게 흔들린다.**
 * 내용만 비우고 폭·높이는 유지한다.
 *
 * ## 자산군에 따라 아래 두 블록이 빠진다
 *
 * 배치(F017 v4 순서 6 · 시안 "바뀐 뒤 · 오른쪽 패널"): 머리 → 원인 · 근거 · 결과 → 차트(틀리는 선) → 시나리오 한 칸 → 오늘 소식.
 * 시장 심리 온도계 · 스마트 머니 추적 · 단타/장기 탭 · 점수 · 관찰 구간 표는 뺐다(계산은 서버에 남는다 — 사용자 확정 2026-11-13).
 * 차트가 없는 자산군은 **왜 없는지 한 줄**을 보여준다.
 */
export const MarketPreview = ({ subject, causeSlot, coachSlot, chartOverlay }: MarketPreviewProps) => {
  const hasChart = subject !== undefined && CHART_ASSET_TYPES.includes(subject.assetType);
  const isKr = subject?.assetType === MarketAssetClass.KrStock;

  return (
    <Root width="lg" className={previewPanel}>
      <ScrollContainer maxHeight="2xl">
        <Suspense fallback={null}>
          {subject ? (
            <FlexBox direction="column" gap="4xl">
              <Padding paddingTop="sm">
                <MarketPreviewHeader subject={subject} />
              </Padding>
              {causeSlot}
              {hasChart ? (
                <>
                  <Heading level={5} color="tertiary">
                    {MARKET_MESSAGES.chartHeading}
                  </Heading>
                  <MarketPreviewChart symbol={subject.symbol} overlay={chartOverlay} assetType={subject.assetType} />
                </>
              ) : (
                <Text color="tertiary">{MARKET_MESSAGES.marketDataUnavailable}</Text>
              )}
              {coachSlot}
              {/* 오늘 소식 — 코인 · 국내 같은 자리 · 같은 모양 */}
              {isKr ? (
                <KrNewsPreview code={subject.symbol} />
              ) : (
                <FlexBox direction="column" gap="md">
                  <Heading level={5} color="tertiary">
                    {MARKET_MESSAGES.newsHeading}
                  </Heading>
                  <MarketNewsPreview symbol={subject.symbol} />
                </FlexBox>
              )}
            </FlexBox>
          ) : null}
        </Suspense>
      </ScrollContainer>
    </Root>
  );
};
export default MarketPreview;
