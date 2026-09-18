"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FilterTabs } from "@repo/ui/filterTabs";
import { FlexBox } from "@repo/ui/flexBox";

import {
  MARKET_MESSAGES,
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
    /*
      좁은 화면에서 **줄바꿈한다.** 세 묶음 14개 버튼이 한 줄에 755px 이라 375px 화면을
      밀어냈다. 넓은 화면에서는 자리가 남아 줄이 바뀌지 않으므로 PC 배치는 그대로다.
      가로 스크롤로 숨기지 않는 이유: 필터는 **보여야 눌린다**.
    */
    <FlexBox direction="row" gap="lg" wrap="wrap">
      <FilterTabs
        label={MARKET_MESSAGES.sortGroupLabel}
        options={SORT_OPTIONS}
        value={sort}
        onChange={(v) => onChange({ sort: v as MarketSort })}
      />
      <FilterTabs
        label={MARKET_MESSAGES.orderGroupLabel}
        options={ORDER_OPTIONS}
        value={order}
        onChange={(v) => onChange({ order: v as MarketOrder })}
      />
      <FilterTabs
        label={MARKET_MESSAGES.periodGroupLabel}
        options={PERIOD_OPTIONS}
        value={period}
        onChange={(v) => onChange({ period: v as MarketPeriod })}
      />
    </FlexBox>
  );
};

export default MarketFilterTabs;
