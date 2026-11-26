/** 휴대폰 홈 `/m/home`(`FE-REQ-072` FR-1 · FR-2) — 아래 본문 주석 */
import Link from "next/link";
import type { ReactNode } from "react";

import type { AppHomeVM, HomeDomain, HomeRecentItem, HomeSummaryCard, HomeUpcomingItem } from "@repo/core/home";
import { MOBILE_PATHS, MOBILE_ROUTES, toMobileHref, type OfflineSnapshot } from "@repo/core/mobile";
import { RolledText } from "@repo/ui/rolledText";
import { ServiceIcon, type ServiceIconVariant } from "@repo/ui/serviceicon";

import { serverBffRead } from "../../api/server";

import { DesktopViewLink } from "./DesktopViewLink";
import { MobileCardPreview } from "./MobileCardPreview";
import { MobileInstallCard } from "./MobileInstallCard";
import { MobilePushCard } from "./MobilePushCard";
import { MobileOfflineFallback, MobileOfflineSave } from "./MobileOffline";
import { MOBILE_HOME_MESSAGES as M } from "./messages";
import { MobileProfileHead } from "./MobileProfileHead";
import { MobileShortcuts } from "./MobileShortcuts";
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
          <span className={degraded || card.state === "empty" ? s.leadQuiet : s.lead}>
            {degraded || card.state === "empty" ? lead : <RolledText text={lead} />}
          </span>
          <span className={s.rowSub}>{sub}</span>
        </span>
        <span className={s.pill}>{card.state === "empty" && card.action ? card.action : M.pill[card.domain]}</span>
      </RowLink>
      {/* 미리보기 — 데스크톱 홈 카드와 같은 서버 값(흐름선 · 날마다 막대 · 목표 진척) */}
      {card.preview && !degraded ? <MobileCardPreview domain={card.domain} preview={card.preview} /> : null}
      {card.secondary && !degraded ? (
        <p className={s.cardFoot}>
          <span>{card.secondary.label}</span>
          <span className={s.cardFootValue}>{card.secondary.value}</span>
        </p>
      ) : null}
    </li>
  );
};

/** 두 칸 타일 — 옅은 도메인 색 면 · 오른쪽 아래 3D 그림 · 두 줄 제목(기준 화면 분석 §11 · 사용자 2026-11-20 "이런 아이콘들 카드 배경"). 숨긴 도메인은 뺀다 */
const QUICK: readonly { domain: HomeDomain; href: string; icon: ServiceIconVariant; title: readonly [string, string] }[] = [
  { domain: "household", href: MOBILE_ROUTES.household, icon: "household", title: M.quick.expense },
  { domain: "savings", href: MOBILE_ROUTES.goals, icon: "ranking", title: M.quick.deposit },
];

const QuickTiles = ({ hidden }: { hidden: ReadonlySet<HomeDomain> }) => {
  const tiles = QUICK.filter((tile) => !hidden.has(tile.domain));
  if (tiles.length === 0) return null;
  return (
    <ul className={s.tiles} aria-label={M.quick.label}>
      {tiles.map((tile) => (
        <li key={tile.domain} className={`${s.tile} ${s.tileTone[tile.domain]}`}>
          <Link href={tile.href} className={s.tileLink}>
            <span className={s.tileTitle}>
              {tile.title[0]}
              <br />
              {tile.title[1]}
            </span>
            <span className={s.tileArt}>
              <ServiceIcon variant={tile.icon} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

/** 바로가기 목록 카드 — 아이콘 · 이름 · 셰브론(기준 화면 분석 §11 목록 카드). 숨긴 도메인은 뺀다 */
const SHORTCUTS: readonly { domain: HomeDomain; href: string; icon: ServiceIconVariant; label: string }[] = [
  { domain: "invest", href: MOBILE_ROUTES.coachReport, icon: "analysis", label: M.shortcuts.report },
  { domain: "household", href: `${MOBILE_ROUTES.household}?view=calendar`, icon: "mission", label: M.shortcuts.calendar },
  { domain: "savings", href: MOBILE_ROUTES.goals, icon: "ranking", label: M.shortcuts.goals },
];

const Shortcuts = ({ hidden }: { hidden: ReadonlySet<HomeDomain> }) => (
  <MobileShortcuts items={SHORTCUTS.filter((row) => !hidden.has(row.domain))} label={M.shortcuts.label} />
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
 * 홈 한 벌(`FE-REQ-073` FR-1) — 화면이 보인 글자 그대로: 도메인 카드(이름 · 주인공 값) · 최근 기록 · 다가오는 일. 불러오지 못한 카드는 담지 않는다
 */
const homeOfflineSnapshot = (cards: HomeSummaryCard[], home: AppHomeVM): OfflineSnapshot => {
  const feed = (items: (HomeRecentItem | HomeUpcomingItem)[] | null) =>
    (items ?? []).map((item) => ({ label: item.title ?? M.expenseFallback, value: item.amount ?? "", sub: M.feedSub(item.detail, item.date) }));
  return {
    screen: "home",
    title: M.title,
    sections: [
      {
        title: M.cardsLabel,
        rows: cards
          .filter((card) => card.state !== "degraded")
          .map((card) => ({ label: card.title, value: card.primary?.value ?? card.action ?? "", ...(card.primary ? { sub: card.primary.label } : {}) })),
      },
      { title: M.recentTitle, rows: feed(home.recent) },
      { title: M.upcomingTitle, rows: feed(home.upcoming) },
    ],
  };
};

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
        {/* 받기 실패 — 이 기기에 그 사용자의 한 벌이 있으면 그것을(`FE-REQ-073` FR-2), 없으면 원래 안내 */}
        <MobileOfflineFallback screen="home">
          <p className={s.note}>{onboarding === null ? M.signedOutOrFailed : M.loadFailed}</p>
          <Link href={MOBILE_PATHS.login} className={s.textLink}>
            {M.signIn}
          </Link>
        </MobileOfflineFallback>
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
      <QuickTiles hidden={hidden} />
      <Shortcuts hidden={hidden} />
      <Feed title={M.recentTitle} items={home.recent} empty={M.recentEmpty} />
      <Feed title={M.upcomingTitle} items={home.upcoming} empty={M.upcomingEmpty} />
      <MobileOfflineSave snapshot={homeOfflineSnapshot(cards, home)} />
      {/* 설치 안내 — 첫 진입엔 0 · 설정 자리(맨 아래) · 닫으면 다시 안 뜸(`FE-REQ-073` FR-4) */}
      <MobileInstallCard />
      {/* 알림 — 설치한 앱에서 도메인별 켬/끔 · 이 기기 구독(`FE-REQ-078`). 서버 푸시가 꺼져 있거나 로그인 전이면 0 */}
      <MobilePushCard />
      {/* 홈 카드 순서 · 숨김은 데스크톱 설정(`arrange-home`) — 문서 이동 + "데스크톱 화면으로 보기" 쿠키 */}
      <a className={s.settingsPill} href={`${MOBILE_PATHS.desktop}?to=${encodeURIComponent("/settings")}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {M.settings}
      </a>
    </MobileScreen>
  );
};
