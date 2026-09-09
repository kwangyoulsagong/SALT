import type { ReactNode } from "react";
import {
  actionStyles,
  countStyles,
  headerStyles,
  listGroupStyles,
  titleStyles,
} from "./styles/listGroup.css";

export interface ListGroupProps {
  children: ReactNode;
  title?: ReactNode;
  /** 제목 옆 항목 수. 0도 표시된다. */
  count?: number;
  /** 헤더 오른쪽 슬롯. "더보기" 같은 액션을 넣는다. */
  action?: ReactNode;
  className?: string;
}

/**
 * 흰 배경 리스트 그룹.
 * 그룹 사이는 카드가 아니라 `SectionBand`로 끊는다 (FE-REQ-005 D-8).
 */
export const ListGroup = ({
  children,
  title,
  count,
  action,
  className,
}: ListGroupProps) => {
  const hasHeader = Boolean(title || action || count !== undefined);

  return (
    <section className={`${listGroupStyles} ${className || ""}`}>
      {hasHeader ? (
        <div className={headerStyles}>
          {title ? <h2 className={titleStyles}>{title}</h2> : null}
          {count !== undefined ? (
            <span className={countStyles}>{count.toLocaleString("ko-KR")}</span>
          ) : null}
          {action ? <div className={actionStyles}>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
};
