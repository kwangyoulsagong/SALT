import type { ReactNode } from "react";
import {
  keyValueListStyles,
  labelStyles,
  rowStyles,
  valueStyles,
} from "./styles/keyValueList.css";

export type KeyValueTone = "default" | "up" | "down" | "muted";

export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
  tone?: KeyValueTone;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  columns?: 1 | 2;
  className?: string;
}

/** 시세 2열 그리드, 파라미터 목록처럼 라벨-값 쌍을 줄 세운다. */
export const KeyValueList = ({
  items,
  columns = 1,
  className,
}: KeyValueListProps) => {
  // 마지막 줄에서만 구분선을 지운다. 2열이면 마지막 줄에 최대 2칸이 있다.
  const lastRowStart =
    items.length === 0
      ? 0
      : Math.floor((items.length - 1) / columns) * columns;

  return (
    <dl className={`${keyValueListStyles({ columns })} ${className || ""}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className={rowStyles({ last: index >= lastRowStart })}
        >
          <dt className={labelStyles}>{item.label}</dt>
          <dd className={valueStyles({ tone: item.tone || "default" })}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};
