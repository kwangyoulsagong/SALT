"use client";

// 클라이언트 잎: 조회 결과를 받아 표시만 한다.
import { AssetIcon } from "@repo/ui/assetIcon";
import { Badge } from "@repo/ui/badge";
import { StatusLine } from "@repo/ui/statusLine";
import { FlexBox } from "@repo/ui/flexBox";
import { Text } from "@repo/ui/text";
import Link from "next/link";
import React from "react";

import { ROUTES } from "@repo/web-shared/config";
import { formatPrice } from "@repo/web-shared/lib";
import { NavChevron } from "@repo/web-shared/ui";

import { PORTFOLIO_ASSET_LABELS, PORTFOLIO_MESSAGES } from "../model/messages";
import { PortfolioSummaryItem } from "../model/types";
import { holdingRow } from "./HoldingSummaryList.css";

/**
 * 보유 요약 목록 (`FE-REQ-010` FR-5).
 *
 * "주식" 제목 아래가 **비어 있었다** — `<Heading>주식</Heading>` 만 있고 자식이 없었다.
 *
 * 표시 전용이다. 평가금액·손익률은 서버가 계산한 값을 그대로 쓴다 — 프론트에서
 * 금액을 만들지 않는다(전 영역 공통 수용 기준).
 *
 * 매입가 숨김(F009 FR-27)이면 손익률을 **그리지 않는다** — 흐리게 하거나 가리지 않는다. 숨김 여부는
 * 서버 설정이고 조합하는 쪽이 넘긴다(이 슬라이스는 코치 설정을 모른다).
 *
 * 손익 부호는 색과 **문자(`+`/`−`)를 함께** 쓴다. 색만으로 상태를 표현하지 않는다
 * (`a11y-policy.md`).
 */
export const HoldingSummaryList = React.memo(
  ({
    items,
    showProfitRate = true,
  }: {
    items: readonly PortfolioSummaryItem[];
    /** 매입가 숨김(F009 FR-27)이면 `false` — 손익률 칸을 그리지 않는다. 평가금액은 그대로 */
    showProfitRate?: boolean;
  }) => {
    if (items.length === 0) {
      return (
        <StatusLine kind="empty">{PORTFOLIO_MESSAGES.holdingsEmpty}</StatusLine>
      );
    }

    return (
      <FlexBox direction="column" gap="md" fullWidth>
        {items.map((item) => {
          const isUp = item.profitRate > 0;
          const isFlat = item.profitRate === 0;

          return (
            // 행 → 상세 분석(F006 G절 FR-72) — 다른 페이지로 가니 오른쪽 셰브론 · 폭 100%.
            // 좁은 칸(앱 웹뷰 390)에서는 금액 묶음이 아랫줄로 — 이름이 한 글자씩 꺾이지 않게(2026-11-18 실화면)
            <Link
              key={`${item.assetType}-${item.symbol}`}
              href={ROUTES.investmentDetail(item.symbol)}
              className={holdingRow}
            >
              <FlexBox
                justify="between"
                align="center"
                wrap="wrap"
                gap="sm"
                fullWidth
              >
                <FlexBox align="center" gap="md">
                  {/* 종목이 나오는 자리에는 로고가 늘 있다 — 없으면 이니셜 */}
                  {/* 국내 주식 심볼은 숫자 코드라 이니셜이 "00" 이 된다 — 이름으로(상세 머리와 같다) */}
                  <AssetIcon
                    symbol={
                      item.assetType === "kr_stock" ? item.name : item.symbol
                    }
                    src={item.logoUrl ?? undefined}
                    name={item.name}
                    size="md"
                  />
                  <Text variant="bodyLarge">{item.name}</Text>
                  {PORTFOLIO_ASSET_LABELS[item.assetType] ? (
                    <Badge tone="neutral" size="sm">
                      {PORTFOLIO_ASSET_LABELS[item.assetType]}
                    </Badge>
                  ) : null}
                </FlexBox>
                <FlexBox align="center" gap="md">
                  <Text variant="bodyLarge">
                    {PORTFOLIO_MESSAGES.amount(formatPrice(item.currentValue))}
                  </Text>
                  {showProfitRate ? (
                    <Text
                      variant="bodyLarge"
                      color={isFlat ? "tertiary" : isUp ? "up" : "down"}
                    >
                      {PORTFOLIO_MESSAGES.profitRate(item.profitRate)}
                    </Text>
                  ) : null}
                  <NavChevron />
                </FlexBox>
              </FlexBox>
            </Link>
          );
        })}
      </FlexBox>
    );
  },
);
HoldingSummaryList.displayName = "HoldingSummaryList";

export default HoldingSummaryList;
