"use client";

// 클라이언트 잎: 누름을 부르는 쪽에 알린다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { splitHighlight } from "@repo/core/search";
import { AssetIcon } from "@repo/ui/assetIcon";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { formatPrice } from "@repo/web-shared/lib";

import { SEARCH_MESSAGES } from "../../model/messages";
import { MarketAssetClass } from "../../model/types";
import * as styles from "./SearchOption.css";

export interface SearchOptionProps {
  /** `aria-activedescendant` 가 가리키는 id */
  id: string;
  /** 키보드로 고른 행 */
  active: boolean;
  href: string;
  /** 누름 · Enter — 최근 검색 저장 · 모달 닫기는 부르는 쪽이 안다 */
  onSelect: () => void;
  /** 고른 행을 마우스로 옮긴다(키보드와 같은 고른 행 하나) */
  onHover?: () => void;
  assetType: string;
  symbol: string;
  name: string;
  logoUrl: string | null;
  /** 이름에서 굵게 할 검색어(`FE-REQ-066` FR-4). 없으면 그대로 */
  highlight?: string;
  /** 순위 행이면 순번(1부터) — 코드 · 현재가 없이 44 행 */
  rank?: number;
  currentPrice?: number | null;
  changeRate: number | null;
  /**
   * ★ 자리. 있으면 행이 **격자 한 줄**(`role="row"` — 고르는 칸 + ★ 칸)이고 목록은 `role="grid"` 여야 한다.
   * 없으면 목록 선택지(`role="option"`) — 선택지 안이나 목록 바로 밑에 단추를 둘 수 없어서다(2026-11-09 axe)
   */
  action?: ReactNode;
}

const changeKind = (value: number) => (value > 0 ? "up" : value < 0 ? "down" : "flat");

/**
 * 검색 모달 한 행 (`FE-REQ-066` FR-3 · FR-4) — 결과(54: 로고 · 이름 · 코드 · 현재가 · 등락률)와 거래대금 순위(44: 순번 · 로고 · 이름 · 등락률)
 * 두 모양. 표시 전용 — 조회 · mutation 을 부르지 않는다(`fsd-entities.md`).
 *
 * 등락은 색 + 부호 글자(`+` · `−`)를 같이 둔다(FR-6). 값이 없으면 "—"(0 이 아니다)
 *
 * 고른 표시(`aria-selected`)는 `id` 가 붙은 요소에 — 검색칸의 `aria-activedescendant` 가 그것을 가리킨다(선택지 또는 격자 칸)
 */
export const SearchOption = ({
  id,
  active,
  href,
  onSelect,
  onHover,
  assetType,
  symbol,
  name,
  logoUrl,
  highlight = "",
  rank,
  currentPrice,
  changeRate,
  action,
}: SearchOptionProps) => {
  const isKr = assetType === MarketAssetClass.KrStock;
  const isRank = rank !== undefined;

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // 새 탭 · 새 창은 브라우저 몫 — 모달을 닫지 않는다
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    onSelect();
  };

  const body = (
    <>
        {isRank ? <span className={styles.rank}>{rank}</span> : null}
        <AssetIcon
          // 국내 주식 코드(005930)는 이니셜이 "00" 이 된다 — 이름으로 만든다
          symbol={isKr ? name : symbol}
          src={logoUrl ?? undefined}
          name={name}
          size="md"
        />
        <span className={styles.nameBlock}>
          <span className={styles.name}>
            {splitHighlight(name, highlight).map((part, index) =>
              part.match ? (
                <mark key={index} className={styles.mark}>
                  {part.text}
                </mark>
              ) : (
                <span key={index}>{part.text}</span>
              ),
            )}
          </span>
          {isRank ? null : <span className={styles.code}>{symbol}</span>}
        </span>
        <span className={styles.values}>
          {isRank ? null : (
            <span className={styles.price}>
              {currentPrice === null || currentPrice === undefined
                ? SEARCH_MESSAGES.valueUnknown
                : SEARCH_MESSAGES.price(formatPrice(currentPrice))}
            </span>
          )}
          {changeRate === null ? (
            <span className={styles.change.flat}>{SEARCH_MESSAGES.valueUnknown}</span>
          ) : (
            <span className={styles.change[changeKind(changeRate)]}>{SEARCH_MESSAGES.changeRate(changeRate)}</span>
          )}
        </span>
        <span className={styles.enterChip} aria-hidden="true">
          {SEARCH_MESSAGES.keys.enter}
        </span>
    </>
  );
  const linkClass = isRank ? styles.option.rank : styles.option.result;

  if (action) {
    return (
      <div role="row" className={styles.row}>
        <div role="gridcell" id={id} aria-selected={active} className={styles.cell}>
          <Link href={href} prefetch={false} tabIndex={-1} className={linkClass} onClick={onClick} onMouseMove={onHover}>
            {body}
          </Link>
        </div>
        <div role="gridcell" className={styles.action}>
          {action}
        </div>
      </div>
    );
  }

  return (
    <li role="none" className={styles.row}>
      <Link
        id={id}
        role="option"
        aria-selected={active}
        tabIndex={-1}
        href={href}
        prefetch={false}
        className={linkClass}
        onClick={onClick}
        onMouseMove={onHover}
      >
        {body}
      </Link>
    </li>
  );
};
