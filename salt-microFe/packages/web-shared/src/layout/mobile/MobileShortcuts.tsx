import { ServiceIcon, type ServiceIconVariant } from "@repo/ui/serviceicon";
import Link from "next/link";

import * as s from "./MobileShortcuts.css";

export interface MobileShortcut {
  href: string;
  icon: ServiceIconVariant;
  label: string;
  /** 이름 아래 보조 한 줄(`t7`) — 없으면 이름만 */
  hint?: string;
}

/**
 * 바로가기 목록 카드(`mobile-design.md` §2 · `FE-REQ-074` FR-4) — 흰 카드 한 장 · 행 56 · 3D 아이콘 32 · 이름 `t5` Semibold · 셰브론.
 * 같은 `/m` zone 안 이동만(`next/link`). 홈 "바로가기" · 투자 탭 "코치 리포트"가 같이 쓴다
 */
export const MobileShortcuts = ({ items, label }: { items: readonly MobileShortcut[]; label: string }) =>
  items.length === 0 ? null : (
    <ul className={s.list} aria-label={label}>
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={s.row}>
            <span className={s.icon}>
              <ServiceIcon variant={item.icon} />
            </span>
            <span className={s.main}>
              <span className={s.label}>{item.label}</span>
              {item.hint ? <span className={s.hint}>{item.hint}</span> : null}
            </span>
            <svg className={s.chevron} width="20" height="20" viewBox="0 0 24 24" aria-hidden focusable="false">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
