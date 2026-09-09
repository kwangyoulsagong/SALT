"use client";

import type { ReactNode } from "react";
import { Checkbox } from "../Checkbox/Checkbox";
import {
  allRowStyles,
  detailSlotStyles,
  itemRowStyles,
  listStyles,
  requiredStyles,
  wrapperStyles,
} from "./styles/agreement.css";

export interface AgreementItem {
  id: string;
  label: string;
  required?: boolean;
  /** 약관 전문 보기 같은 오른쪽 슬롯 */
  detail?: ReactNode;
}

export interface AgreementProps {
  items: AgreementItem[];
  /** 동의한 항목 id 목록 */
  value: string[];
  onChange: (value: string[]) => void;
  allLabel?: string;
  className?: string;
}

/**
 * 약관 동의 묶음.
 * 전체 선택은 하위 상태에 따라 indeterminate로 바뀐다.
 */
export const Agreement = ({
  items,
  value,
  onChange,
  allLabel = "약관에 모두 동의합니다",
  className,
}: AgreementProps) => {
  const allChecked = items.length > 0 && value.length === items.length;
  const someChecked = value.length > 0 && !allChecked;

  const toggleAll = (next: boolean) => {
    onChange(next ? items.map((item) => item.id) : []);
  };

  const toggleOne = (id: string, next: boolean) => {
    onChange(next ? [...value, id] : value.filter((item) => item !== id));
  };

  return (
    <div className={`${wrapperStyles} ${className || ""}`}>
      <div className={allRowStyles}>
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked}
          label={allLabel}
          onChange={toggleAll}
        />
      </div>

      <ul className={listStyles}>
        {items.map((item) => (
          <li key={item.id} className={itemRowStyles}>
            <Checkbox
              size="sm"
              checked={value.includes(item.id)}
              onChange={(next) => toggleOne(item.id, next)}
              label={
                <>
                  <span className={requiredStyles}>
                    {item.required ? "[필수] " : "[선택] "}
                  </span>
                  {item.label}
                </>
              }
            />
            {item.detail ? (
              <span className={detailSlotStyles}>{item.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};
