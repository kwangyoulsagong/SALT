import React, {
  ReactNode,
  HTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from "react";
import {
  tableContainerStyles,
  tableStyles,
  tableHeaderStyles,
  tableHeaderCellStyles,
  tableBodyStyles,
  tableRowStyles,
  tableCellStyles,
  emptyStateStyles,
  sortIconStyles,
  sortArrowStyles,
} from "./styles/table.css.ts";

// ===== Table Container =====
export interface TableContainerProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
  children: ReactNode;
}

export const TableContainer = ({
  bordered = false,
  children,
  className,
  ...props
}: TableContainerProps) => {
  return (
    <div
      className={`${tableContainerStyles({ bordered })} ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
};

// ===== Table =====
export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  size?: "sm" | "md" | "lg";
  layout?: "auto" | "fixed";
  striped?: boolean;
  hoverable?: boolean;
  children: ReactNode;
}

export const Table = ({
  size = "md",
  layout = "auto",
  striped = false,
  hoverable = false,
  children,
  className,
  ...props
}: TableProps) => {
  return (
    <table
      className={`${tableStyles({ size, layout, striped, hoverable })} ${
        className || ""
      }`}
      {...props}
    >
      {children}
    </table>
  );
};

// ===== Table Header =====
export interface TableHeaderProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  bordered?: boolean;
  background?: "white" | "secondary" | "tertiary" | "transparent";
  children: ReactNode;
}

export const TableHeader = ({
  children,
  bordered = true,
  background = "white",
  className,
  ...props
}: TableHeaderProps) => {
  return (
    <thead
      className={`${tableHeaderStyles({ bordered, background })} ${
        className || ""
      }`}
      {...props}
    >
      {children}
    </thead>
  );
};

// ===== Table Header Cell =====
export interface TableHeaderCellProps
  extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  sortable?: boolean;
  sorted?: "asc" | "desc" | null;
  onSort?: () => void;
  nowrap?: boolean;
  children: ReactNode;
}

export const TableHeaderCell = ({
  align = "left",
  sortable = false,
  sorted = null,
  onSort,
  nowrap = false,
  children,
  className,
  onClick,
  ...props
}: TableHeaderCellProps) => {
  const handleClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
    if (sortable && onSort) {
      onSort();
    }
    onClick?.(e);
  };

  const cellClassName = nowrap
    ? `${tableHeaderCellStyles({ align, sortable })} ${tableCellStyles({
        nowrap,
      })} ${className || ""}`
    : `${tableHeaderCellStyles({ align, sortable })} ${className || ""}`;

  return (
    <th className={cellClassName} onClick={handleClick} {...props}>
      {children}
      {sortable && (
        <div className={sortIconStyles}>
          <div
            className={sortArrowStyles({
              direction: "up",
              active: sorted === "asc",
            })}
          />
          <div
            className={sortArrowStyles({
              direction: "down",
              active: sorted === "desc",
            })}
          />
        </div>
      )}
    </th>
  );
};

// ===== Table Body =====
export interface TableBodyProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export const TableBody = ({
  children,
  className,
  ...props
}: TableBodyProps) => {
  return (
    <tbody className={`${tableBodyStyles} ${className || ""}`} {...props}>
      {children}
    </tbody>
  );
};
export type MemoKey = string | number | boolean | null | undefined | MemoKey[];

// ===== Table Row =====
export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  memoKey?: MemoKey;
  hoverable?: boolean;
  clickable?: boolean;
  selected?: boolean;
  striped?: boolean;
  bordered?: boolean;
  children: ReactNode;
}

export const TableRow = React.memo(
  function TableRowComponent({
    hoverable = false,
    clickable = false,
    selected = false,
    striped = false,
    bordered = false,
    memoKey,
    children,
    className,
    ...props
  }: TableRowProps) {
    return (
      <tr
        className={`${tableRowStyles({
          hoverable,
          clickable,
          selected,
          striped,
          bordered,
        })} ${className || ""}`}
        {...props}
      >
        {children}
      </tr>
    );
  },
  (prev, next) => prev.memoKey === next.memoKey
);

// ===== Table Cell =====
export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  nowrap?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export const TableCell = ({
  align = "left",
  nowrap = false,
  size = "md",
  children,
  className,
  ...props
}: TableCellProps) => {
  return (
    <td
      className={`${tableCellStyles({ align, nowrap, size })} ${
        className || ""
      }`}
      {...props}
    >
      {children}
    </td>
  );
};

// ===== Empty State =====
export interface EmptyStateProps {
  message?: string;
  colSpan?: number;
}

export const EmptyState = ({
  message = "데이터가 없습니다",
  colSpan = 100,
}: EmptyStateProps) => {
  return (
    <tr>
      <td colSpan={colSpan} className={emptyStateStyles}>
        {message}
      </td>
    </tr>
  );
};
