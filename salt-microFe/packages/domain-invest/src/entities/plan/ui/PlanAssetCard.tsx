import { StatusLine } from "@repo/ui/statusLine";

import {
  bandLabel,
  dateText,
  indicatorValueText,
  monthText,
  multiplierText,
  signedPctOfFraction,
  won,
} from "../lib/format";
import { PLAN_MESSAGES as M } from "../model/messages";
import type { WeeklyPlanItemVM } from "../model/types";
import { BandTable } from "./BandTable";
import { amountLine, blockedBox, box, boxTitle, evidenceGrid, list, muted, stack } from "./plan.css";

/**
 * 자산 하나 — 금액 분해 · 이유 · (게이트가 열리면) 근거 · 밴드 표 · 과거 성적 · 빗나간 때(`FE-REQ-022` B · C · D절).
 *
 * - 게이트는 BFF 값 하나(`renderable`)로만 가른다 — 닫히면 밴드 카드 노드가 **트리에 없다**(CSS 숨김 아님, `FE-REQ-023` FR-12). 금액 줄은 늘 있다(FR-13)
 * - 배수 0 이면 "신규 적립 계획 없음" — 파는 말 0(FR-64)
 * - 성적과 빗나간 때는 같은 칸 크기로 나란히(FR-34 — 지표를 믿게 만들지 않는다)
 */
export const PlanAssetCard = ({ item, headingId }: { item: WeeklyPlanItemVM; headingId: string }) => (
  <div className={stack}>
    <h3 id={headingId} className={boxTitle}>
      {M.asset[item.asset]}
    </h3>
    <AmountLine item={item} />
    <p className={muted}>{M.reason[item.reasonCode]}</p>
    {item.status === "executed" && item.executedKrw !== null ? (
      <StatusLine kind="success">{M.status.executed(won(item.executedKrw))}</StatusLine>
    ) : null}
    {item.status === "skipped" ? <p className={muted}>{M.status.skipped}</p> : null}
    {item.renderable ? <BandCard item={item} /> : <BlockedNotice reason={item.blockedReason} />}
  </div>
);

const AmountLine = ({ item }: { item: WeeklyPlanItemVM }) => {
  if (item.amountKrw === null || item.weeklyBaseKrw === null) return null;
  if (item.multiplier === 0) return <p className={amountLine}>{M.noNewThisWeek}</p>;
  return (
    <p className={amountLine}>
      {M.breakdown(won(item.weeklyBaseKrw), multiplierText(item.multiplier), won(item.amountKrw))}
    </p>
  );
};

const BlockedNotice = ({ reason }: { reason: string | null }) => (
  <div className={blockedBox} role="note">
    <strong>{M.blocked.title}</strong>
    {reason ? <span>{M.blocked.reason[reason] ?? reason}</span> : null}
    <span>{M.blocked.rule}</span>
    <span>{M.blocked.amountKept}</span>
  </div>
);

const BandCard = ({ item }: { item: WeeklyPlanItemVM }) => {
  const basis = item.basis;
  const track = item.trackRecord;
  const failures = item.failureCases;
  if (!basis || !track || !failures) return <BlockedNotice reason="gate_missing" />;
  return (
    <>
      <div className={evidenceGrid}>
        <section className={box} aria-label={`${M.asset[item.asset]} ${M.basisHeading}`}>
          <h4 className={boxTitle}>{M.basisHeading}</h4>
          <ul className={list}>
            {basis.value !== null && item.indicator ? (
              <li>{M.basisValue(M.indicator[item.indicator], indicatorValueText(item.indicator, basis.value))}</li>
            ) : null}
            {basis.percentile !== null ? <li>{M.percentileValue((basis.percentile * 100).toFixed(0))}</li> : null}
            {basis.estimated && basis.basisObserved ? <li>{M.estimated(monthText(basis.basisObserved))}</li> : null}
            {!basis.estimated && basis.basisObserved ? <li>{M.observedAt(dateText(basis.basisObserved))}</li> : null}
            {basis.secondaryValue !== null ? <li>{M.dividend(basis.secondaryValue.toFixed(2))}</li> : null}
            {basis.bandKey && basis.bandMultiplier !== null ? (
              <li>{M.currentBand(bandLabel(basis.bandKey), multiplierText(basis.bandMultiplier))}</li>
            ) : null}
            {!track.gatePassed && basis.bandMultiplier !== null && basis.bandMultiplier !== item.multiplier ? <li>{M.bandOffNote}</li> : null}
            {basis.staleDays > 0 ? <li>{M.stale(basis.staleDays)}</li> : null}
          </ul>
        </section>
        <section className={box} aria-label={`${M.asset[item.asset]} ${M.track.heading}`}>
          <h4 className={boxTitle}>{M.track.heading}</h4>
          <p className={muted}>{M.track.what}</p>
          <ul className={list}>
            {track.excess !== null ? <li>{M.track.excess(signedPctOfFraction(track.excess))}</li> : null}
            {track.ciLow !== null && track.ciHigh !== null ? (
              <li>{M.track.interval(signedPctOfFraction(track.ciLow), signedPctOfFraction(track.ciHigh))}</li>
            ) : null}
            {track.yearsTotal > 0 ? <li>{M.track.years(track.yearsPositive, track.yearsTotal)}</li> : null}
            {track.windowFrom && track.windowTo ? (
              <li>{M.track.window(monthText(track.windowFrom), monthText(track.windowTo), track.closedWeeks)}</li>
            ) : null}
            <li>
              {track.gatePassed
                ? M.track.gatePassed
                : (track.gateBlockedReason && M.track.gateBlocked[track.gateBlockedReason]) || M.track.gateBlockedOther}
            </li>
          </ul>
          <p className={muted}>{M.track.rule(track.preregKey)}</p>
        </section>
      </div>
      <div className={evidenceGrid}>
        <section className={box} aria-label={`${M.asset[item.asset]} ${M.failures.heading}`}>
          <h4 className={boxTitle}>{M.failures.heading}</h4>
          {failures.items.length === 0 ? (
            <p className={muted}>{M.failures.empty}</p>
          ) : (
            <>
              <p className={muted}>{M.failures.what(failures.items.length, failures.count)}</p>
              <ul className={list}>
                {failures.items.map((c) => (
                  <li key={`${c.decidedAt}-${c.kind}`}>
                    {dateText(c.decidedAt)} · {M.failures.kind[c.kind] ?? c.kind}
                    <br />
                    <span className={muted}>
                      {M.failures.row(bandLabel(c.band), multiplierText(c.multiplier), signedPctOfFraction(c.return52w))}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <div className={box}>
          <BandTable asset={item.asset} indicator={item.indicator} rules={basis.bands} currentKey={basis.bandKey} />
        </div>
      </div>
    </>
  );
};
