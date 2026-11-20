import Link from "next/link";
import type { ReactNode } from "react";

import { MOBILE_MESSAGES } from "./messages";
import { backLink, card, detailScreen, detailTop, head, headTitle, screen, section, sectionHead, sectionTitle } from "./MobileScreen.css";

/**
 * 휴대폰 화면 조각(`FE-REQ-072` FR-2 · `screen-mobile.md` §3 · §4) — 도메인 패키지 `src/mobile` 진입점이 같이 쓴다.
 * 서버 컴포넌트(상태 0). 글자는 `appType` 만
 */

/**
 * 화면 한 장. `tab`(기본) = 회색 바탕 위 카드 쌓기(탭 화면) · `detail` = 흰 섹션 + 회색 띠(상세 — 머리는 `MobileDetailTop` 에)
 */
export const MobileScreen = ({ children, variant = "tab" }: { children: ReactNode; variant?: "tab" | "detail" }) => (
  <div className={variant === "detail" ? detailScreen : screen}>{children}</div>
);

/** 상세 머리 칸 — 흰 면(뒤로 · 이름 · 큰 숫자). 상세 화면 첫 칸 */
export const MobileDetailTop = ({ children }: { children: ReactNode }) => <div className={detailTop}>{children}</div>;

/**
 * 화면 머리 — 제목 `t3`. 탭 안 push 화면(상세)은 왼쪽 뒤로 하나(`screen-mobile.md` §4 내비 바).
 * 뒤로는 같은 zone 링크다 — 목록에서 왔든 링크로 바로 왔든 같은 곳(목록)으로 간다
 */
export const MobileHead = ({ title, back, trailing }: { title: ReactNode; back?: { href: string; label: string }; trailing?: ReactNode }) => (
  <header className={head}>
    {back ? (
      <Link href={back.href} className={backLink} aria-label={MOBILE_MESSAGES.back(back.label)}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    ) : null}
    <h1 className={headTitle}>{title}</h1>
    {trailing}
  </header>
);

/** 카드 한 장 — 회색 바탕 위 흰 면(섹션 머리가 없는 묶음) */
export const MobileCard = ({ children, label }: { children: ReactNode; label?: string }) => (
  <div className={card} aria-label={label} role={label ? "group" : undefined}>
    {children}
  </div>
);

/** 섹션 — 카드 한 장. 머리 `t5` + 내용. 제목이 없으면 내용만 */
export const MobileSection = ({ title, action, children, label }: { title?: string; action?: ReactNode; children: ReactNode; label?: string }) => (
  <section className={section} aria-label={title ? undefined : label}>
    {title ? (
      <div className={sectionHead}>
        <h2 className={sectionTitle}>{title}</h2>
        {action}
      </div>
    ) : null}
    {children}
  </section>
);
