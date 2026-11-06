import { type KrMarketAction, kstClock } from "@repo/core/marketKr";
import { StatusLine } from "@repo/ui/statusLine";

import { KR_STOCK_MESSAGES as M } from "../../model/krStockMessages";
import { marketActionList, sessionLine } from "./krStock.css";

interface KrMarketActionBannerProps {
  /** 서버가 준 오늘 조치 — 걸려 있는지(`active`) · 재개 예정도 서버 값 */
  actions: KrMarketAction[];
}

const marketName = (action: KrMarketAction) => M.markets[action.market];

const activeText = (a: KrMarketAction) => {
  const since = kstClock(a.startedAt);
  if (a.kind === "sidecar")
    return M.marketAction.sidecarActive(marketName(a), M.marketAction.directions[a.direction], since);
  if (!a.resumesAt) return M.marketAction.dayEnded(marketName(a), since);
  return `${M.marketAction.haltActive(marketName(a), a.stage, since)} · ${M.marketAction.resumes(kstClock(a.resumesAt))}`;
};

const endedText = (a: KrMarketAction) => {
  const from = kstClock(a.startedAt);
  if (a.kind === "sidecar")
    return M.marketAction.sidecarEnded(marketName(a), M.marketAction.directions[a.direction], from);
  return a.endedAt
    ? M.marketAction.haltEnded(marketName(a), a.stage, from, kstClock(a.endedAt))
    : M.marketAction.haltEndedOpen(marketName(a), a.stage, from);
};

const Inferred = ({ action }: { action: KrMarketAction }) =>
  action.source === "inferred" ? (
    <span title={M.marketAction.inferredTitle}>{` · ${M.marketAction.inferred}`}</span>
  ) : null;

/**
 * 시장 조치 띠(F016 단계 A · `FE-REQ-063` FR-2) — 서킷브레이커 · 사이드카. 걸려 있으면 막힘 줄(그래픽 + 글자 · 읽어 주기),
 * 오늘 끝난 것은 장 상태 줄과 같은 회색 한 줄로 남긴다 — 2026-11-06 처럼 "왜 아까 시세가 멈췄지"에 답이 남게.
 * 무엇을 보일지 · 언제 재개되는지는 서버 값. 원인 · 앞날 문장 0
 */
export const KrMarketActionBanner = ({ actions }: KrMarketActionBannerProps) => {
  if (actions.length === 0) return null;
  return (
    <div className={marketActionList} role="group" aria-label={M.marketAction.regionLabel}>
      {actions.map((a) =>
        a.active ? (
          <StatusLine key={`${a.market}-${a.kind}-${a.stage}`} kind="blocked" live>
            {activeText(a)}
            <Inferred action={a} />
          </StatusLine>
        ) : (
          <p key={`${a.market}-${a.kind}-${a.stage}`} className={sessionLine}>
            {/* 한 덩어리 — 줄 스타일이 flex 라 따로 두면 "· 추정" 앞 간격이 벌어진다 */}
            <span>
              {endedText(a)}
              <Inferred action={a} />
            </span>
          </p>
        ),
      )}
    </div>
  );
};
