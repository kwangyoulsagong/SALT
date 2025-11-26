import { tabButton, filterContainer } from "./styles/filterTab.css.ts";

type FilterOption = { label: string; value: string };

interface Props {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export const FilterTabs = ({ options, value, onChange }: Props) => {
  return (
    <div className={filterContainer}>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={tabButton({ active: value === opt.value })}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
