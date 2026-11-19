import type { ReactNode } from "react";

import { NavChevron } from "../NavChevron/NavChevron";
import { ZoneLink } from "../ZoneLink/ZoneLink";
import { block, blockTitle, hint as hintClass, name, row, text } from "./SideRow.css";

/** 사이드 묶음 — 제목 13/600 + 행 목록. `PageFrame` `side` 에 넣는다 */
export const SideBlock = ({ title, titleId, children }: { title: string; titleId: string; children: ReactNode }) => (
  <section className={block} aria-labelledby={titleId}>
    <h2 id={titleId} className={blockTitle}>
      {title}
    </h2>
    {children}
  </section>
);

export interface SideRowProps {
  href: string;
  /** 왼쪽 그림(장식) — 3D 서비스 아이콘 */
  icon: ReactNode;
  label: string;
  /** 이름 아래 한 줄(12/500 · 2단) */
  hint?: string;
}

/**
 * 사이드 목록 행 하나 — 행 전체가 링크, 오른쪽 셰브론(다른 화면으로 간다). zone 을 넘으면 `<a>`, 같은 zone 이면 `<Link>`(`ZoneLink`)
 */
export const SideRow = ({ href, icon, label, hint }: SideRowProps) => (
  <ZoneLink href={href} className={row}>
    {icon}
    <span className={text}>
      <span className={name}>{label}</span>
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </span>
    <NavChevron />
  </ZoneLink>
);
