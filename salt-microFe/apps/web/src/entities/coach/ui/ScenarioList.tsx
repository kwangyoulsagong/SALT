import type { ScenariosView } from "@repo/core/coach";

import { formatPrice } from "@/shared/lib";

import { formatSignedKrw, formatSignedRate } from "../lib";
import { RISK_MESSAGES } from "../model";
import { mirrorHead, mirrorItem, mirrorLabel, mirrorList, mirrorSub, mirrorText, mirrorTextMuted } from "./Mirror.css";

const S = RISK_MESSAGES.scenario;

/** 비율(−0.3) → `30%`. 하락 폭 이름에만 쓴다 — 계산하지 않는다 */
const shockName = (shock: number) => `${Math.round(Math.abs(shock) * 100)}%`;

/** `2022-11-05` → `2022.11.05`. 과거 구간 날짜는 서버 상수라 타임존이 없다 */
const episodeDate = (isoDate: string) => isoDate.replaceAll("-", ".");

/**
 * 시나리오 (F009 FR-25 · `FE-REQ-039` FR-23). **표시만 한다** — 손실 원화는 서버가 셌다.
 * 확률을 붙이지 않는다(W03): "이만큼 내리면 얼마"와 과거 구간을 지금 보유에 얹은 값뿐이다.
 */
export const ScenarioList = ({ scenarios }: { scenarios: ScenariosView }) => {
  if (scenarios.status === "no_holdings") return <p className={mirrorTextMuted}>{S.noHoldings}</p>;

  return (
    <ul className={mirrorList}>
      {scenarios.shocks.map((shock) => (
        <li key={shock.shock} className={mirrorItem}>
          <div className={mirrorHead}>
            <span className={mirrorLabel}>{S.shock(shockName(shock.shock))}</span>
          </div>
          <p className={mirrorText}>
            {S.shockLine(formatPrice(Math.abs(shock.lossKrw)), formatPrice(shock.valueAfterKrw))}
          </p>
          {shock.bySymbol.length > 1 && (
            <p className={mirrorSub}>
              {shock.bySymbol.map((row) => S.bySymbol(row.symbol, formatPrice(Math.abs(row.lossKrw)))).join(" · ")}
            </p>
          )}
        </li>
      ))}
      {scenarios.episodes.map((episode) => (
        <li key={episode.id} className={mirrorItem}>
          <div className={mirrorHead}>
            <span className={mirrorLabel}>{S.episodes[episode.id] ?? episode.id}</span>
          </div>
          {episode.status === "ok" && episode.lossKrw !== null && episode.returnRate !== null ? (
            <p className={mirrorText}>
              {S.episodeLine(formatSignedKrw(episode.lossKrw), formatSignedRate(episode.returnRate))}
            </p>
          ) : (
            <p className={mirrorTextMuted}>{S.episodeMissing(episode.missingSymbols.join(", "))}</p>
          )}
          <p className={mirrorSub}>{S.episodePeriod(episodeDate(episode.from), episodeDate(episode.to))}</p>
        </li>
      ))}
    </ul>
  );
};
