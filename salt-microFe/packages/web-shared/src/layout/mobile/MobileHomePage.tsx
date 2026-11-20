/** 휴대폰 홈 `/m/home`(`FE-REQ-072` FR-1 · FR-2) — 아래 본문 주석 */
import Link from "next/link";
import type { ReactNode } from "react";

import type { AppHomeVM, HomeDomain, HomeRecentItem, HomeSummaryCard, HomeUpcomingItem } from "@repo/core/home";
import { MOBILE_PATHS, toMobileHref } from "@repo/core/mobile";
import { ServiceIcon, type ServiceIconVariant } from "@repo/ui/serviceicon";

import { serverBffRead } from "../../api/server";

import { DesktopViewLink } from "./DesktopViewLink";
import { MOBILE_HOME_MESSAGES as M } from "./messages";
import { MobileProfileHead } from "./MobileProfileHead";
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

/**
 * 도메인 카드 행(기준 화면 분석 §11) — 왼쪽 아이콘 판 44 · **금액이 주인공**(22 Bold) · 그 아래 이름 · 오른쪽 회색 알약(그 도메인의 다음 행동).
 * 카드 전체가 링크라 알약은 글자 모양이다(링크 안에 링크를 두지 않는다). 값 문구는 BFF 그대로
 */
const CardRow = ({ card }: { card: HomeSummaryCard }) => {
  const degraded = card.state === "degraded";
  const lead = degraded ? M.degraded : card.primary?.value ?? card.action ?? "";
  const sub = [card.title, !degraded && card.primary ? card.primary.label : null].filter(Boolean).join(" · ");
  return (
    <li className={s.cardItem}>
      <RowLink href={card.href} className={s.row}>
        <span className={s.iconTile}>
          <ServiceIcon variant={DOMAIN_ICON[card.domain]} />
        </span>
        <span className={s.rowMain}>
          <span className={degraded || card.state === "empty" ? s.leadQuiet : s.lead}>{lead}</span>
          <span className={s.rowSub}>{sub}</span>
        </span>
        <span className={s.pill}>{card.state === "empty" && card.action ? card.action : M.pill[card.domain]}</span>
      </RowLink>
      {card.secondary && !degraded ? (
        <p className={s.cardFoot}>
          <span>{card.secondary.label}</span>
          <span className={s.cardFootValue}>{card.secondary.value}</span>
        </p>
      ) : null}
    </li>
  );
};

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
      {/* 머리 = 프로필(Figma "홈") — 다른 탭은 화면 제목 */}
      <MobileProfileHead />
      {step ? (
        // 시작하기는 데스크톱 화면이다(초대 · 고르기 — FEATURE-019 FR-5) — 문서 이동 + "데스크톱 화면으로 보기" 쿠키
        <div className={s.banner}>
          <span className={s.bannerText}>{M.banner(M.steps[step])}</span>
          <DesktopViewLink to="/onboarding" />
        </div>
      ) : null}
      <ul className={s.cardStack} aria-label={M.cardsLabel}>
        {cards.map((card) => (
          <CardRow key={card.domain} card={card} />
        ))}
      </ul>
      <Feed title={M.recentTitle} items={home.recent} empty={M.recentEmpty} />
      <Feed title={M.upcomingTitle} items={home.upcoming} empty={M.upcomingEmpty} />
    </MobileScreen>
  );
};
