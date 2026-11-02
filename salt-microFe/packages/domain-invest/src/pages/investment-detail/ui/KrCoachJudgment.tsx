"use client";

import { Heading } from "@repo/ui/heading";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import { COACH_MESSAGES, CoachBlockSkeleton, JudgmentDetail, selectModeView, useSymbolCoach } from "@/entities/coach";
import { KR_STOCK_MESSAGES as M } from "@/entities/market";

import { krCoachCard } from "./SymbolHeader.css";

/**
 * 국내 주식 상세의 코치 판단(F011 슬라이스 4 · 시나리오 6). **장기 한 모드만** 그린다 — 단타는 서버가 열지 않았다(`mode_not_open`).
 *
 * 처음엔 거의 늘 막혀 있다 — 일봉 이력이 모자라면 `insufficient_history`(일봉 N / 120), 차면 국내 주식 표본 20 전까지
 * `insufficient_sample`. 막힌 자리도 고장이 아니라 정상 상태로 그린다(`BlockedNotice`). 판단 · 문턱은 전부 서버 값이다.
 *
 * 열리면 코인 상세와 같은 카드(`JudgmentDetail`) — 근거 · 과거 성적 · 틀렸던 때까지. 라이브 표본이 모자랄 동안의 성적은
 * 과거 시세로 되돌려 채점한 모의 성적이고 카드가 그 라벨을 붙인다(F011 슬라이스 7b)
 */
export const KrCoachJudgment = ({ code }: { code: string }) => {
  const { data, isPending, isError } = useSymbolCoach(code);

  const body = () => {
    if (isError) return <StatusLine kind="error">{COACH_MESSAGES.judgmentUnavailable}</StatusLine>;
    if (isPending || !data) return <CoachBlockSkeleton block="judgment" />;
    return <JudgmentDetail view={selectModeView(data, "long_term")} mode="long_term" />;
  };

  return (
    <section className={krCoachCard} aria-label={COACH_MESSAGES.judgmentHeading}>
      <Heading level={5} color="tertiary">
        {COACH_MESSAGES.judgmentHeading}
      </Heading>
      {body()}
      <Text color="tertiary">{M.detail.coachNote}</Text>
    </section>
  );
};
