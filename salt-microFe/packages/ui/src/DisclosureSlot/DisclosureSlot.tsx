import { itemStyles, listStyles, slotStyles } from "./styles/disclosureSlot.css";

/** 고지 세 줄. 튜플이라 빠진 줄 · 빈 배열을 타입이 막는다 */
export type DisclosureLines = readonly [string, string, string];

export interface DisclosureSlotProps {
  /** 세 줄 고지. **필수다** — 끄는 prop 이 없다. 문구는 앱이 소유한다(이 패키지는 비즈니스 문구를 갖지 않는다) */
  lines: DisclosureLines;
  /** 스크린 리더가 읽을 묶음 이름 */
  label: string;
  className?: string;
}

/**
 * 카드 아래 고정 고지 자리. 숨김 · 접힘 · 끄기 variant 가 없다 — 카드가 이 자리를 그리면 세 줄이 늘 보인다.
 * 빈 문자열 줄 하나 때문에 자리 전체가 사라지지 않는다 — 그 줄만 빼고 나머지를 그린다.
 */
export const DisclosureSlot = ({ lines, label, className }: DisclosureSlotProps) => (
  <div role="note" aria-label={label} className={`${slotStyles} ${className || ""}`}>
    <ul className={listStyles}>
      {lines.map((line, index) =>
        line.trim() === "" ? null : (
          <li key={index} className={itemStyles}>
            {line}
          </li>
        ),
      )}
    </ul>
  </div>
);
