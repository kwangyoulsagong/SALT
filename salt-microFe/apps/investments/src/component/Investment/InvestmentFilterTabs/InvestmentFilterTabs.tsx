import { FilterTabs } from "@repo/ui/filterTabs";
import { FlexBox } from "@repo/ui/flexBox";
import {
  Order,
  Period,
  Sort,
  SortOptions,
  OrderOptions,
  PerioidOptions,
} from "./FilterTabsOptions/FilterTabsOptions";
interface InvestmentFilterTabsProps {
  sort: Sort;
  order: Order;
  period: Period;
  onChange: (next: { sort?: Sort; order?: Order; period?: Period }) => void;
}
const InvestmentFilterTabs = ({
  sort,
  order,
  period,
  onChange,
}: InvestmentFilterTabsProps) => {
  return (
    <FlexBox direction="row" gap="lg">
      <FilterTabs
        options={SortOptions}
        value={sort}
        onChange={(v) => onChange({ sort: v as Sort })}
      />
      <FilterTabs
        options={OrderOptions}
        value={order}
        onChange={(v) => onChange({ order: v as Order })}
      />
      <FilterTabs
        options={PerioidOptions}
        value={period}
        onChange={(v) => onChange({ period: v as Period })}
      />
    </FlexBox>
  );
};
export default InvestmentFilterTabs;
