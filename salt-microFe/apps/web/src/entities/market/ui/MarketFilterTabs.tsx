"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FilterTabs } from "@repo/ui/filterTabs";
import { FlexBox } from "@repo/ui/flexBox";

import {
  MarketOrder,
  MarketPeriod,
  MarketSort,
  ORDER_OPTIONS,
  PERIOD_OPTIONS,
  SORT_OPTIONS,
} from "../model";

export interface MarketFilterValue {
  sort?: MarketSort;
  order?: MarketOrder;
  period?: MarketPeriod;
}

interface MarketFilterTabsProps {
  sort: MarketSort;
  order: MarketOrder;
  period: MarketPeriod;
  /** 표시 전용이므로 선택 결과를 위로 올리기만 한다 (`fsd-entities.md`). */
  onChange: (next: MarketFilterValue) => void;
}

/** 필터 3그룹 — 변경 금지 목록 (FR-36). */
export const MarketFilterTabs = ({
  sort,
  order,
  period,
  onChange,
}: MarketFilterTabsProps) => {
  return (
    <FlexBox direction="row" gap="lg">
      <FilterTabs
        options={SORT_OPTIONS}
        value={sort}
        onChange={(v) => onChange({ sort: v as MarketSort })}
      />
      <FilterTabs
        options={ORDER_OPTIONS}
        value={order}
        onChange={(v) => onChange({ order: v as MarketOrder })}
      />
      <FilterTabs
        options={PERIOD_OPTIONS}
        value={period}
        onChange={(v) => onChange({ period: v as MarketPeriod })}
      />
    </FlexBox>
  );
};

export default MarketFilterTabs;
