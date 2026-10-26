"use client";

import type { KrInvestorNet } from "@repo/core/marketKr";
import { kstClock, kstMonthDay } from "@repo/core/marketKr";
import { StatusLine } from "@repo/ui/statusLine";

import { KR_STOCK_MESSAGES, useKrInvestors } from "@/entities/market";
import { formatKrwCompact } from "@/shared/lib";

import { caption, heading, net, scroller, table, td, th, totalRow } from "./KrInvestorFlows.css";
import { krSideCard } from "./SymbolHeader.css";

const M = KR_STOCK_MESSAGES.investors;
const MINUS = "−";
const GROUPS = ["individual", "foreign", "institution"] as const;

/** 순매수 금액 — 부호 + 단위 줄임(표기만, 값은 서버 것). 수량은 title 로(마우스 · 스크린리더가 읽는다) */
const NetCell = ({ value }: { value: KrInvestorNet }) => {
  const tone = value.value > 0 ? "up" : value.value < 0 ? "down" : "flat";
  const sign = tone === "up" ? "+" : tone === "down" ? MINUS : "";
  // 수량은 BigInt 문자열 — 부호만 떼고 자릿수만 넣는다(숫자로 바꾸지 않는다)
  const absShares = BigInt(value.quantity.replace(/^-/, "")).toLocaleString("ko-KR");
  return (
    <td className={td} title={M.quantity(`${sign}${absShares}`)}>
      <span className={net[tone]}>{`${sign}${formatKrwCompact(Math.abs(value.value))}`}</span>
    </td>
  );
};

/** "10/23" — 거래일 문자열(KST)을 그대로 쓴다. 시각 계산을 하지 않는다 */
const monthDay = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/**
 * 국내 주식 투자자별 순매수(F011 슬라이스 6 · `FE-REQ-041`) — 최근 거래일 표 + 기간 합계(서버가 낸다).
 *
 * - 사실만 보인다: 매수 − 매도. "수급이 좋다" 같은 해석 · 방향 문구는 두지 않는다(마스터 인덱스 §6-4)
 * - 404(소유자 아님) · 로그인 안 함 · 불러오는 중엔 자리도 없다 — 시세 상세가 이미 그 상태를 말한다
 * - 아직 안 모였으면(개장일 저녁 수집 전) 빈 상태 문구 — 0 으로 그리지 않는다
 */
export const KrInvestorFlows = ({ code }: { code: string }) => {
  const { data, isError } = useKrInvestors(code);
  if (!data && !isError) return null;
  if (isError || data?.status === "disabled") return null;

  return (
    <section className={krSideCard} aria-labelledby="kr-investor-flows-heading">
      <h2 id="kr-investor-flows-heading" className={heading}>
        {M.heading}
      </h2>
      {data?.status !== "ok" ? (
        <StatusLine kind="error">{M.unavailable}</StatusLine>
      ) : data.rows.length === 0 || !data.totals ? (
        <StatusLine kind="empty">{M.empty}</StatusLine>
      ) : (
        <>
          <p className={caption}>{M.caption(data.days)}</p>
          <div className={scroller}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th} scope="col">
                    {M.columns.date}
                  </th>
                  {GROUPS.map((group) => (
                    <th key={group} className={th} scope="col">
                      {M.columns[group]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className={totalRow}>
                  <th className={td} scope="row">
                    {M.totalRow(data.days)}
                  </th>
                  {GROUPS.map((group) => (
                    <NetCell key={group} value={data.totals![group]} />
                  ))}
                </tr>
                {data.rows.map((row) => (
                  <tr key={row.date}>
                    <th className={td} scope="row">
                      {monthDay(row.date)}
                    </th>
                    {GROUPS.map((group) => (
                      <NetCell key={group} value={row[group]} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.collectedAt && (
            <p className={caption}>{M.collectedAt(`${kstMonthDay(data.collectedAt)} ${kstClock(data.collectedAt)}`)}</p>
          )}
        </>
      )}
    </section>
  );
};
