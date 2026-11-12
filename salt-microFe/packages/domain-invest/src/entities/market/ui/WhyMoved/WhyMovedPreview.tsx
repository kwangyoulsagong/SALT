"use client";

import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { useWhyMoved } from "../../api";
import { WHY_MOVED_MESSAGES as M } from "../../model/whyMovedMessages";

import { WHY_MOVED_ANCHOR_ID } from "./WhyMovedCard";
import { moveTone, signedText } from "./whyMovedFormat";
import * as s from "./WhyMovedPreview.css";
import { value as valueStyle } from "./WhyMovedCard.css";

/**
 * 우측 프리뷰 "왜 떨어졌을까?"(F016 단계 C · `FE-REQ-063` FR-1 — 사용자 2026-11-09 "프리뷰에도 나와야지") — **카드가 서는 날만**.
 * 한 줄은 가장 큰 몫 둘(숫자 사실) · 아래 ③ 한 줄(F016 단계 D — 없으면 같은 날 사실 하나) · 누르면 상세 카드.
 * ③ 은 번호 표시를 뺀다(여기엔 사실 목록이 없다 — 상세 카드가 칩으로 잇는다). AI 문장이면 AI 생성 표시를 같이(`ADR-009` §3).
 * 불러오는 중 · 실패 · 비소유자 · 카드 조건 아님 → 자리 없음(높이 0 — 프리뷰가 흔들리지 않게 블록 하나만 생긴다)
 */
export const WhyMovedPreview = ({ symbol, assetType, name }: { symbol: string; assetType: string; name: string }) => {
  const isKr = assetType === "kr_stock";
  const { data } = useWhyMoved(isKr ? { kind: "kr", code: symbol } : { kind: "crypto", symbol });
  if (!data || data.status !== "ok" || !data.show || !data.split) return null;
  const { split } = data;
  const parts = [
    { label: M.parts.market[split.marketIndex] ?? M.parts.marketFallback, v: split.market },
    ...(split.sector === null ? [] : [{ label: M.parts.sector(split.sectorName), v: split.sector }]),
    ...(split.method === "benchmark" ? [] : [{ label: M.parts.idio, v: split.idio }]),
  ]
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 2);
  const tone = moveTone(split.total);
  const firstFact = data.facts.find((f) => f.kind === "news" || f.kind === "disclosure" || f.kind === "crypto_news");
  const ids = new Set(data.facts.map((f) => f.id));
  const summary =
    data.summary && (data.summary.label === "server" || (data.summary.citations.length > 0 && data.summary.citations.every((id) => ids.has(id))))
      ? data.summary
      : null;

  return (
    <section className={s.box} aria-labelledby={`why-moved-preview-${symbol}`}>
      <h3 id={`why-moved-preview-${symbol}`} className={s.title}>
        {M.preview.title[tone]}
      </h3>
      <p className={s.line}>
        {parts.map((p, i) => (
          <span key={p.label}>
            {i > 0 && M.preview.joiner}
            {p.label} <span className={valueStyle[moveTone(p.v)]}>{signedText(p.v, "%p")}</span>
          </span>
        ))}
      </p>
      {summary ? (
        <>
          <p className={s.summary}>{summary.text.replace(/\s*\[\d{1,2}\]/g, "")}</p>
          {summary.label === "ai" && <p className={s.aiLabel}>{M.summary.aiLabel}</p>}
        </>
      ) : (
        firstFact && <p className={s.fact}>{firstFact.title}</p>
      )}
      <Link
        href={`${ROUTES.investmentDetail(symbol)}#${WHY_MOVED_ANCHOR_ID}`}
        prefetch={false}
        className={s.more}
        aria-label={M.preview.moreLabel(name)}
      >
        {M.preview.more}
        <NavChevron />
      </Link>
    </section>
  );
};
