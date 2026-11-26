import type { ReactNode } from "react";

import { EVENT_KIND_LABELS } from "@repo/core/coach";
import { formatPrice } from "@repo/core/format";
import { AppNavigationIcon } from "@repo/ui/app-navigation";
import { AssetIcon } from "@repo/ui/assetIcon";
import { Illustration, type IllustrationScene } from "@repo/ui/illustration";
import { RolledText } from "@repo/ui/rolledText";
import { ServiceIcon, type ServiceIconVariant } from "@repo/ui/serviceicon";
import { Sparkline } from "@repo/ui/sparkline";

import { NavChevron, ZoneLink } from "@repo/web-shared/ui/frame";
import { iconTileSm } from "@repo/web-shared/ui/surface.css";

import { HOME_DOMAIN_ICON } from "../model/domainIcon";
import { HOME_DASHBOARD_MESSAGES as M, HOME_PLAN_ASSET_LABEL } from "../model/messages";
import type { CoachBriefing, HomeMarketEvent, HomeMarketItem, HomeSummaryCard, WeeklyPlanVM } from "../model/types";
import { HomeCardGhostPreview, HomeCardPreviewView } from "./HomeCardPreviewView";
import {
  block,
  blockArt,
  blockEmpty,
  blockHead,
  blockMore,
  blockTitle,
  briefingDot,
  briefingList,
  briefingRow,
  change,
  changeText,
  dateChip,
  dateDay,
  dateMonth,
  dday,
  ddayText,
  empty,
  eventList,
  eventMain,
  eventRow,
  eventsHead,
  indexBadge,
  kpiAction,
  kpiEmpty,
  kpiIcon,
  kpiLabel,
  kpiMain,
  kpiStrip,
  kpiSpark,
  kpiSub,
  kpiTile,
  kpiValue,
  marketKind,
  marketList,
  marketName,
  marketPrice,
  marketRow,
  marketSpark,
  marketTitle,
  marketValue,
  pillLink,
} from "./HomeDashboardView.css";

/**
 * 홈 대시보드 부품(2026-11-26 — `FE-REQ-048` FR-14~18). **표시 전용** — 값 · 순서 · 무엇을 보일지는 BFF · 서버. 화면은 글자 서식만(쉼표 · %).
 * 기록이 없으면 그래프 자리를 지우지 않고 회색 "예시" 그림으로 채운다(사용자 "그래프는 보여 줘야지, 없으면 지금처럼").
 */

// ── 블록 틀 ──────────────────────────────────────────────────────

interface HomeBlockProps {
  title: string;
  icon?: ServiceIconVariant;
  href?: string;
  linkLabel?: string;
  labelledBy: string;
  children: ReactNode;
}

export const HomeBlock = ({ title, icon, href, linkLabel = M.more, labelledBy, children }: HomeBlockProps) => (
  <section className={block} aria-labelledby={labelledBy}>
    <div className={blockHead}>
      {icon ? (
        <span className={`${iconTileSm} ${blockArt}`} aria-hidden>
          <ServiceIcon variant={icon} />
        </span>
      ) : null}
      <h2 id={labelledBy} className={blockTitle}>
        {title}
      </h2>
      {href ? (
        <ZoneLink href={href} className={blockMore}>
          {linkLabel}
          <NavChevron />
        </ZoneLink>
      ) : null}
    </div>
    {children}
  </section>
);

/** 블록 안 빈 상태 — 그림 한 장 + 한 줄(그림은 장식, 뜻은 글이 말한다) */
const BlockEmpty = ({ scene, text }: { scene: IllustrationScene; text: string }) => (
  <div className={blockEmpty}>
    <span aria-hidden>
      <Illustration scene={scene} size="sm" />
    </span>
    <p className={empty}>{text}</p>
  </div>
);

// ── 숫자 띠 ──────────────────────────────────────────────────────

const krw = (value: number) => M.krw(formatPrice(value));

const KpiTile = ({ href, icon, label, children }: { href: string; icon: ServiceIconVariant; label: string; children: ReactNode }) => (
  <ZoneLink href={href} className={kpiTile}>
    <span className={kpiIcon} aria-hidden>
      <ServiceIcon variant={icon} />
    </span>
    <span className={kpiMain}>
      <span className={kpiLabel}>{label}</span>
      {children}
    </span>
  </ZoneLink>
);

interface HomeKpiStripProps {
  cards: HomeSummaryCard[];
  /** 투자를 숨겼으면 `hidden` — 칸을 그리지 않는다 */
  plan: WeeklyPlanVM | "loading" | "error" | "hidden";
}

/** 맨 위 숫자 띠 — 도메인 카드의 주인공 값 + 이번 주 적립(같은 숫자를 아래에 다시 쓰지 않는다) */
export const HomeKpiStrip = ({ cards, plan }: HomeKpiStripProps) => (
  <div className={kpiStrip} role="group" aria-label={M.kpiLabel}>
    {cards.map((card) => (
      <KpiTile key={card.domain} href={card.href} icon={HOME_DOMAIN_ICON[card.domain]} label={card.primary?.label ?? card.title}>
        {card.state === "ok" && card.primary ? (
          <>
            <span className={kpiValue}>
              <RolledText text={card.primary.value} />
            </span>
            {card.secondary ? <span className={kpiSub}>{`${card.secondary.label} ${card.secondary.value}`}</span> : null}
            {card.preview?.kind === "trend" ? (
              <Sparkline points={card.preview.points} label={card.preview.label} area width={160} height={32} strokeWidth={1.5} className={kpiSpark} />
            ) : null}
          </>
        ) : card.state === "degraded" ? (
          <span className={kpiEmpty}>{M.unavailable}</span>
        ) : (
          <>
            <span className={kpiEmpty}>{card.primary?.value ?? card.title}</span>
            {card.action ? (
              <span className={kpiAction}>
                {card.action}
                <NavChevron />
              </span>
            ) : null}
          </>
        )}
      </KpiTile>
    ))}
    {plan === "hidden" ? null : (
      <KpiTile href="/plan" icon="mission" label={M.planTitle}>
        {plan === "loading" ? (
          <span className={kpiEmpty}>{M.loading}</span>
        ) : plan === "error" ? (
          <span className={kpiEmpty}>{M.unavailable}</span>
        ) : plan.configured && plan.totalKrw !== null ? (
          <>
            <span className={kpiValue}>
              <RolledText text={krw(plan.totalKrw)} />
            </span>
            <span className={kpiSub}>
              {plan.items
                .filter((item) => item.amountKrw !== null)
                .map((item) => `${HOME_PLAN_ASSET_LABEL[item.asset] ?? item.asset} ${krw(item.amountKrw ?? 0)}`)
                .join(" · ")}
            </span>
          </>
        ) : (
          <>
            <span className={kpiEmpty}>{M.planEmpty}</span>
            <span className={kpiAction}>
              {M.planAction}
              <NavChevron />
            </span>
          </>
        )}
      </KpiTile>
    )}
  </div>
);

// ── 큰 차트 칸 ───────────────────────────────────────────────────

/**
 * 카드 미리보기를 크게 — 기록이 있으면 서버 그림, 없으면 회색 예시 + 빈 안내. 주인공 금액은 숫자 띠에 있어 여기 다시 쓰지 않는다
 * (`screen-desktop.md` §5 같은 숫자 두 번 금지). 진척(목표)은 위부터 쌓고, 막대 · 흐름선만 큰 칸으로 키운다
 */
export const HomeChartBlock = ({ card, title, emptyText, labelledBy }: { card: HomeSummaryCard; title: string; emptyText: string; labelledBy: string }) => (
  <HomeBlock title={title} icon={HOME_DOMAIN_ICON[card.domain]} href={card.href} labelledBy={labelledBy}>
    {card.state === "ok" && card.preview ? (
      <HomeCardPreviewView domain={card.domain} preview={card.preview} size={card.preview.kind === "progress" ? "card" : "large"} />
    ) : (
      <>
        <p className={empty}>{card.state === "degraded" ? M.unavailable : emptyText}</p>
        <HomeCardGhostPreview domain={card.domain} size="large" />
      </>
    )}
  </HomeBlock>
);

// ── 시장 ─────────────────────────────────────────────────────────

const direction = (rate: number) => (rate > 0 ? "up" : rate < 0 ? "down" : "flat");
const rateText = (rate: number) => `${rate > 0 ? "+" : ""}${rate.toFixed(2)}%`;

const MarketRowBody = ({ item }: { item: HomeMarketItem }) => (
  <>
    {item.kind === "index" ? (
      <span className={indexBadge} aria-hidden>
        <AppNavigationIcon name="chart" size={16} />
      </span>
    ) : (
      <AssetIcon symbol={item.symbol} src={item.logoUrl ?? undefined} size="md" name={item.name} />
    )}
    <span className={marketName}>
      <span className={marketTitle}>{item.name}</span>
      <span className={marketKind}>{item.kind === "index" ? M.marketIndex : item.symbol}</span>
    </span>
    {item.sparkline && item.sparkline.length > 1 ? (
      <Sparkline points={item.sparkline} label={item.name} area width={140} height={32} strokeWidth={1.5} className={marketSpark} />
    ) : (
      <span />
    )}
    <span className={marketPrice}>
      <span className={marketValue}>{formatPrice(item.currentPrice)}</span>
      <span className={`${changeText} ${change[direction(item.changeRate)]}`}>{rateText(item.changeRate)}</span>
    </span>
  </>
);

export const HomeMarketView = ({ items, state }: { items: HomeMarketItem[]; state: "ok" | "loading" | "error" }) =>
  state === "error" || (state === "ok" && items.length === 0) ? (
    <BlockEmpty scene="candles" text={M.marketEmpty} />
  ) : (
    <ul className={marketList} aria-busy={state === "loading"}>
      {items.map((item) => (
        <li key={item.symbol}>
          {item.href ? (
            <ZoneLink href={item.href} className={marketRow}>
              <MarketRowBody item={item} />
            </ZoneLink>
          ) : (
            <div className={marketRow}>
              <MarketRowBody item={item} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );

// ── 코치 브리핑 ──────────────────────────────────────────────────

/** 오늘의 코치 브리핑 — 대화 첫 메시지와 같은 서버 문장(규칙 문장). 셋까지 · 나머지는 대화에서 */
export const HomeBriefingView = ({ briefing, state }: { briefing: CoachBriefing | null; state: "ok" | "loading" | "error" }) => {
  const sentences = briefing?.sentences.slice(0, 3) ?? [];
  return (
    <>
      {state === "error" ? (
        <BlockEmpty scene="coachBubble" text={M.unavailable} />
      ) : state === "ok" && sentences.length === 0 ? (
        <BlockEmpty scene="coachBubble" text={M.briefingEmpty} />
      ) : (
        <ol className={briefingList} aria-busy={state === "loading"}>
          {sentences.map((sentence, index) => (
            <li key={index} className={briefingRow}>
              <span className={briefingDot} aria-hidden>
                {index + 1}
              </span>
              <span>{sentence}</span>
            </li>
          ))}
        </ol>
      )}
      <ZoneLink href="/coach/chat" className={pillLink}>
        {M.briefingAction}
        <NavChevron />
      </ZoneLink>
    </>
  );
};

// ── 증시 일정 ────────────────────────────────────────────────────

const SOON_DAYS = 3;
/** "2026-11-27T01:00:00Z" → 한국 날짜의 달 · 날(서버 시각을 KST 로 표시만 — 지금 시각을 읽지 않는다) */
const kstParts = (iso: string) => {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return { month: kst.getUTCMonth() + 1, day: kst.getUTCDate() };
};

export const HomeMarketEvents = ({ events }: { events: HomeMarketEvent[] }) =>
  events.length === 0 ? null : (
    <>
      <p className={eventsHead}>{M.eventsTitle}</p>
      <ul className={eventList}>
        {events.map((event) => {
          const { month, day } = kstParts(event.eventAt);
          return (
            <li key={`${event.kind}-${event.eventAt}`} className={eventRow}>
              <span className={dateChip} aria-hidden>
                <span className={dateMonth}>{M.month(month)}</span>
                <span className={dateDay}>{day}</span>
              </span>
              <span className={eventMain}>
                <span className={marketTitle}>{EVENT_KIND_LABELS[event.kind]}</span>
                <span className={marketKind}>{M.monthDay(month, day)}</span>
              </span>
              <span className={`${ddayText} ${dday[event.daysUntil <= SOON_DAYS ? "soon" : "later"]}`}>{M.daysUntil(event.daysUntil)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
