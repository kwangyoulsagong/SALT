/** 휴대폰 홈 `/m/home`(`FE-REQ-072` FR-1 · FR-2) — 아래 본문 주석 */
import Link from "next/link";
import type { ReactNode } from "react";

import type { AppHomeVM, HomeDomain, HomeRecentItem, HomeSummaryCard, HomeUpcomingItem } from "@repo/core/home";
import { MOBILE_PATHS, toMobileHref } from "@repo/core/mobile";
import { ServiceIcon, type ServiceIconVariant } from "@repo/ui/serviceicon";

import { serverBffRead } from "../../api/server";

import { DesktopViewLink } from "./DesktopViewLink";
import { MOBILE_HOME_MESSAGES as M } from "./messages";
import { MobileHead, MobileScreen, MobileSection } from "./MobileScreen";
import * as s from "./MobileHome.css";

/** 홈 카드 도메인 아이콘 — 데스크톱 홈(`entities/home` `HOME_DOMAIN_ICON`)과 같은 3D 한 벌(사용자 제작) */
const DOMAIN_ICON: Readonly<Record<HomeDomain, ServiceIconVariant>> = {
  savings: "ranking",
  household: "household",
  invest: "analysis",
  tips: "tip",
};

/** 온보딩 상태 — BFF `GET /api/app/onboarding` 중 배너가 읽는 칸만 */
interface OnboardingState {
  nextStep: keyof typeof M.steps | null;
  complete: boolean;
}

/** 서버가 준 주소 — `/m` 짝이 있으면 같은 zone 링크, 없으면 문서 이동(`<a>`) */
const RowLink = ({ href, className, children }: { href: string; className: string; children: ReactNode }) => {
  const to = toMobileHref(href);
  return to.startsWith("/m/") ? (
    <Link href={to} className={className}>
      {children}
    </Link>
  ) : (
    <a href={to} className={className}>
      {children}
    </a>
  );
};

const Chevron = () => (
  <svg className={s.chevron} width="16" height="16" viewBox="0 0 24 24" aria-hidden focusable="false">
    <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CardRow = ({ card }: { card: HomeSummaryCard }) => (
  <li>
    <RowLink href={card.href} className={s.row}>
      <ServiceIcon variant={DOMAIN_ICON[card.domain]} />
      <span className={s.rowMain}>
        <span className={s.rowTitle}>{card.title}</span>
        {card.state === "degraded" ? (
          <span className={s.rowSub}>{M.degraded}</span>
        ) : card.primary ? (
          <span className={s.rowSub}>{card.secondary ? `${card.primary.label} · ${card.secondary.label} ${card.secondary.value}` : card.primary.label}</span>
        ) : card.action ? (
          <span className={s.rowSub}>{card.action}</span>
        ) : null}
      </span>
      {card.state !== "degraded" && card.primary ? <span className={s.rowValue}>{card.primary.value}</span> : null}
      <Chevron />
    </RowLink>
  </li>
);

const FeedRow = ({ item }: { item: HomeRecentItem | HomeUpcomingItem }) => (
  <li>
    <RowLink href={item.href} className={s.row}>
      <span className={s.rowMain}>
        <span className={s.rowTitle}>{item.title ?? M.expenseFallback}</span>
        <span className={s.rowSub}>{M.feedSub(item.detail, item.date)}</span>
      </span>
      {item.amount ? <span className={s.rowValue}>{item.amount}</span> : null}
    </RowLink>
  </li>
);

const Feed = ({ title, items, empty }: { title: string; items: (HomeRecentItem | HomeUpcomingItem)[] | null; empty: string }) => (
  <MobileSection title={title}>
    {items === null ? (
      <p className={s.note}>{M.unavailable}</p>
    ) : items.length === 0 ? (
      <p className={s.note}>{empty}</p>
    ) : (
      <ul className={s.rows}>
        {/* 같은 날 같은 목표에 두 번 넣으면 주소 · 날짜 · 이름이 같다 — 서버 순서 그대로라 자리로 가른다 */}
        {items.map((item, index) => (
          <FeedRow key={`${index}-${item.href}-${item.date}`} item={item} />
        ))}
      </ul>
    )}
  </MobileSection>
);

/**
 * 휴대폰 홈 `/m/home`(`FE-REQ-072` FR-1 · FR-2 ← `FE-REQ-060` FR-M3) — **BFF 카드 계약으로** 그린다. 셸 `entities/home` 을 패키지로 옮기지 않았다:
 * 홈은 도메인이 아니고 셸 코드는 `/m` 이 가져올 수 없다(앱 `src` 경계). 같은 응답(`GET /api/app/home`)을 서버에서 받아 행으로만.
 *
 * 맨 위 시작하기 배너(온보딩이 남았을 때 — 단계 이름은 서버 `nextStep`) → 카드 행(도메인 3D 아이콘 · 이름 · 주인공 값 · 셰브론, 순서 · 숨김은 서버) →
 * 최근 기록 · 다가오는 일. 값은 BFF 문자열 그대로(계산 0). 데스크톱의 카드 미리보기 그림은 휴대폰 목록 행에 없다(웹뷰 때와 같다)
 */
export const MobileHomePage = async () => {
  const [home, onboarding] = await Promise.all([
    serverBffRead<AppHomeVM>("/api/app/home"),
    serverBffRead<OnboardingState>("/api/app/onboarding"),
  ]);

  if (!home) {
    return (
      <MobileScreen>
        <MobileHead title={M.title} />
        <p className={s.note}>{onboarding === null ? M.signedOutOrFailed : M.loadFailed}</p>
        <Link href={MOBILE_PATHS.login} className={s.textLink}>
          {M.signIn}
        </Link>
      </MobileScreen>
    );
  }

  const hidden = new Set(home.hidden);
  const cards = home.order
    .filter((domain) => !hidden.has(domain))
    .map((domain) => home.cards.find((card) => card.domain === domain))
    .filter((card): card is HomeSummaryCard => card !== undefined);
  const step = onboarding && !onboarding.complete && onboarding.nextStep ? onboarding.nextStep : null;

  return (
    <MobileScreen>
      <MobileHead title={M.title} />
      {step ? (
        // 시작하기는 데스크톱 화면이다(초대 · 고르기 — FEATURE-019 FR-5) — 문서 이동 + "데스크톱 화면으로 보기" 쿠키
        <div className={s.banner}>
          <span className={s.bannerText}>{M.banner(M.steps[step])}</span>
          <DesktopViewLink to="/onboarding" />
        </div>
      ) : null}
      <MobileSection label={M.cardsLabel}>
        <ul className={s.rows}>
          {cards.map((card) => (
            <CardRow key={card.domain} card={card} />
          ))}
        </ul>
      </MobileSection>
      <Feed title={M.recentTitle} items={home.recent} empty={M.recentEmpty} />
      <Feed title={M.upcomingTitle} items={home.upcoming} empty={M.upcomingEmpty} />
    </MobileScreen>
  );
};
