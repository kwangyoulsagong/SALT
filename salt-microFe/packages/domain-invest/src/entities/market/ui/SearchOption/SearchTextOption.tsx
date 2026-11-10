"use client";

// 클라이언트 잎: 누름을 부르는 쪽에 알린다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { splitHighlight } from "@repo/core/search";
import Link from "next/link";
import type { MouseEvent } from "react";

import { SEARCH_MESSAGES } from "../../model/messages";
import * as styles from "./SearchOption.css";

export interface SearchTextOptionProps {
  /** `aria-activedescendant` 가 가리키는 id */
  id: string;
  active: boolean;
  /** 있으면 링크(업종 · 지수 → 국내 시세 표), 없으면 누름만(뉴스 → 모달) */
  href?: string;
  onSelect: () => void;
  onHover?: () => void;
  /** 업종 · 지수 이름 · 뉴스 제목 */
  title: string;
  /** 제목에서 굵게 할 검색어 */
  highlight?: string;
  /** 제목 아래 한 줄(지수 값 · 뉴스 시각 · 출처) */
  meta?: string;
  /** 순위(1부터) — 첫 화면 "지금 뜨는 업종" */
  rank?: number;
  /** 업종 · 지수 등락률. 뉴스는 없음 */
  changeRate?: number | null;
  /** 결과 격자 안이면 줄(`row` > `gridcell`), 첫 화면 목록이면 선택지(`option`) — `SearchOption` 과 같은 규칙 */
  inGrid?: boolean;
}

const changeKind = (value: number) => (value > 0 ? "up" : value < 0 ? "down" : "flat");

/**
 * 검색 모달 글자 행(`FE-REQ-066` FR-8) — 업종 · 지수 · 뉴스. 로고 · 현재가가 없는 `SearchOption` 의 짝(같은 면 · 같은 고른 표시 · 같은 ↵ 칩).
 * 표시 전용 — 조회 · mutation 을 부르지 않는다. 등락은 색 + 부호 글자
 */
export const SearchTextOption = ({
  id,
  active,
  href,
  onSelect,
  onHover,
  title,
  highlight = "",
  meta,
  rank,
  changeRate,
  inGrid = false,
}: SearchTextOptionProps) => {
  const onClick = (event: MouseEvent<HTMLElement>) => {
    // 새 탭 · 새 창은 브라우저 몫 — 모달을 닫지 않는다
    if (href && (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)) return;
    if (!href) event.preventDefault();
    onSelect();
  };

  const body = (
    <>
      {rank !== undefined ? <span className={styles.rank}>{rank}</span> : null}
      <span className={styles.nameBlock}>
        <span className={styles.nameClamp}>
          {splitHighlight(title, highlight).map((part, index) =>
            part.match ? (
              <mark key={index} className={styles.mark}>
                {part.text}
              </mark>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </span>
        {meta ? <span className={styles.code}>{meta}</span> : null}
      </span>
      {changeRate === undefined ? null : (
        <span className={styles.values}>
          {changeRate === null ? (
            <span className={styles.change.flat}>{SEARCH_MESSAGES.valueUnknown}</span>
          ) : (
            <span className={styles.change[changeKind(changeRate)]}>{SEARCH_MESSAGES.changeRate(changeRate)}</span>
          )}
        </span>
      )}
      <span className={styles.enterChip} aria-hidden="true">
        {SEARCH_MESSAGES.keys.enter}
      </span>
    </>
  );
  const className = rank !== undefined ? styles.option.text : styles.option.rank;
  const selectable = (props: { id?: string; role?: string; "aria-selected"?: boolean }) =>
    href ? (
      <Link {...props} href={href} prefetch={false} tabIndex={-1} className={className} onClick={onClick} onMouseMove={onHover}>
        {body}
      </Link>
    ) : (
      // 뉴스 — 주소가 없다(모달을 연다). 포커스는 검색칸에 있고 Enter 는 검색칸이 받는다 — 여기는 누름만
      <div {...props} tabIndex={-1} className={className} onClick={onClick} onMouseMove={onHover}>
        {body}
      </div>
    );

  if (inGrid) {
    return (
      <div role="row" className={styles.row}>
        <div role="gridcell" id={id} aria-selected={active} className={styles.cell}>
          {selectable({})}
        </div>
      </div>
    );
  }
  return (
    <li role="none" className={styles.row}>
      {selectable({ id, role: "option", "aria-selected": active })}
    </li>
  );
};
