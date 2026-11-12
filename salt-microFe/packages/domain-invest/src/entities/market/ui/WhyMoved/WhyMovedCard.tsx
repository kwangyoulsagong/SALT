import { kstClock } from "@repo/core/marketKr";
import type { MoveFact, MoveFactKind, MoveSplit, WhyMoved, WhyMovedResult } from "@repo/core/whyMoved";
import { Badge } from "@repo/ui/badge";
import { StatusLine } from "@repo/ui/statusLine";
import { formatKrwCompact, formatPrice } from "@repo/web-shared/lib";

import { WHY_MOVED_MESSAGES as M } from "../../model/whyMovedMessages";
import { NewsTagChips } from "../News/NewsTagChips";

import * as s from "./WhyMovedCard.css";
import { MINUS, moveTone, signedText } from "./whyMovedFormat";

/** 상세가 카드를 가리키는 앵커 — 시장 표 행의 "왜?" 링크가 여기로 온다 */
export const WHY_MOVED_ANCHOR_ID = "why-moved";

const toneOf = moveTone;
const signed = signedText;

interface WhyMovedCardProps {
  /** 응답 — 없으면(불러오는 중 · 실패 · 비소유자) 자리도 그리지 않는다. 쓰는 자리가 훅으로 받아 넘긴다 */
  result: WhyMovedResult | undefined;
  /** 겉 카드(패딩 · 그림자) — 국내 상세 `krSideCard` · 코인 상세 `card` */
  className?: string;
  /** 코인 주의 종류 이름(`PRICE_FLUCTUATIONS` → "가격 급등락") — 이름표 주인은 coach 엔티티라 위젯이 넘긴다 */
  cautionLabel?: (code: string) => string | undefined;
}

/**
 * 오늘 왜 움직였나(F016 단계 C · `FE-REQ-063` FR-1 ①②) — **표시 전용**(상태 0 · 훅 0). 값 · 보일지(`show`)는 서버가 정했다.
 *
 * - `show` 면 카드(제목 "왜 올랐을까 · 떨어졌을까"), 아니면 접힌 한 줄 "오늘 등락 나눠 보기"(UX 상태 표 — 같은 내용을 펼쳐 본다)
 * - ① 분해가 없으면(지수 결측) 아무것도 그리지 않는다 — ①이 없으면 "왜"를 말할 자리가 없다(`BFF-REQ-051` FR-1)
 * - 인과 단정 · 앞날 · 매매 지시 문구 0 — 몫은 뺄셈, 사실은 같은 날 있었던 일(`ADR-009`)
 * - 움직임 없음 — 막대 등장 애니메이션을 두지 않아 줄인 모션 분기가 없다
 */
export const WhyMovedCard = ({ result, className, cautionLabel }: WhyMovedCardProps) => {
  if (!result || result.status !== "ok" || !result.split) return null;
  const data = result as WhyMoved & { split: MoveSplit };
  const tone = toneOf(data.split.total);

  if (!data.show) {
    return (
      <details id={WHY_MOVED_ANCHOR_ID} className={[className, s.collapsed].filter(Boolean).join(" ")}>
        <summary className={s.collapsedSummary}>{M.collapsed}</summary>
        <div className={s.collapsedBody}>
          <WhyMovedBody data={data} cautionLabel={cautionLabel} />
        </div>
      </details>
    );
  }
  return (
    <section id={WHY_MOVED_ANCHOR_ID} className={className} aria-labelledby="why-moved-heading">
      <h2 id="why-moved-heading" className={s.heading}>
        {M.title[tone]}
      </h2>
      <WhyMovedBody data={data} cautionLabel={cautionLabel} />
    </section>
  );
};

const WhyMovedBody = ({ data, cautionLabel }: { data: WhyMoved & { split: MoveSplit }; cautionLabel?: (code: string) => string | undefined }) => {
  const { split } = data;
  const rows: Array<{ key: string; label: string; value: number }> = [
    { key: "market", label: M.parts.market[split.marketIndex] ?? M.parts.marketFallback, value: split.market },
    ...(split.sector === null ? [] : [{ key: "sector", label: M.parts.sector(split.sectorName), value: split.sector }]),
    ...(split.method === "benchmark" ? [] : [{ key: "idio", label: M.parts.idio, value: split.idio }]),
  ];
  // 막대 길이 = 이 표에서 가장 큰 |몫| 대비(반 칸이 최대) — 서버 값의 크기 비교만, 새 숫자를 만들지 않는다
  const scale = Math.max(...rows.map((r) => Math.abs(r.value)), 0.01);
  const unavailable = [...new Set(data.unavailable.map((k) => M.kind[k]))];

  return (
    <div className={s.body}>
      <p className={s.todayLine}>
        <span className={s.value[toneOf(split.total)]}>{M.today(signed(split.total, "%"))}</span>
        {data.usualRate !== null && <span>{M.usual(`${data.usualRate.toFixed(2)}%`)}</span>}
      </p>
      <table className={s.table} aria-label={M.splitTableLabel}>
        <thead className={s.srOnly}>
          <tr>
            <th scope="col">{M.partHeader}</th>
            <td />
            <th scope="col">{M.valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const t = toneOf(r.value);
            return (
              <tr key={r.key}>
                <th scope="row" className={s.labelCell}>
                  {r.label}
                </th>
                <td className={s.barCell} aria-hidden="true">
                  <div className={s.track}>
                    <span className={s.zeroLine} />
                    <span className={s.bar[t]} style={{ width: `${(Math.abs(r.value) / scale) * 50}%` }} />
                  </div>
                </td>
                <td className={`${s.valueCell} ${s.value[t]}`}>{signed(r.value, "%p")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {split.method !== "regression" && <p className={s.caption}>{M.method[split.method]}</p>}
      <p className={s.caption}>{M.caption}</p>

      <MoveSummaryLine data={data} />

      <h3 className={s.subheading}>{M.factsHeading}</h3>
      {data.facts.length > 0 ? (
        <ul className={s.factList}>
          {data.facts.map((f) => (
            <li key={f.id} id={factAnchor(f.id)} className={`${s.fact} ${s.factTarget}`}>
              <span className={s.factMeta}>
                {isState(f.kind) ? null : <time dateTime={f.at}>{kstClock(f.at)}</time>}
                <Badge size="sm" tone={f.kind === "disclosure" ? "brand" : "neutral"}>
                  {M.kind[f.kind]}
                </Badge>
                <span>{M.source[f.source] ?? f.source}</span>
              </span>
              <p className={s.factText}>{factText(f, cautionLabel)}</p>
              {f.tag && <NewsTagChips tag={f.tag} />}
            </li>
          ))}
        </ul>
      ) : (
        unavailable.length === 0 && <StatusLine kind="empty">{M.factsEmpty}</StatusLine>
      )}
      {unavailable.map((label) => (
        <StatusLine key={label} kind="error">
          {M.unavailable(label)}
        </StatusLine>
      ))}
    </div>
  );
};

/** 사실 줄 앵커 — 인용 칩이 여기로 온다. id 의 `:` 등은 그대로 두면 CSS `:target` 이 안 맞을 수 있어 안전한 글자로 */
const factAnchor = (id: string) => `why-moved-fact-${id.replace(/[^A-Za-z0-9_-]/g, "_")}`;

/**
 * ③ 한 줄(F016 단계 D · `FE-REQ-063` FR-1 ③) — 서버가 고른 문장을 그대로. `[k]` → 번호 칩(누르면 아래 그 사실 줄).
 * `ai` 면 AI 생성 표시(설명 3종 게이트 — 없으면 그리지 않는다), `server`(조용한 날)는 표시 없이 문장만. `pending` 은 "정리하는 중" 한 줄.
 * 그 밖의 게이트(검사 막음 · 꺼짐 · 못 읽음)는 아무것도 그리지 않는다 — ①② 만(UX 상태 표 "빈칸 · 안내 없음")
 */
const MoveSummaryLine = ({ data }: { data: WhyMoved }) => {
  const summary = data.summary;
  if (data.gate === "pending") return <StatusLine kind="progress">{M.summary.pending}</StatusLine>;
  if (!summary) return null;
  const byId = new Map(data.facts.map((f) => [f.id, f]));
  if (summary.label === "ai" && (summary.citations.length === 0 || !summary.citations.every((id) => byId.has(id)))) return null;
  const parts = summary.text.split(/(\[\d{1,2}\])/g).filter(Boolean);
  return (
    <div className={s.summaryBlock}>
      <h3 className={s.srOnly}>{M.summary.headingSr}</h3>
      <p className={s.summaryText}>
        {parts.map((part, i) => {
          const m = /^\[(\d{1,2})\]$/.exec(part);
          const fact = m ? byId.get(summary.citations[Number(m[1]) - 1] ?? "") : undefined;
          if (!m) return <span key={i}>{part}</span>;
          if (!fact) return null;
          return (
            <a key={i} href={`#${factAnchor(fact.id)}`} className={s.citeChip} aria-label={M.summary.citationLabel(Number(m[1]), factText(fact))}>
              {m[1]}
            </a>
          );
        })}
      </p>
      {summary.label === "ai" && <p className={s.aiLabel}>{M.summary.aiLabel}</p>}
    </div>
  );
};

/** 지금 상태(경보 · 관리 · 거래소 주의)는 시각 있는 사건이 아니다 — 시각을 쓰지 않는다(서버가 그날 시작 · 스냅샷 시각을 둔다) */
const isState = (kind: MoveFactKind) => kind === "warning" || kind === "crypto_warning";

/** 사건 코드 → 사실 문장. 제목(시황 · 공시 · 기사)은 원문 그대로 */
const factText = (f: MoveFact, cautionLabel?: (code: string) => string | undefined): string => {
  switch (f.kind) {
    case "news":
    case "disclosure":
    case "crypto_news":
      return f.title;
    case "vi": {
      const [, kind = "", count = "1"] = f.title.split(":");
      const text = M.event.vi(kind, Number(count) || 1);
      return f.value === null ? text : `${text} · ${M.event.viPrice(formatPrice(f.value))}`;
    }
    case "market_action": {
      const [kind, stage = "1", direction] = f.title.split(":");
      if (kind === "circuit_breaker") return M.event.circuitBreaker(stage);
      if (kind === "sidecar") return M.event.sidecar(direction === "down");
      return M.event.unknown;
    }
    case "halt":
      return M.event.halt[f.title] ?? M.event.unknown;
    case "warning":
      return M.event.state[f.title] ?? M.event.unknown;
    case "flow":
      return f.value === null ? M.event.unknown : M.event.program(signedKrw(f.value));
    case "crypto_warning": {
      if (f.title === "warning") return M.event.cryptoWarning;
      const code = f.title.startsWith("caution:") ? f.title.slice("caution:".length) : f.title;
      return M.event.cryptoCaution(cautionLabel?.(code) ?? code);
    }
  }
};

const signedKrw = (v: number) => `${v > 0 ? "+" : v < 0 ? MINUS : ""}${formatKrwCompact(Math.abs(v))}`;
