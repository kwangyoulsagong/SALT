import { tabButton, filterContainer } from "./styles/filterTab.css";

type FilterOption = { label: string; value: string };

interface Props {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  /**
   * 이 묶음이 무엇을 고르는 것인지. 스크린리더는 버튼 라벨(`전체`·`거래대금`)만으로는
   * 무엇에 대한 선택인지 알 수 없다. 화면에는 보이지 않는다.
   */
  label?: string;
  /**
   * `segmented`(기본) = 회색 막대 안의 흰 조각 — 투자 표 필터(변경 금지 목록).
   * `chip` = 막대 없이 글자 칩, 고른 것만 옅은 회색 면(높이 28 · 13px) — 차트 기간처럼
   * 카드 머리에 가볍게 얹는 선택
   */
  variant?: "segmented" | "chip";
}

/**
 * 하나를 고르는 필터 묶음.
 *
 * ## `role="tablist"` 이 아니다
 *
 * `FE-REQ-010` FR-63 은 `role="tablist"`·`aria-selected` 를 요구했지만 **이 버튼들은
 * 탭이 아니다** — 대응하는 `tabpanel` 이 없고, 화면을 바꾸는 것이 아니라 같은 표의
 * 정렬·기간을 바꾼다. `tablist` 로 선언하면 스크린리더가 "탭 1/5"이라고 읽고 사용자는
 * 패널 전환을 기대한다. 그래서 **눌림 상태를 가진 버튼 묶음**(`aria-pressed`)으로 둔다.
 *
 * 고른 값이 하나뿐이라는 점만 보면 `radiogroup` 이 더 정확하지만, 그 패턴은 roving
 * tabindex 와 화살표 이동을 함께 요구한다. 시각 구성이 변경 금지 목록이라
 * 상호작용까지 바꾸는 것은 이 REQ 의 범위를 넘는다.
 */
export const FilterTabs = ({
  options,
  value,
  onChange,
  label,
  variant = "segmented",
}: Props) => {
  return (
    <div className={filterContainer({ variant })} role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          className={tabButton({ variant, active: value === opt.value })}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
