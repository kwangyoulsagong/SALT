"use client";

// 클라이언트 잎: 세션이 있는 사람에게만 부른다. 글 본문(ISR)은 사용자 데이터 0 그대로 — 이 칸만 브라우저에서 그린다
import { useId } from "react";

import { Skeleton } from "@repo/ui/skeleton";

import { hasApiStatus } from "@repo/web-shared/api";
import { formatPrice } from "@repo/web-shared/lib";

import type { MyFigure } from "@/entities/tip";

import { useMyNumbers } from "../api";
import { READ_MY_NUMBERS_MESSAGES as M } from "../model";
import * as s from "./myNumbers.css";

const percent = new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 1 });

/** 표시 포맷만 — 금액은 원 단위 정수, 비율은 서버 문자열 그대로 %로(계산 0) */
const valueOf = (f: MyFigure): string => {
  if (f.amount !== null) return `${formatPrice(f.amount)}원`;
  if (f.ratio !== null) return percent.format(Number(f.ratio));
  return "";
};

/**
 * 내 숫자로 다시 읽기(`FE-REQ-058` FR-3 · FEATURE-014 FR-6). 저축 목표 · 가계부 급여로 서버가 계산한 숫자와 요건(맞아요 · 아니에요 · 모름).
 * 로그아웃이면 한 줄 안내(공개 글을 로그인으로 보내지 않는다), 실패면 "글의 예시 그대로". 받을 수 있다는 말 · 권유 0.
 */
export const MyNumbersPanel = ({ slug }: { slug: string }) => {
  const titleId = useId();
  const view = useMyNumbers(slug);

  const body = (() => {
    // 세션이 만료돼 갱신까지 실패한 401 도 로그아웃이다(맞힌 카드와 같은 규칙)
    if (view.isSignedOut || (view.isError && hasApiStatus(view.error, 401))) return <p className={s.muted}>{M.signedOut}</p>;
    if (view.isError) return <p className={s.muted}>{M.failed}</p>;
    if (!view.data) return <Skeleton height={120} />;
    const { reading, degradedSources } = view.data;
    // 서버가 계산하지 못했다(content 늦음 · 5xx) — 글의 예시 그대로
    if (!reading) return <p className={s.muted}>{M.failed}</p>;
    return (
      <>
        {reading.figures.length > 0 ? (
          <dl className={s.figures} aria-label={M.figuresLabel}>
            {reading.figures.map((f) => (
              <div key={f.key} className={s.figure}>
                <dt className={s.figureLabel}>{f.label}</dt>
                <dd className={s.figureValue}>{valueOf(f)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {reading.emptyReason ? <p className={s.line}>{reading.emptyReason}</p> : null}
        {reading.checks.length > 0 ? (
          <div className={s.body}>
            <h3 className={s.checksTitle}>{M.checksTitle}</h3>
            <ul className={s.checks}>
              {reading.checks.map((c) => (
                <li key={c.key} className={s.check}>
                  <span className={s.checkHead}>
                    <span className={s.tag[c.state]}>{M.state[c.state]}</span>
                    <span className={s.line}>{c.label}</span>
                  </span>
                  <span className={s.muted}>{c.note}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {degradedSources.length > 0 ? <p className={s.muted}>{M.partial}</p> : null}
        <p className={s.footnote}>{M.footnote}</p>
      </>
    );
  })();

  return (
    <section className={s.panel} aria-labelledby={titleId}>
      <h2 id={titleId} className={s.title}>
        {M.title}
      </h2>
      {/* 숫자가 있을 때만 — 목표가 없어 예시 그대로인데 "다시 계산했어요"라고 하면 아래 이유 줄과 어긋난다(S2d 확인) */}
      {view.data?.reading && view.data.reading.figures.length > 0 ? <p className={s.muted}>{M.description}</p> : null}
      <div className={s.body} role="status" aria-live="polite">
        {body}
      </div>
    </section>
  );
};
