import { useRef, type KeyboardEvent } from "react";

import { filterContainer, tabButton } from "../FilterTabs/styles/filterTab.css";
import { nextSegmentIndex } from "./nextIndex";

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 무엇을 고르는지. 화면에 보이지 않고 스크린리더가 읽는다 */
  label: string;
}

/**
 * 하나만 고르는 세그먼트 — **`radiogroup`** 이다.
 *
 * 생김새는 `FilterTabs` 와 같다(같은 스타일을 쓴다). 다른 것은 상호작용이다:
 * `FilterTabs` 는 눌림 버튼 묶음(`aria-pressed`)이라 칸마다 Tab 이 멈추고, 이것은
 * **roving tabindex** 라 묶음 전체가 Tab 한 번이고 칸 사이는 화살표로 움직인다.
 * 화살표로 옮기면 바로 선택된다(라디오 동작). 값이 늘 하나여야 하는 스위치에 쓴다 —
 * 표 정렬처럼 여러 묶음을 빠르게 훑는 곳은 `FilterTabs` 를 쓴다.
 */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) => {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextSegmentIndex(event.key, selectedIndex, options.length);
    const option = next === null ? undefined : options[next];
    if (next === null || !option) return;

    event.preventDefault();
    buttonsRef.current[next]?.focus();
    if (option.value !== value) onChange(option.value);
  };

  return (
    <div
      className={filterContainer}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => {
        const checked = index === selectedIndex;
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={tabButton({ active: checked })}
            onClick={() => {
              if (!checked) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
